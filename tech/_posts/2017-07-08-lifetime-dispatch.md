---
layout: post
title:  "Shipping specialization: a story of soundness"
---

Rust's [`impl` specialization][RFC] is a major language feature that appeared
after Rust 1.0, but has yet to be stabilized, despite strong demand.

Historically, there have been three big blockers to stabilization:

- The interplay between specialization rules and coherence, which I resovled in
  [an earlier blog post].

- The precise ways in which specialization employs negative reasoning, which
  will be resolved by incorporating ideas from [Chalk] into the compiler.

- The soundness of specialization's interactions with lifetimes. The [RFC] talks
  about this issue and proposes a way to address it, but it has never been
  implemented, and early attempts to implement it in [Chalk] have revealed
  serious problems.

I've been wrestling, together with nmatsakis, withoutboats and others, with
these soundness issues.

**Spoiler alert**: we have not fully solved them yet. But we see a viable way to
ship a sound, useful subset of specialization in the meantime. Feel free to jump
to "A modest proposal" if you just want to hear about that.

This blog post is an attempt to write up what we've learned so far, with the
hopes that it will clarify that thinking, and maybe open the door to *you*
cracking the nut!

[RFC]: https://github.com/rust-lang/rfcs/pull/1210
[an earlier blog post]: http://aturon.github.io/blog/2017/02/06/specialization-and-coherence/
[Chalk]: https://github.com/nikomatsakis/chalk/

## The problem

In stable Rust, it is **not possible** for lifetimes to influence runtime
behavior. This is partly an architectural issue, and partly a design issue:

- **Architecture**: the compiler erases lifetime information prior to
  monomorphization and code generation, meaning that the generated code simply
  has no way to depend on lifetimes. That could be changed, but we'd have to
  work hard to avoid code blowup by generating separate copies of code
  for each lifetime it was used within, assuming that the behavior didn't
  change.

- **Design**: lifetime inference generally chooses the *smallest* lifetime that
  fits the constraints at any given moment. That means that you can have a piece
  of data that is valid for the `'static` lifetime, yet is viewed as having a
  shorter lifetime. Having runtime behavior depend on these choices seems bound
  to result in confusion and bugs.

Unfortunately, specialization makes the story more difficult:

```rust
trait Bad1 {
    fn bad1(&self);
}

impl<T> Bad1 for T {
    default fn bad1(&self) {
        println!("generic");
    }
}

// Specialization cannot work: trans doesn't know if T: 'static
impl<T: 'static> Bad1 for T {
    fn bad1(&self) {
        println!("specialized");
    }
}

fn main() {
    "test".bad1()
}
```

What does this program print? Since the string literal `"test"` has type
`&'static str`, you might expect the second, specialized `impl` to be used (and
hence to get `specialized` as the output). But, as explained above, from the
perspective of trans this type will look like `&'erased str`, making it
impossible to know whether the more specialized `impl` can safely be used.

Here's another, less obvious example:

```rust
trait Bad2<U> {}

impl<T, U> Bad2<U> for T {}

// Specialization cannot work: trans doesn't know if two refs have equal lifetimes
impl<'a, T, U> Bad2<&'a U> for &'a T {}
```

Here, the second `impl` is requiring that two lifetimes are the same, and once
more for trans we can't tell whether the `impl` safely applies.

On the other hand, simply *naming* a lifetime that must exist, without
*constraining* it, is fine:

```rust
trait Good {}

impl<T> Good for T {}

// Fine: specializes based on being *any* reference, regardless of lifetime
impl<'a, T> Good for &'a T {}
```

In addition, it's in principle okay for lifetime constraints to show up as long
as they don't influence specialization:

```rust
trait MustBeStatic {}

impl<T: 'static> MustBeStatic for T {}

// Potentially fine: *all* impls impose the 'static requirement; the dispatch is
// happening purely based on `Clone`
impl<T: 'static + Clone> MustBeStatic for T {}
```

### Why does this lead to unsoundness?

So far, it might seem like we can just be conservative in trans, which could
lead to confusing behavior but is otherwise alright.

Sadly, it's not, at least given the original design of specialization:

```rust
trait Bomb {
    type Assoc: Default;
}

impl<T> Bomb for T {
    default type Assoc = ();
}

impl Bomb for &'static str {
    type Assoc = String;
}

fn build<T: Bomb>(t: T) -> T::Assoc {
    T::Assoc::default()
}

fn main() {
    let s: String = build("Uh oh");
    drop(s) // typeck and trans disagree about the type of `s`
}
```

The problem here: specialization as originally designed will allow the
typechecker to conclude that `T::Assoc` is `String` if it knows that `T` is
`&'static str`. That's because the impl for `&'static str` does *not* use the
`default` keyword when defining its associated type, meaning that no further
specialization is allowed (so the type checker knows everything there is to
know).

But trans, of course, sees `&'erased str` instead, and so cannot safely use the
specialized `impl`. That means that trans will make the call to `build` return
`()`, but the rest of the code assumed that a `String` was returned.

Oops.

(Spoiler alert: the "as originally designed" bit above is a give-away of where
we're ultimately going to end up...)

## Some "solutions" that don't work

Before giving my proposed way forward, let me explain why some of the solution
that are probably coming to mind don't work out.

### Can't we just rule out "bad" specializations?

It's very tempting to blame the specialized `impl`s for `Bad1` and `Bad2` above,
since they clearly impose lifetime constraints. Maybe we could just make it an
error to do so.

Unfortunately, the trait system is very powerful, and you can "hide" lifetime
constraints within other trait impls that don't involve specialization. Worse
still: the problem can arise from two independent crates, each of which is doing
something seemingly reasonable.

```rust
////////////////////////////////////////////////////////////////////////////////
// Crate marker
////////////////////////////////////////////////////////////////////////////////

trait Marker {}
impl Marker for u32 {}

////////////////////////////////////////////////////////////////////////////////
// Crate foo
////////////////////////////////////////////////////////////////////////////////

extern crate marker;

trait Foo {
    fn foo(&self);
}

impl<T> Foo for T {
    default fn foo(&self) {
        println!("Default impl");
    }
}

impl<T: marker::Marker> Foo for T {
    fn foo(&self) {
        println!("Marker impl");
    }
}

////////////////////////////////////////////////////////////////////////////////
// Crate bar
////////////////////////////////////////////////////////////////////////////////

extern crate marker;

pub struct Bar<T>(T);
impl<T: 'static> marker::Marker for Bar<T> {}

////////////////////////////////////////////////////////////////////////////////
// Crate client
////////////////////////////////////////////////////////////////////////////////

extern crate foo;
extern crate bar;

fn main() {
    // prints: Marker impl
    0u32.foo();

    // prints: ???
    // the relevant specialization depends on the 'static lifetime
    bar::Bar("Activate the marker!").foo();
}
```

The problem here is that all of the crates in isolation look perfectly innocent.
The code in `marker`, `bar` and `client` is accepted today. It's only when these
crates are plugged together that a problem arises -- you end up with a
specialization based on a `'static` lifetime. And the `client` crate may not
even be aware of the existence of the `marker` crate.

If we make this kind of situation a hard error, we could easily end up with a
scenario in which plugging together otherwise-unrelated crates is
*impossible*. Or where a minor version bump in one dependency could irrevocably
break your code.

### Can we make a knob: "lifetime-dependent" vs "specializable"?

Thinking more about the previous example, you might imagine the problem is that
the `Marker` trait ends up being used in two incompatible ways:

- It's used in a specialization, the second `Foo` `impl`.
- It's used in `impl`s that constrain lifetimes (the `Bar` `impl`).

It's the combination of these things that gets us into trouble. And each one
arises from a different crate. So you might be tempted to add an attribute, say
`#[lifetime_sensitive]`, which allows for `impl`s that constrain lifetimes but
prevents use in specialization.

In other words, the `Marker` trait could say, in advance, whether the `Foo`
impls or the `Bar` impl are acceptable.

There are several downsides to this idea, but the real death-knell is that
"constraining lifetimes" is a surprisingly easy thing to do. To wit:

```rust
trait Sneaky {
    fn sneaky(self);
}

impl<T> Sneaky for T {
    default fn sneaky(self) {
        println!("generic");
    }
}

impl<T> Sneaky for (T, T) {
    fn sneaky(self) {
        println!("specialized");
    }
}

fn main() {
    // what does this print?
    ("hello", "world").sneaky()
}
```

Here we have a specialized `impl` that doesn't mention any lifetimes or any
other traits; it just talks about the type `(T, T)`. The problem is that it's
asking for the two tuple components to have the *same* type, which means that
*if* a lifetime appears, it must be the same in both.

Once more, when we go to trans the `main` function, we'll be invoking `sneaky`
on the type `(&'erased str, &'erased str)`, and we can't tell for sure whether
the more specialized impl applies.

But saying that you can never repeat a type within a specialization would be
very restrictive. And there's always the worry that we've missed other sneaky
ways to constrain lifetimes...

### Can we make trans smarter?

At this point it becomes tempting to start blaming trans. After all, if we
tracked lifetime information all the way through, wouldn't that solve
everything?

It would solve *some* things: it would make specialization sound. But at a high
cost.

As explained at the outset, tracking information through trans would involve a
massive overhaul of the compiler, and we'd have to be very smart about
coalescing code with different lifetimes but identical behavior. There's no
guarantee we could do this without making the compiler significantly slower
and/or creating more code bloat.

More fundamentally, though, it would lead to highly unpredictable behavior:

```rust
trait Print() {
    fn print(self);
}

impl<'a, T> Print for &'a str {
    fn print(self) {
        println!("Arbitrary str: {}", self);
    }
}

impl<T> Print for &'static str {
    fn print(self) {
        println!("'static str: {}", self);
    }
}

fn print_str(s: &str) {
    s.print()
}

fn main() {
    let s = "hello, world!";
    s.print();
    print_str(s);
}
```

Does this program print `'static str: hello, world!` twice?

No! Because the call to `print_str` will *reborrow* the string slice at a
shorter lifetime, and so trans will monomorphize it differently.

Making program behavior sensitive to the exact rules around lifetime inference
and reborrowing seems extremely risky.

## A modest proposal

Hopefully the above gives you some taste of the challenge here. Later in this
post we'll look at some more promising, clever solutions. But none of them have
worked out completely, so I want to pause here and propose an incremental step
forward.

First off, we add a new feature gate, `assoc_specialization`, which is needed
whenever you use `default type` in an impl. We then focus on stabilizing just
the core `specialization` feature, i.e. *without* being able to specialize
associated types. That immediately means we can stop worrying about making type
checking and trans agree, since type checking will essentially no longer care
about specialization.

Many uses of specialization, including most of the original motivating examples,
do not need to be able to specialize associated types.

With that out of the way, we still have work to do at the trans level. In
particular, we must ensure that trans is conservative when it comes to lifetime
constraints. The proposal here is twofold:

- Any time a specialized impl imposes *any* lifetime constraints not present in
  the more general impl, trans uses the more general impl instead.

- However, in these cases, we trigger an error-by-default lint to warn that a
  possibly-applicable specialization is not being used. (This needs to be a
  lint, not a hard error, because the relevant impls aren't always under your
  crate's control.)

Let's revisit some of the earlier examples in this light:

```rust
// Specialization cannot work: trans doesn't know if T: 'static:
trait Bad1 {
    fn bad1(&self);
}

impl<T> Bad1 for T {
    default fn bad1(&self) {
        println!("generic");
    }
}

impl<T: 'static> Bad1 for T {
    fn bad1(&self) {
        println!("specialized");
    }
}

fn main() {
    // prints `generic`, but also generates a warning
    "test".bad1()
}
```

For this example, trans would pick the generic implementation, but issue a
warning that a specialization *might* have applied. You could imagine going
further and detecting simple cases like this where a given impl will *never* be
used (as in the second impl of `Bad1`) and issuing errors. But as explained
above, we cannot catch them all.

On the other hand, consider this case:

```rust
trait MustBeStatic {}
impl<T: 'static> MustBeStatic for T {}
impl<T: 'static + Clone> MustBeStatic for T {}
```

Here, both impls impose `'static` constraints, so the second impl doesn't impose
any *new* lifetime constraints, and trans can choose it.

To make this work, in trans, when we query the trait system we replace each
instance of `'erased` with a *distinct, fresh* lifetime variable, which is a
simple way to encode that anything we deduce in the query must be valid for
*all* sets of unerased lifetimes. The [Chalk] approach will make this quite easy
to do.

Even for the cases we're covering, though, it's possible to do better (we'll see
more on that later). That means we might want to "improve" the behavior of trans
after stabilizing the core of specialization. Fortunately, we should be able to
statically detect all cases where the behavior of trans would change, and issue
a different warning that the behavior will improve. That gives us leverage to
use something like [epochs] to make trans smarter over time, while still
shipping some version of specialization relatively soon.

The only alternative seems to be to continue to pursue increasingly clever
solutions before shipping anything---which is a worrying approach to take when
it comes to soundness. Better, in my opinion, to ship a sound 80% of the feature
now, with some rough edges, and improve it over time.

[epochs]: https://github.com/rust-lang/rfcs/pull/2052

## Going deeper

Before I close out this post, I want to write out some of the further
explorations we've done, and what we've learned.

Here's an interesting example:

```rust
trait Special {
    fn special(&self);
}

impl<T> Special for T {
    default fn special(&self) {
        println!("generic");
    }
}

impl<T> Special for (T, T) {
    fn special(&self) {
        println!("specialized");
    }
}

fn pair<T: Clone>(t: T) {
    (t.clone(), t).special()
}

fn main() {
    pair("hi");
}
```

Using the strategy outlined above, trans will go from `(&'erased str, &'erased
str)` to `(&'a str, &'b str)` and hence use the generic implementation (and
issue a lint that the more specific impl is being ignored). However, *type
check* could deduce that the more specialized impl always applies when invoking
`special` in `pair`, and you could imagine communicating that information down
to trans.

What's going on here is that type check sees things before monomorphization, and
trans sees them afterward. In this particular case, that ends up making trans
more conservative, since it can't tell that two appearances of `'erased` always
come from the same, single lifetime.

The story changes if we add one layer of "indirection" around trait dispatch:

```rust
trait Special {
    fn special(&self);
}

impl<T> Special for T {
    default fn special(&self) {
        println!("generic");
    }
}

impl<T> Special for (T, T) {
    fn special(&self) {
        println!("specialized");
    }
}

fn use_special<T: Special>(t: T) {
    t.special()
}

fn pair<T: Clone>(t: T) {
    use_special((t.clone(), t))
}

fn main() {
    pair("hi");
}
```

Now at type checking time, the actual use of `special` occurs in a context where
we *don't* know that we'll always be using the more specialized version.

Why harp on this point? Well, for one, it's the main issue in allowing for sound
specialization of associated types. We can see this in a variant of the `Bomb`
example:

```rust
trait Bomb {
    type Assoc: Default;
}

impl<T> Bomb for T {
    default type Assoc = ();
}

impl<T> Bomb for (T, T) {
    type Assoc = String;
}

fn build<T: Bomb>(t: T) -> <(T, T) as Bomb>::Assoc {
    <(T, T) as Bomb>::Assoc::default()
}

fn main() {
    let s: String = build("Uh oh");
    drop(s) // typeck and trans disagree about the type of `s`
}
```

Here, again, type check knows that the relevant uses of `Bomb` all involve types
of the form `(T, T)` and therefore can use the specialized version, and that
could be communicated to trans. But, once more, adding a layer of indirection
makes that much harder:

```rust
trait Bomb {
    type Assoc: Default;
}

impl<T> Bomb for T {
    default type Assoc = ();
}

impl<T> Bomb for (T, T) {
    type Assoc = String;
}

fn indirect<T: Bomb>() -> T::Assoc {
    T::Assoc::default()
}

fn build<T: Bomb>(t: T) -> <(T, T) as Bomb>::Assoc {
    indirect::<(T, T)>()
}

fn main() {
    let s: String = build("Uh oh");
    drop(s) // typeck and trans disagree about the type of `s`
}
```

The problem is that type check can no longer tell trans to use the specialized
impl in the call to `Assoc::default`, *but* it is still assuming that the
specialized impl is used externally (i.e., in the `build` function).

To sum up, there are two inter-related places where type check and trans differ:

- Lifetime erasure
- Monomorphization

We can partly deal with the first of these by introducing fresh lifetime
variables for each lifetime that appears in type check, just as we do for
trans---basically asking for the trait system to only find answers that would
apply for arbitrary lifetime choices.

The monomorphization issue, though, appears much harder to cope with. One
possible avenue is to track impl choices in a way that crosses functions, in
other words allowing the knowledge from `build` that the specialized impl of
`Bomb` can be used to be used when monomorphizing and generating code for
`indirect`. Niko tells me that, in ancient times, the compiler used to do
something much like this---and that it was incredibly painful and complicated.

In any case, taking these further steps would appear to require substantial
additional work, and it seems hard to achieve confidence in their soundness. So
dropping associated type specialization for now, where it's relatively easy to
argue for soundness, seems like the right step to take (@arielb1, here's where
you prove me wrong).
