---
layout: post
title:  "Negative reasoning in Chalk"
---

I've had the pleasure in recent weeks of working
on [Chalk](https://github.com/nikomatsakis/chalk/), the project that Niko's
been blogging about:

- [Lowering Rust traits to logic](http://smallcultfollowing.com/babysteps/blog/2017/01/26/lowering-rust-traits-to-logic/)
- [Unification in Chalk, part 1](http://smallcultfollowing.com/babysteps/blog/2017/03/25/unification-in-chalk-part-1/)
- [Unification in Chalk, part 2](http://smallcultfollowing.com/babysteps/blog/2017/04/23/unification-in-chalk-part-2/)

The project has a few goals:

- Recast Rust's trait system explicitly in terms of logic programming, by
  "lowering" Rust code into a kind of logic program we can then execute queries
  against.

- Provide a prototype for an implementation based on these principles in rustc.

- Provide an executable, highly readable specification for the trait system.

We expect *many* benefits from this work. It will consolidate our existing,
somewhat ad hoc implementation into something far more principled and
expressive, which should behave better in corner cases, and be much easier to
extend. For example, the current implementation *already*
supports
[associated type constructors](http://smallcultfollowing.com/babysteps/blog/2016/11/02/associated-type-constructors-part-1-basic-concepts-and-introduction/).

It also makes it much easier to gain confidence in what the trait system is
doing, because we can understand it in relatively simple logical terms.

## Open problems in paradise

All that said, Chalk isn't finished, and it's currently missing some of the core
pieces of the real trait system.

I've been trying to puzzle out a tangle of related such open problems for
Chalk. In particular, I want to work out how to:

- Give a very precise and principled meaning for the Yes, No, and Maybe
  results you can receive.

- Account for the various "mode switches" we employ in today's trait
  system, which control the degree of negative reasoning permitted.

- Account for rustc's precedence rules that e.g. give more weight to `where`
  clauses than to blanket `impl`s when it comes to type inference.

- Support coherence checking, which requires (constrained) negative reasoning.

- Leverage the orphan rules for reasoning.

- Incorporate specialization soundly (ruling out lifetime dispatch).

The theme that ties all of these topics together is *negative reasoning*, i.e
the ability to conclude definitively that something is *not true*. For the trait
system, that usually means that a type definitively does not implement a
trait. And what we've learned over time is, relying on this kind of reasoning
can make your code brittle to changes in other crates: new impls are added all
the time, and can invalidate these kinds of negative
conclusions. We've
[carefully designed](https://github.com/rust-lang/rfcs/pull/1023) the existing
trait system to strike the right balance between the ability to reason
negatively and the ability of other crates to evolve, but the current
implementation feels ad hoc and incomplete. The challenge is putting all of this
on much firmer footing, by understanding it in terms of explicit logic
programming, and keeping the underlying logic grounded in well-understood
logical principles. (And that, by the way, would be a huge win, since we've
often been quite fearful about negative reasoning in rustc, since it's so easy
to do it incorrectly.)

It turns out that Prolog has similar concerns about negation. In particular, the
natural way of implementing negation in a Prolog engine is through *failure*:
`not P` means you tried but failed to prove `P` *given the facts currently
present in the Prolog program*. For this to be valid as logical negation, we
have to view the program under a "closed world assumption": the facts that
follow from the program's clauses, and *only* those facts, are true.

To understand the rest of this post, you'll want to have read at least the first
of Niko's series.

## Negative reasoning in Rust today

To get more clarity about the negative reasoning issues, let's look at the
various places they come into play in the current trait system.

The current system has two distinct "mode switches":

- [Intercrate mode](https://github.com/rust-lang/rust/blob/4ed95009d8d5d50c4f7aee35ad89c30a2258ffa9/src/librustc/traits/select.rs#L75-L89),
  which forces the trait system to account for the possibility that (1)
  downstream crates using this crate can introduce new types and trait impls
  that we can't know about and (2) upstream crates could be *changed* to
  introduce new trait impls.

- [User-facing projection mode](https://github.com/rust-lang/rust/blob/4ed95009d8d5d50c4f7aee35ad89c30a2258ffa9/src/librustc/traits/project.rs#L41-L63),
  which forces the trait system to account for the possibility that upstream
  crates could be changed to introduce new specializations (and thus alter the
  definition of an associated type).

We'll see what this means concretely in a moment, but one observation right off
the bat: these switches are *not* used orthogonally today. In particular, there
is no code today that uses intercrate mode without also using user-facing
projection mode.

Let's go through the three major areas of the compiler that use the trait system
and see how they employ these modes, and what the implications are.

### Overlap checking and intercrate mode

Part of trait coherence is checking impls for *overlap*. Consider the following:

```rust
trait MyTrait { .. }
impl<T: Error> MyTrait for T { .. }
impl MyTrait for () { .. }
```

Do these two impls overlap? It depends on whether `(): Error` -- or more
precisely, whether we can definitively conclude `not { (): Error }`. If we are
allowed to conclude that `not { (): Error }`, then we can conclude that the two
impls don't overlap.

Should we be able to draw such a conclusion? On the one hand, *currently* `()`
does not implement the `Error` trait (both are defined in `std`), and hence the
two impls here do not overlap. However, if `std` was ever changed so that `()`
implemented `Error`, these impls *would* overlap and could not be allowed. In
other words, `std` adding such an impl would irrevocably break this code! And
we'd like for `std` to be able to add trait implementations without requiring a
new major version of Rust.

Part of
the [rebalancing coherence RFC](https://github.com/rust-lang/rfcs/pull/1023) was
a decision that **these kinds of negative conclusions can only be drawn about
type/trait combinations that are fully under the current crate's control**.  In
other words, it connects negative reasoning to the *orphan rule*, which says
which impls a crate is allowed to provide. (There is also a mechanism, called
`fundamental`, to promise that certain impls won't be provided in the future,
but we'll ignore that for now.) By limiting negative reasoning in this way, we
can "future proof" crates against changes their dependencies will likely make,
such as introducing impls. While such changes can still cause type inference
ambiguities, they can never cause irrevocable breakage.

To illustrate where we *do* allow negative reasoning for overlap checking,
consider the following variant:

```rust
trait MyTrait { .. }
impl<T: Error> MyTrait for T { .. }

struct MyStruct { .. } // does not implement Error
impl MyTrait for MyStruct { .. }
```

Here, we allow the trait system to conclude that `not { MyStruct: Error }`,
because whether or not `MyStruct: Error` is **entirely under this crate's
control**, so there is no risk of an innocent upstream change breaking this
crate.

Here's a more subtle case:

```rust
trait MyTrait { .. }
trait Aux { .. } // no impls in this crate

impl<T: Error> MyTrait for T { .. }

struct MyStruct<U> { .. } // no impl for Error in this crate
impl<T> MyTrait for MyStruct<T> { .. }
impl<T: Aux> Error for MyStruct<T> { .. }
```

This example has a lot going on. The key point is that the current crate defines
an `Aux` trait, but does not implement it for *any* types. Hence, there is no
`T` you could mention in this crate such that `T: Aux`, and hence no type `T`
such that `MyStruct<T>: Error`. Can we thus conclude that for *all* `T`, `not {
MyStruct<T>: Error }`? No! Because a downstream crate using this one could
define a new type `Foo` and implement `Aux` for it, and then suddenly
`MyStruct<Foo>` would have *two* applicable impls of `MyTrait`.

For that reason, we consider not only the way that existing, upstream crates
could provide new impls over time, but also consider that downstream crates can
introduce new types, and new trait impls for them, that we will never be able to
know about here.

All of the above restrictions on negative reasoning are part of *intercrate
mode*, which is only used by overlap checking.

### Type checking and user-facing projection mode

Another case of negative reasoning arises through specialization. Consider:

```rust
// Crate A

trait Foo { type T; }
impl<T> Foo for T {
    default type T = bool;
}

// Crate B

use crate_a::Foo;

fn main() {
    let x: <bool as Foo>::T = true;
}
```

Should this compile? More specifically, is it valid for crate B to conclude that
the associated type `T` for `bool`'s implementation of `Foo` is `bool`?

It would be sound to make that assumption, since we know that crate A is the
only crate that can implement `Foo` for `bool` (due to the orphan rules), and
chose not to specialize the impl. However, in the future, crate A could be
modified with an additional impl:

```rust
impl Foo for bool {
    type T = ();
}
```

And that change would break crate B. So this is again a question of what changes
an upstream crate should be able to make in a minor revision.

Currently, we tilt things in favor of crate A being able to add such an impl,
and thus *do not* allow the original example to compile. This is again a form of
constraining negative reasoning: we do not allow crate B to conclude that there
is not a more specialized impl that applies, because there could be one in the
future.

Interestingly, in the current implementation you could not write `fn main` even
in crate A, where all of the relevant impls are under the crate's direct
control. I consider this a bug.

In any case, this negative reasoning restriction is called "user-facing
projection mode" (as opposed to "trans-facing", which we'll see below). It's
turned on during both type checking and overlap checking.

#### Why type checking does not turn on intercrate mode

Today, type checking and overlap checking differ in one (big) way with respect
to negative reasoning: type checking does *not* turn on intercrate mode. Why?

Consider the following, quite contrived example:

```rust
trait Foo<T> {
    fn make() -> T;
}
trait Bar<T> {}

#[derive(Debug)]
struct Local;

impl<T> Foo<T> for () where (): Bar<T> {
    fn make() -> T { panic!() }
}

impl Foo<Local> for () {
    fn make() -> Local { Local }
}

fn main() {
    println!("{:?}", <()>::make());
}
```

This code compiles and prints "Local". That's because, from what this crate can
see, *no* type implements `Bar<T>`, so only the second impl of `Foo` is viable.
That conclusion is then fed into type inference, which decides to interpret
`<()>::make()` as `<() as Foo<Local>>::make()`.

This is all kosher because, for soundness, the only thing that matters about
type inference is that, in the end, we get something that typechecks. And we've
made a [deliberate decision] to *not* make type inference future-proofed against
changes in other crates, since that creates serious ergonomic problems (see the
linked post, particularly the section on conditional impls).

[deliberate decision]: http://smallcultfollowing.com/babysteps/blog/2014/09/30/multi-and-conditional-dispatch-in-traits/#crate-concatenability-and-inference

### Trans

On the other hand, when it comes time to actually generate code, we are no
longer interested in future-proofing (which has already been taken care of in
the static checking described above), and instead expect to get a clear-cut
answer to all questions we ask of the trait system--in part because all of the
questions will involve fully monomorphized types. In particular, we need to
allow `default` associated types to be revealed, so that we can generate code.

Thus, when using the trait system within trans, we allow full-blown negative
reasoning.

## Modal logic

So, putting together all of the above: the trait system engages in various forms
of negative reasoning, but at different times this reasoning is restricted in
different ways. Only the trans point of view correlates directly with Prolog's
"negation as failure"/closed world view. The question now is, can we understand
the restricted forms of negative reasoning in logical terms as well?

It turns out that there's a very satisfying answer: use a *modal* logic.

Modal logic makes truth relative to a *possible world*, rather than being an
absolute thing. In one world, the sky is blue; in another world, it's
red. That's the story for "facts". But the basic rules of logic apply no matter
what world you're talking about: 1+1 = 2 in every possible world.

An important aspect of modal logics is *modalities*, which are basically ways of
qualifying a statement by what world(s) you are talking about. The statement I
just made above is an example of a modal statement: 1+1 = 2 *in every possible
world*. There are lots of possible modalities, like "in every *future* world" or
"in *some possible* world" and so on.

There's a *lot* more to say about modal logic, but this post is going to tell
the story in a Rust-centric way. You can find more
background [here](https://plato.stanford.edu/entries/logic-modal/).

### Possible worlds in Rust

What does all this mean for Rust? We can give a rational reconstruction of what
the compiler currently does via modal logic, and use it to guide the development
of Chalk, resolving a number of open questions along the way.

First off, a "possible world" for us will be a full crate graph, with a
particular crate being considered "the current crate" (the one actively being
compiled). In the simplest case, there's just one crate, like in the following
two examples:

```rust
// Program A
struct MyType;
trait MyTrait {}
impl MyTrait for MyType {}
```

and

```rust
// Program B
struct MyType;
trait MyTrait {}
```

Both crates define `MyType` and `MyTrait`, but in the first one `MyType:
MyTrait`, while in the second one, `not { MyType: MyTrait }`. The facts on the
ground depend on the crate you're compiling. And when you're asking Chalk a
question, that question is normally grounded in the particular crate graph
you've lowered to Chalk's logic. In other words, statements made *directly about
the current world* are interpreted in, well, a "closed world" way: we know
precisely what the world is, and can give firm answers on that basis. That's the
appropriate interpretation for trans, as we saw above.

Second--and this is really the key idea--**we add a modality to Chalk to make
statements about *all compatible worlds* to the one we're currently in**. This
is how we capture the idea of "future proofed" reasoning of the kind we want in
type and coherence checking. A world is *compatible* with the current world if:

- The current crate is unchanged.
- All dependencies of the current crate still exist, but may be extended in
  *semver-compatible* ways (i.e., ways that would only require a minor version bump).
- Downstream crates (that use the current crate) can come, go, and otherwise
  change in arbitrary ways.

Let's see an example. Suppose we have a two crate dependency graph:

```rust
// WORLD 1

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;
```

Here's a compatible world, one that extends crate A in a minor-bump kind of way:

```rust
// WORLD 2

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;
impl Foo for CrateAType {}   // <- changed

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;
```

Now, here's an interesting thing: in the world 1, `not { CrateAType: Foo
}`. But in this new, compatible world 2, `CrateAType: Foo`! The facts on the
ground have changed in a meaningful way.

Could we go the other way around? That is, if we're currently talking about the
world 2, is world 1 considered compatible? No. Because *removing* a
trait impl is not a semver-compatible change. What that means in practice is
that, when jumping to a compatible world, you can go from `not { Foo: Bar }` to
`Foo: Bar`, but not the other way around.

Here's a world that is incompatible with the world 1:

```rust
// World 3

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;
impl Foo for CrateBType {}   // <- changed
```

The change here is very similar to the change in world 2, but the key difference
is *which crate* was changed: crate B, the "current crate", is different in this
world, and that makes it incompatible with world 1. This is how we get a
distinction for the "local" crate, which we control and therefore don't need to
future-proof against. So if `not { CrateBType: Foo }` and crate B is the current
crate, we know that in any compatible world, `not { CrateBType: Foo }` will
still be true.

Now let's talk about the other kind of change allowed to the world:
arbitrary changes to downstream crates. In world 1, we didn't have any crates
downstream from crate B. Here's a world that does:

```rust
// WORLD 4

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;

////////////////////////////////////////////////////////////
// crate C -- a downstream crate
////////////////////////////////////////////////////////////

extern crate crate_a;
extern crate crate_b;
use crate_a::*;

struct CrateCType;
impl Foo for CrateCType {}
```

So, in world 1 we could conclude `not { exists<T> { T: Foo } }`. But in world 4
here, we have `CrateCType: Foo`. That's the kind of thing that we assume can
happen during coherence checking, but today we *don't* in typechecking. As we'll
see later, though, this single notion of compatible worlds will end up sufficing
for both.

Finally, let's look at one more world, this time involving downstream crates:

```rust
// WORLD 5

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;

////////////////////////////////////////////////////////////
// crate C -- a downstream crate
////////////////////////////////////////////////////////////

extern crate crate_a;
extern crate crate_b;
use crate_a::*;
use crate_b::*;

impl Foo for CrateBType {}    // <- Note the type here
```

This world is not just incompatible with world 1--it's not even a possible
world! That's because crate C violates the orphan rule by providing an impl for
a type and trait it does not define (`Foo` for `CrateBType`). In other words,
when we consider "all compatible worlds", we take into account the orphan rules
when doing so. And that's why, starting from world 1, we know that in all
compatible worlds, `not { CrateBType: Foo }`.

### The `compat` modality

The discussion for Rust so far has focused on the underlying meaning of
worlds. But we want to "surface" that meaning through a modality that we can use
when making statements or asking questions in Chalk. We'll do this via the
*`compat` modality*. (For modal logic aficionados, this is basically the "box"
modality, where the reachable worlds are the "compatible" ones, described
below.)

The basic idea is that if we pose a query `Q`, that's understood in terms of the
current world, but if we ask `compat { Q }`, we're asking if `Q` is true *in all
compatible worlds*.

Revisiting our example above, if world 1 is the current world, here are some
fact's we'll be able to deduce

- `not { CrateAType: Foo }`
- `not { CrateBType: Foo }`
- `not { exists<T> { T: Foo } }`
- `compat { not { CrateBType: Foo } }` -- in every compatible world, we *still* know that `CrateBType` does not implement `Foo`

And here are some statements that will *not* hold:

- `compat { not { CrateAType: Foo } }`, because of examples like world 2.
- `compat { CrateAType: Foo }`, because of world 1 itself.
- `compat { not { exists<T> { T: Foo } } }`, for similar reasons

Note that for a given query `Q`, we might not be able to show `compat { Q }`
*or* `compat { not { Q } }`, because some compatible worlds satisfy `Q`, and
some don't. So, within the `compat` modality, you don't get
the
[law of the excluded middle](https://en.wikipedia.org/wiki/Law_of_excluded_middle).

There's more to say about this modality and how it's implemented, but we can
already put some cards on the table: when we're type or coherence checking, the
queries we pose to Chalk will be placed within a `compat` modality, which
essentially "future proofs" their conclusions. For trans, we'll pose queries
directly about the current world.

In other words, having the `compat` modality means we can decide whether to make
a "closed world assumption" or not, depending on what we're trying to do.

## Not taking Yes or No for an answer

To finish telling the story around modalities in Chalk, as well as to fully
capture the current trait system's behavior, we need to talk a little bit about
what kinds of answers you can get when you pose a query to Chalk.

Traditional logic programming gives you two kinds of answers: Yes (with some
information about how the query was resolved) and No. So for example, take the
following Rust program:

```rust
trait Foo: Display {
    fn new() -> Self;
}
impl Foo for u8 { ... }
impl Foo for bool { ... }
```

If you ask `exists<T> { T: Foo }` in a traditional Prolog engine, you'll get
something like "Yes, T = u8"; if you ask again, you'll get "Yes, T = bool", and
if you ask a final time, you'll get "No".

That's not quite what we want for Rust. There, "existential" questions come up
primarily when we're in the middle of type inference and we don't know what a
particular type is yet. Think about a program using the `Foo` trait like so:

```rust
fn main() {
    println!("{}", Foo::new());
}
```

When we go to type check this function, we don't immediately know what the type
returned by `Foo::new()` is going to be, or which `impl` to use. While it's true
that there *do exist* types we could use, we don't want to pick one at random
for type inference. Instead, we want an error asking the programmer to clarify
which type they wanted to use.

On the other hand, when there's *only one choice* of type given other
constraints, we allow type inference to assume the programmer must have meant
that type:

```rust
struct Foo;

trait Convert<T> {
    fn convert(self) -> T;
}

impl Convert<bool> for Foo {
    fn convert(self) -> bool { true }
}

fn main() {
    println!("{}", Foo.convert()) // prints `true`
}
```

Similarly, when it comes time to generate code, we expect there to be a *unique*
choice of impl to draw each method call from!

These considerations have led both rustc and Chalk to adopt a kind of three-way
answer system: Yes, No, and Maybe. The *precise* meaning of these outcomes has
been a bit muddy, but part of what I want to advocate for is the following
setup:

- Yes: in the current world, there is a *unique* way of choosing the
  existentials (inference variables) to make the query true; here's what it is.

- No: the query does not hold in the current world.

- Maybe: the query may or may not hold in the current world; optionally, here's
  a suggestion of what to choose for the existentials if you get stuck.

What is this business about getting stuck? In general, when we're type checking
a function body, we don't always know the type of everything at the time we
encounter it. Take, for example, the following:

```rust
fn main() {
    let mut opt = None;
    opt = Some(true);
}
```

When we are typechecking the first line, we know that `opt` will have type
`Option<?T>`, but we don't know what `?T` is; it's an inference variable. Later
on in checking, as we encounter further constraints, we'll learn that `?T` must
be `bool`. By the time we finish typechecking a function body, *all* inference
variables must be so resolved; otherwise, we wouldn't know how to generate the
code!

This inference process is interleaved with querying the trait system, as in the
`Convert` example above. So in general we need the trait system to feed back
information about unknown types. But for the case of `Maybe`, the trait system
is saying that there *might* be multiple ways of implementing the trait, and the
suggested types being returned should only be used as a "fallback" if type
checking otherwise can't make any progress.

Let's take a look at a couple of ways that this version of Maybe helps.

### Leveraging Maybe for `where` clause precedence

In the current trait system, `where` clauses are given precedence over other
impls when it comes to type inference:

```rust
pub trait Foo<T> { fn foo(&self) -> T; }
impl<T> Foo<()> for T { fn foo(&self) { } }
impl Foo<bool> for bool { fn foo(&self) -> bool { *self } }

pub fn foo<T>(t: T) where T: Foo<bool> {
   println!("{:?}", <T as Foo<_>>::foo(&t));
}
fn main() { foo(false); }
```

The program prints `false`. What's happening here is that the call to `foo`
within `println!` does not provide enough information by itself to know whether
we want the `Foo<bool>` impl or the `Foo<()>` impl, both of which apply. In
other words, there's not a unique way to resolve the type. *However*, the
current trait system assumes that if you have an explicit `where` clause, it
should take precedence over impls, and hence influence type inference.

It wasn't initially clear how this would carry over to Chalk, where we're trying
to take a "pure logic" stance on things, and hence would prefer not to bake in
various notions of precedence and so on.

However, with the reading of Maybe given above, we can yield a Maybe answer here
and *recommend* to type inference that it choose `bool` if it gets stuck, but
we've made clear that this is a sort of "extra-logical" step.

### Leveraging Maybe for type checking under `compat`

Similarly, recall that in the current trait system, there are *two* different
mode switches, but so far we've only talked about a single `compat` modality to
add to Chalk.

The key, again, is to leverage Maybe. In particular, we can have both type
checking and coherence checking make queries to Chalk within the `compat`
modality. But if they get a Maybe answer back, they will interpret it
differently:

- Coherence, which is trying to be conservative, will consider a Maybe to mean
  "Yes, these could potentially overlap", and hence produce an error.

- Type checking, as explained above, will take the fallbacks suggested by Maybe
  under advisement, and if it gets stuck, will apply them and see whether it can
  make further progress.

Here again was the example that distinguished the modes that type checking and
coherence used:

```rust
trait Foo<T> {
    fn make() -> T;
}
trait Bar<T> {}

#[derive(Debug)]
struct Local;

impl<T> Foo<T> for () where (): Bar<T> {
    fn make() -> T { panic!() }
}

impl Foo<Local> for () {
    fn make() -> Local { Local }
}

fn main() {
    println!("{:?}", <()>::make());
}
```

The key point was: can you deduce that `not { exists<T> { (): Bar<T> } }`, and
hence that only the second impl of `Foo` could possibly apply?

In the system proposed by this post, we'd follow a chain of events like the following:

- The type checker asks: `exists<T> { compat { (): Make<T> } }`
  - We check the first impl, and end up asking: `compat { (): Bar<?T> }`
    - We return `Maybe`, since we're within `compat` and there are indeed some
      compatible worlds for which `(): Bar<?T>` for some `?T`; but we have no
      idea what that `?T` should be.
  - We check the second impl, and get `Yes` with `?T = Local`.
  - Since there were multiple possibilities, we don't have a *unique* answer;
    but only one of the possibilities gave us a suggestion for the inference variables.
    So we return `Maybe` with `?T = Local`
- The type checker takes under advisement that `?T` should be unified with
  `Local` if nothing else constrains it.

In other words, unlike with the current trait implementation, we don't have to
*pretend* that we actually get a unique answer here; we can work within the
future-proofed `compat` modality, and get back a `Maybe` answer with the
suggestion we wanted.

It's quite nice that all of the static checking takes place under the "future
proofing" of the `compat` modality, whereas trans talks only about the world as
it is, under a closed world assumption.

## Implementing `not` and `compat` in Chalk

Before we close out this post, it's worth being a bit more concrete about how
`not` and `compat` would be implemented in Chalk (neither exists today).

### Negation

For `not { Q }`, we basically follow Prolog-style negation-as-failure:

- Attempt to solve Q, then dispatch on the answer we got:
  - If we got `Yes`, return `No`
  - If we got `No`,
    - If there are no existential variables within `Q`, return `Yes`
    - Otherwise, return `Maybe`, with no type suggestions
  - If we got `Maybe`, return `Maybe`, with no type suggestions

As you can see, with negation we don't get information about existential
variables, which is the same in traditional Prolog.

### The `compat` modality

The implementation of `compat { Q }` is a bit more complex. First of all, it's
important to realize that Chalk already operates on an explicit "world", namely
the program you've lowered to it. When you ask questions, it will use this world
as one source of facts (together with `where` clauses, basically). So the
question is: how do we tweak this setup to capture the idea of "Evaluate this in
any world compatible with the current one"?

We certainly can't literally construct every such world, as there are an
infinite number of them. But fortunately, we don't have to. The role of the
world in Chalk, as I said above, is to provide a core source of facts. To model
"some arbitrary compatible world", we just need to capture the various facts
that might be true in such a world. This can be done in a "lazy" kind of way: in
the `compat` modality, whenever we are seeing whether a particular fact is true
by virtue of the current world, we see whether it's a fact that *could* be made
true in some compatible world, and if so yield `Maybe` (with no suggested types).

Let's look at this concretely, revisiting world 1:

```rust
// WORLD 1

////////////////////////////////////////////////////////////
// crate A
////////////////////////////////////////////////////////////

trait Foo {}
struct CrateAType;

////////////////////////////////////////////////////////////
// crate B -- the current crate
////////////////////////////////////////////////////////////

extern crate crate_a;
use crate_a::*;

struct CrateBType;
```

If we ask `CrateAType: Foo`, we'll get No. But if we ask `compat { CrateAType:
Foo }`, then Chalk should switch into "compatible world" mode, so that when it's
consulting the world whether `CrateAType: Foo`, it will determine that such an
impl could be added by crate A, and hence return Maybe. But `compat {
CrateBType: Foo }` will return No, because we know the current crate controls
the existence of such an impl. And hence, `compat { not { CrateBType: Foo } }`
returns Yes. (Other than turning on "compatible world" mode, the `compat`
modality just re-invokes the solver and returns up whatever was found.)

This strategy has much in common with the current rustc implementation, but now
we have explicit negation (which does the right thing both inside and outside
the modality), and we can get away with just this *single* modality, versus
rustc's two different "global switches". Moreover, we've rationally
reconstructed the behavior by connecting it to modal logic, which puts us on
better footing for exploring extensions (like negative trait impls and so on).

A word about associated types:
as
[Niko's latest post](http://smallcultfollowing.com/babysteps/blog/2017/04/23/unification-in-chalk-part-2/) discusses,
when we lower impls we separately lower the fact that the impl *exists* from the
various projections it provides. For `compat`, we only need to handle `Type:
Trait` kinds of facts; the "applicative fallback" for associated type projection
takes care of the rest.

Altogether, we avoid actually *constructing* some particular compatible world,
and avoid having to guess meaningful facts about it; we just say "Maybe" to any
question that could have a different answer in some compatible world.

## What's next

Putting together everything proposed in this post, we've achieved quite a bit:

- A clear meaning for Yes/No/Maybe.
- A story for the various "modes" in today's trait system, which means we can
  support type checking, coherence checking, and trans.
- A story for integrating the orphan rules into Chalk.
- A story for integrating the `where` clause precedence rules into Chalk.
- A clear treatment of negative reasoning in general, which will allow us to
  much more confidently employ it in the future.

What's missing to achieve parity with rustc is specialization. It turns out that
the modal foundation laid here provides most of what we need for
specialization. However, there are some additional concerns around "lifetime
dispatch", which render rustc's implementation of specialization unsound. The
Chalk implementation should provide a testbed for finally solving those issues.
I plan to have a follow-up post about that in the near future.

The design presented here is also just an "on paper" design. I'll be working to
implement it over the coming weeks.
