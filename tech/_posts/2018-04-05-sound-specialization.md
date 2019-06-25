---
layout: post
title:  "Sound and ergonomic specialization for Rust"
---

Specialization holds the dubious honor of being among the oldest post-1.0
features remaining in unstable limbo. That's for good reason, though: until
recently, we did not know how to make it sound.

There's a long history here, but I'll pick up from the immediately previous
episode: Niko's [blog post on "max-min" specialization][maxmin]. While that post
showed, for the first time, an "obviously sound" approach to specialization, it
came at a severe ergonomic cost for the ecosystem. This post proposes a twist on
Niko's idea that avoids its downsides.

[maxmin]: http://smallcultfollowing.com/babysteps/blog/2018/02/09/maximally-minimal-specialization-always-applicable-impls/

## Restating the problem

First, let's reintroduce our nemesis: lifetime dispatch. I
wrote [at length][dispatch] about this problem before, but the core issue is
that for specialization to be sound, we need type checking and code generation ("trans")
to agree on what it does. But there are two big things that happen between those
compiler phases:

- **Monomorphization**, which instantiates all generics with actual types.
- **Lifetime erasure**, which destroys all lifetime information.

[dispatch]: https://aturon.github.io/blog/2017/07/08/lifetime-dispatch/

Lifetime erasure means that we must prevent lifetime-dependent specializations
like the following:

```rust
trait Bad {
    fn bad(&self);
}

impl<T> Bad for T {
    default fn bad(&self) {
        println!("generic");
    }
}

// Specialization cannot work: trans doesn't know if T: 'static
impl<T: 'static> Bad for T {
    fn bad(&self) {
        println!("specialized");
    }
}

fn main() {
    "test".bad() // what do we see?
}
```

In a case like this, the type checker has *more* information than trans does,
and hence will use the more specialized impl. Trans, by contrast, has lost the
information that `"test"` is `'static`, and hence cannot use the specialized
impl. This kind of disagreement can easily cause soundness problems.

Unfortunately, it's not so easy to fix, partly because "lifetime dependence" can
happen in very subtle, indirect ways, and partly because *monomorphization*
causes information mismatches in the opposite direction, where trans knows more
than the type checker.

Bottom line, we've searched long and hard in this space and come up short --
until fairly recently.

## Niko's max-min proposal

In Niko's [latest blog post][maxmin], he proposes an ingenious strategy for
ensuring soundness: we simply bake in the needed requirements for any traits we
wish to specialize on.

In particular, we want a specialization to occur only when the relevant impl is
"always applicable" (i.e. regardless of how type and lifetime parameters are
instantiated). This always-applicable test, in particular, ensures that the
difference in knowledge produced by monomorphization and lifetime erasure cannot
matter.

The blog post is fairly long and contains several extensions, but basically
boils down to the following: an `impl` is **always applicable** if:

- it is fully generic with respect to lifetimes (no repetitions, use of `'static`, or constraints),
- it doesn’t repeat any generic type parameters, and
- the only trait bounds that appear are for "always applicable traits".

Specialization is only allowed when the more specialized impl is always applicable.

An "always applicable trait" is one that is marked with a special attribute,
`#[specialization_predicate]`, which means that all impls of the trait *must* be
always applicable. In other words, it forces the "always applicable" property to
apply recursively to all the traits involved in an impl.

Now, this works quite well when specializing a blanket impl with an impl for a concrete type:

```rust
impl<T> SomeTrait for T { /* default fns */ }
impl SomeTrait for SomeType { /* specialized fns */ }
```

That's because in this case, we aren't adding any extra trait bounds nor type parameters.

However, the proposal has a major downside, and one that it seems was not well
understood by the broader community: **specialization based on traits like
`TrustedLen` requires those traits to be specially-marked, and doing so is a
breaking change!**.

In particular, suppose we want to do the following:

```rust
impl<T: Iterator> SomeTrait for T { .. }
impl<T: Iterator + TrustedLen> SomeTrait for T { .. }
```

According to the definition above, this is only allowed if `TrustedLen` is marked
with `#[specialization_predicate]`. But nothing prevents there from being impls
like the following today:

```rust
impl TrustedLen for MyType<'static> { .. }
```

Adding the `#[specialization_predicate]` would make such impls illegal, breaking
downstream code. And more generally, both adding *or* removing the attribute is
a breaking change, forcing all trait authors to make a difficult up-front
decision, and meaning that *none* of the existing traits in the standard library
could be used as a bound in a specializing impl.

## A new idea

Last week at the Rust All Hands in Berlin, I talked to some members of the Libs
Team about the max-min proposal and it became clear that they'd missed the above
implications -- and they were left quite dejected. "So does specialization solve
*any* of the original use cases?"

Naturally, that got me thinking whether we could do better, and I think we can
-- basically by slightly repackaging Niko's insight.

**The key idea**: Rather than a per-trait attribute, we provide an explicit
*specialization modality* for trait bounds. That is, you write something like
`specialize(T: TrustedLen)` in a `where` clause. This specialization mode is more
selective about which impls it considers: it effectively drops any impls that
constrain lifetimes or repeat generic parameters. Trait bounds, however, are
fine; they are just interpreted within the `specialize` mode as well,
recursively. Thus, an impl is "always applicable" if:

- it is fully generic with respect to lifetimes (no repetitions, use of `'static`, or constraints),
- it doesn’t repeat any generic type parameters, and
- the only trait bounds that appear are (recursively) within the `specialize` mode.

This is easiest to see by example:

```rust
trait Foo {
    fn foo(&self);
}

impl<T> Foo for T {
    default fn foo(&self) {
        println!("generic");
    }
}

// The compiler refuses this specialization: it is not always applicable
impl<T: 'static> Foo for T {
    fn foo(&self) {
        println!("specialized");
    }
}

trait SomeTrait {}
impl SomeTrait for i32 {}
impl SomeTrait for &'static str {}

// The compiler refuses this specialization: it is not always applicable
impl<T: SomeTrait> Foo for T {
    fn foo(&self) {
        println!("specialized");
    }
}

// The compiler **accepts** this specialization, because `specialize(T: SomeTrait)`
// filters the applicable impls to only the "always applicable" ones.
impl<T> Foo for T
    where specialize(T: SomeTrait)
{
    fn foo(&self) {
        println!("specialized");
    }
}

fn main() {
    true.foo(); // prints "generic"
    0i32.foo(); // prints "specialized:"
    "hello".foo(); // prints "generic", because the `&'static str` impl for `SomeTrait` is ignored
}
```

Interestingly, this design is *almost* latent in the [original RFC]! The new
mechanism here, though, is an **explicit filtering of impls** via
`specialize`. This explicit filtering is helpful not just for soundness, but to
remind the programmer that specialization is *not* considering *all* impls, but
rather a filtered set.

Moreover, it should be possible both within the type checker and in trans to
detect cases where the "naive" (unfiltered) specialization algorithm would have
produced a different result, and produce a warning in such cases.

[original RFC]: https://github.com/rust-lang/rfcs/pull/1210

I believe that this approach is as "obviously" sound as Niko's proposal; it
could even be understood as a kind of sugar over his proposal. And given our
experiences in this area, I've long since believed that the only acceptable
solution would have to be "obviously" sound -- no clever tricks. The
`specialize` modality has a very natural interpretation in Chalk, where we are
already juggling [other modalities related to crate-local reasoning][negative].

[negative]: https://aturon.github.io/2017/04/24/negative-chalk/

Finally, it's worth saying that the particular mechanism here is orthogonal to
the many other design questions around specialization, including things like
"intersection impls", as well as the other extensions mentioned in Niko's
previous post.

While I'm doubtful that specialization will make it for the Rust 2018 release, I
think that with luck it could stabilize this year.
