---
layout: post
title:  "Resurrecting impl Trait"
---

**TL;DR**: since before Rust 1.0, we've wanted to be able to return an unboxed
closure or avoid spelling out huge iterator types. This blog post revives the
old `impl Trait` proposal, and discusses the broad tradeoffs between two
different ways of carrying it out.

**Heads up**: I'm going to gloss over some details in this post, in the interest
of getting across the high-level situation as I see it. Of course, any actual
proposal will need to address the questions that I skip over.

**Update**: I removed the "elision" terminology, which was more confusing than
helpful. I also now mention some implementation issues for the return type
inference proposal. And I've toned down my preference in the wrapup; I'm
becoming less certain :)

## The original proposal

This post is about a topic near-and-dear to me -- my
[first Rust RFC](https://github.com/rust-lang/rfcs/pull/105)! -- which is known
as the "`impl Trait`" proposal. The RFC termed these "unboxed abstract types",
and it's easiest to start with the motivation given there:

> In today's Rust, you can write a function signature like
>
> ```rust
> fn consume_iter_static<I: Iterator<u8>>(iter: I)
> fn consume_iter_dynamic(iter: Box<Iterator<u8>>)
> ```
>
> In both cases, the function does not depend on the exact type of the argument.
> The type is held "abstract", and is assumed only to satisfy a trait bound.
>
> * In the `_static` version using generics,
> each use of the function is specialized to a concrete, statically-known type,
> giving static dispatch, inline layout, and other performance wins.
>
> * In the `_dynamic` version using trait objects, the concrete argument type is
>   only known at runtime using a vtable.
>
> On the other hand, while you can write
>
> ```rust
> fn produce_iter_dynamic() -> Box<Iterator<u8>>
> ```
>
> you _cannot_ write something like
>
> ```rust
> fn produce_iter_static() -> Iterator<u8>
> ```
>
> That is, in today's Rust, abstract return types can only be written using trait objects, which
> can be a significant performance penalty. This RFC proposes "unboxed abstract
> types" as a way of achieving signatures like `produce_iter_static`. Like
> generics, unboxed abstract types guarantee static dispatch and inline data
> layout.
>
> Here are some problems that unboxed abstract types solve or mitigate:
>
> * _Returning unboxed closures_. The ongoing work on unboxed closures expresses
>   closures using traits. Sugar for closures generates an anonymous type
>   implementing a closure trait. Without unboxed abstract types, there is no way
>   to use this sugar while returning the resulting closure unboxed, because there
>   is no way to write the name of the generated type.
>
> * _Leaky APIs_. Functions can easily leak implementation details in their return
>   type, when the API should really only promise a trait bound. For example, a
>   function returning `Rev<Splits<'a, u8>>` is revealing exactly how the iterator
>   is constructed, when the function should only promise that it returns _some_
>   type implementing `Iterator<u8>`. Using newtypes/structs with private fields
>   helps, but is extra work. Unboxed abstract types make it as easy to promise only
>   a trait bound as it is to return a concrete type.
>
> * _Complex types_. Use of iterators in particular can lead to huge types:
>
>   ```rust
>   Chain<Map<'a, (int, u8), u16, Enumerate<Filter<'a, u8, vec::MoveItems<u8>>>>, SkipWhile<'a, u16, Map<'a, &u16, u16, slice::Items<u16>>>>
>   ```
>
>   Even when using newtypes to hide the details, the type still has to be written
>   out, which can be very painful. Unboxed abstract types only require writing the
>   trait bound.
>
> * _Documentation_. In today's Rust, reading the documentation for the `Iterator`
>   trait is needlessly difficult. Many of the methods return new iterators, but
>   currently each one returns a different type (`Chain`, `Zip`, `Map`, `Filter`,
>   etc), and it requires drilling down into each of these types to determine what
>   kind of iterator they produce.
>
> In short, unboxed abstract types make it easy for a function signature to
> promise nothing more than a trait bound, and do not generally require the
> function's author to write down the concrete type implementing the bound.

So, the RFC began with the framing that there was a kind of "gap" in the
expressiveness matrix: we can choose between static and dynamic dispatch for
inputs, but not for outputs.

The RFC went on to propose the `impl Trait` notation as a way of solving these
problems:

> The basic idea is to allow code like the following:
>
> ```rust
> pub fn produce_iter_static() -> impl Iterator<u8> {
>     (0..10u8).rev().map(|x| x * 2).skip(2)
> }
> ```
>
> where `impl Iterator<u8>` should be understood as "some type `T` such that `T:
> Iterator<u8>`.  Notice that the function author does not have to write down any
> concrete iterator type, nor does the function's signature reveal those details
> to its clients. But the type promises that _there exists_ some concrete type.

The point here is to avoid writing a return type like

```rust
iter::Skip<iter::Map<'static,u8,u8,iter::Rev<iter::Range<u8>>>>
```

and instead give only the relevant information: some trait(s) that are
implemented for the return type.

For a variety of reasons the RFC was closed and the feature has not shipped.
But part of the impetus for returning to this topic now is that the illustrious
@eddyb has a working implementation of a subset of the RFC! Ideally, the Rust
community can come to a consensus around a design, and we can adapt and land
this implementation.

## Design questions

As it turns out, though, there are a lot of complex issues and decisions at play
here, and as usual, multiple interesting points in the design space. Some of
these were brought up in the RFC itself, others brought up on thread, and others
haven't really been discussed. But they all have to be tackled.

First I'll go quickly through the main questions, then talk about design
priorities, and finally present two possible designs.

### Is `impl Trait` a type?

Can `impl Trait` appear everywhere a type can?

If not, where *can* `impl Trait` be used? Only return types? What about arguments, struct
definitions, type aliases, etc? In each case, what should the semantics be?

The RFC gave answers to many of these questions, although I think today I would
answer some of them differently.

### Is `impl Trait` "sealed"?

As @Ericson2314 astutely remarked on thread:

> This RFC is trying to serve up type inference and type abstraction as one
> feature, when they are orthogonal.
>
> Inference-wise, we want to introduce meta-variables/unknowns where we are are not allowed to today.
>
> ```rust
> fn foo() -> _ { ... };
> type BigLongIterator = _;
> ```
>
> Abstraction-wise, we want to give ourselves more leeway to change our libraries without breaking client code.
>
> ```rust
> mod nsa {
>     // Works with any T!
>     abs type Iter<T>: Iterator<Item=T> = SnoopWhile<...T...>;
>     ...
> }
> ```

Here "type inference" means something akin to leaving off a type
annotation that's required today (like the return type of a function),
without any change to semantics.  By contrast, "type abstraction"
means *hiding* some information about a type from clients, similarly
to what we often do with
[newtypes](http://aturon.github.io/features/types/newtype.html)
today. The original proposal coupled these two features together.

This is going to turn out to be a central question for this blog post. *Should*
these two aspects of the feature be treated separately or coupled? Are both
needed? What are the tradeoffs?

### How do you deal with `Clone` or `Iterator` adapters?

It's pretty common that a trait is *conditionally* implemented:

```rust
impl<T: Clone> Clone for Vec<T> { ... }
```

But that poses a problem for `impl Trait`, which requires an *unconditional*
statement about which traits are implemented. This is especially painful for
things like the iterator adapters, which are often `Clone` if the original
iterator is, `DoubleEndedIterator` if the original iterator is, etc.

### Do marker traits (`Send`, `Sync`, ...) have to be mentioned?

When you use the
[newtype pattern](http://aturon.github.io/features/types/newtype.html) today,
you have to explicitly forward most traits, but certain traits like `Send` and
`Sync` will *automatically* be implemented for the new type if they were for the
old type. Should `impl Trait` work similarly, implicitly carrying the markers?

This is not just a question of ergonomics, though the ergonomic issue here is
significant! There's also an extensibility problem: new libraries can add new
"OIBIT"-style marker traits which are supposed to automatically apply to types,
but forcing those markers to be explicitly opted in to for `impl Trait` means
they often won't apply. We've already seen significant problems along these
lines with trait objects today.

## Design constraints

I'm going to be a bit opinionated here and lay out some design desires.

**Hard constraints**:

- must be possible to return an unboxed closure and store it in a struct
- must be possible to return a compound iterator without giving the type explicitly
- must cope with *multiple* such types appearing as *components* of a return
  type (e.g., returning a pair of different unboxed closures)
- must be able to assert that at least *some* traits are satisfied
- must be able to deal with conditional trait implementations

**Strong desires**:

- minimal signature verbosity
- compatible with adding new OIBITs
- simple semantics/explanation of the feature, especially if it looks like a type

**Nice to haves**:

- type abstraction (the "hiding" that @Ericson2314 was talking about)
- more ergonomic newtypes (where you don't have to forward trait impls explicitly)
- applicable to struct definitions, not just function signatures

## Option 1: return type inference

I'll start with the simpler design: attack only the type inference aspect of the
original proposal, without actually hiding any details about a type from clients.

The simplest way to do this would be to allow wildcards to leave off types in return
position:

```rust
fn foo() -> _ {
    (1..10u8).rev().skip(2)
}

fn bar() -> (_, _) {
    (|| println!("first closure"),
     || println!("second closure"))
}
```

The idea here is that the actual return type is fully concrete -- clients of the
API know exactly what it is, and can take advantage of public inherent methods or
arbitrary traits.

But a pure wildcard proposal is a pretty drastic step away from our policy of
explicitness for signatures and type definitions. In particular, it doesn't lead
to a very informative signature for clients of the API.

A more palatable choice would be something closer to `impl Trait`, like:

```rust
fn foo() -> ~Iterator<Item = u8> {
    (1..10u8).rev().skip(2)
}

fn bar() -> (~FnOnce(), ~FnOnce()) {
    (|| println!("first closure"),
     || println!("second closure"))
}
```

The idea is that these trait bounds don't say *everything* about the concrete
type, but they give some trait bounds that must hold of the concrete type. (So
`~FnOnce()` means "an elided type with interface roughly `FnOnce()`".) Usually,
there is one "primary" trait for a given return type, though of course you can
list as many as you like using `+`.

If I have my druthers, this feature would also be usable in argument position:

```rust
fn map<U>(self, f: ~FnOnce(T) -> U) -> Option<U>
```

To be clear about the "roughly" here: in the `foo` example, the return type also
implements `Clone` and `ExactSizeIterator` -- and client code can rely on those
facts, despite them not being written down.

On the one hand, this approach is uncomfortably implicit (since bounds can be
left off), and it may leak information about the type that we do not
intend.

There are also some implementation concerns -- the typechecker will need to
check function definitions in a particular order to discover concrete types, and
must ensure that return type inference isn't used in a cycle between
functions. Note, however, that type inference continues to be purely local.

On the other hand:

- It's dead simple from the programmer's perspective. There are no
  thorny questions about type equality, scoping of type abstractions,
  or what `~` means in various contexts. It's just an extension of
  inference.

- It behaves exactly like associated types today.

- It accounts for conditional trait implementations easily, since those will
  automatically be known about the return type whenever they are applicable.

- It accounts for marker traits and "OIBITs" without any fuss.

- This kind of "leakage" is already prevalent -- and important! -- in Rust
  today. For example, when you define an abstract type, you give a trait bound
  which must be fulfilled. But when a client has narrowed to a particular
  `impl`, *everything* about the associated type is revealed:

  ```rust
  trait Assoc { type Output: Clone; }
  impl Assoc for u8 { type Output = u8; }

  // we know that u8::Assoc == u8! We're only limited to the bound when writing
  // fully generic code.
  ```

- The type leakage is, in general, very unlikely to be relied upon. For example, to
  observe the particulars of an iterator adapter type, you'd have to do
  something like assign it to a suitably-typed mutable variable:

  ```rust
  let iter: Chain<Map<'a, (int, u8), u16, Enumerate<Filter<'a, u8, vec::MoveItems<u8>>>>, SkipWhile<'a, u16, Map<'a, &u16, u16, slice::Items<u16>>>>;
  iter = some_function();
  ```

This design addresses all of the hard constraints and strong desires -- but none
of the nice-to-haves.

**Key point**: the strong simplicity here is a major selling point, given that
the pain we're trying to solve here is one of the places where Rust is
considered to be particularly complicated. (See
[this reddit post](https://www.reddit.com/r/rust/comments/397xn3/why_does_anything_have_higher_priority_than/)
for example.)

## Option 2: type abstraction

On the other end of the spectrum, we could try to address all of the use cases
outlined, including type abstraction.

I'm going to give one particular strawman proposal and syntax here, and only at
a high level -- it's not a fully fleshed out spec, but should give some idea of
the possible direction.

The basic idea is to introduce a "type abstraction operator" `@` that is used to
"seal" a concrete type to a particular interface:

```rust
pub type File = FileDesc@(Read + Write + Seek + Debug);
```

You should read this as "at", meaning that you are viewing a type "at" some
specific bounds.

This definition is roughly equivalent to:

```rust
pub struct File(FileDesc);

impl Read for File {
    // forward to FileDesc's Read impl
}

impl Write for File {
    // forward to FileDesc's Read impl
}

impl Seek for File {
    // forward to FileDesc's Read impl
}

impl Debug for File {
    // forward to FileDesc's Read impl
}
```

However that there is a *scope* in which the equivalence `File = FileDesc` is
known. Within that scope ("inside the abstraction boundary"), `File` is a simple
type alias for `FileDesc`. Outside that scope, `File` is an opaque type that is
only known to implement the four traits given. This is akin to what you get with
privacy, except that you don't have to explicitly project using `.0` or
construct using `File(SomeFileDesc)`.

The obvious scoping rules for the abstraction would be the current privacy rules
(i.e., literally the same as what you get with a newtype).

There are some tricky questions here that need to be answered in a complete
design, which I don't try to answer here:

- Aside from `type` definitions, where else can `@` be used? We'll explore one
  other location -- function signatures -- in this post, but `struct`/`enum`
  definitions are another interesting possibility.

- How should these type definitions interact with coherence? Can you implement
  traits for `File`? Inherent methods? What if they conflict with traits/methods
  on `FileDesc`?

- How do you deal with bounds where the type isn't in `Self` position? For
  example, there is also an impl of `Read` and `Write` for `&File` that should
  be exported.

- What are the rules for equality around these types?

For now, I want to focus on the original motivation: avoiding having to fully
name a type, while providing an interface to it.

### Integrating return type inference

The other part of the `@` proposal is that, when used in function signatures,
you can leave off the type before the `@` (i.e., the concrete type being
abstracted):

```rust
fn foo() -> @Iterator<Item = u8> {
    (1..10u8).rev().skip(2)
}
```

Unlike the `~` proposal above, *this hides everything about the return type
except for the stated trait bound*. So clients here don't know that the iterator
is also `Clone`.

### Scaling up: marker and conditional traits

To make this kind of "sealing" work, we'd have to deal with two additional
thorny problems: marker traits and conditional traits.

Marker traits like `Send` and `Sync` are often "defaulted" (via `..` impls, AKA
OIBITs). When you follow the newtype pattern, these "defaulted" traits come
along for the ride, whether you ask for them or not -- they leak through. They
are also often conditional (e.g., one type is `Send` if some other types are
`Send`). It's probably simplest to say that `@` has newtype-like semantics and
marker traits leak through. (Leaking is also important because OIBIT-style
traits can be defined in downstream crates about which you have no knowledge.)

Leaking, of course, makes `@Trait` and `Box<Trait>` different forms of type
abstraction, but OIBITs are a huge pain point for trait objects today, so that's
likely a worthwhile difference.

A more difficult issue is truly conditional traits, like:

```rust
impl<T: Clone> Clone for Vec<T> { ... }
```

To deal with this situation, we'd need conditional bounds like:

```rust
@(Iterator<Item = T> +
  I: Clone => Self: Clone +
  I: DoubleEndedIterator => Self: DoubleEndedIterator)
```

That's, obviously, pretty verbose. Fortunately, in many cases there are groups
of conditional bounds that tend to go together (see the iterator adapters, for
example). You could imagine capturing these groups into aliases, so that you
could say something like:

```rust
trait IterAdapter<T, I> = Iterator<Item = T> +
  I: Clone => Self: Clone +
  I: DoubleEndedIterator => Self: DoubleEndedIterator;

... @IterAdapter<T, I>
```

These aliases still have documentation advantages over the current adapter API,
since you'd reuse the same alias over and over. By contrast, today each adapter
introduces a separate newtype which must be examined separately to find its API.

### Benefits/drawbacks

So in all, it seems feasible to introduce a type abstraction feature, `@`, along
with an elided form for function signatures, and have reasonably concise
signatures.

Some benefits:

- The design feels a bit more "principled" than the pure type inference design:
  except for OIBIT traits, the entire interface to a type must be written
  explicitly, so there's no accidental leakage and everything is fully
  documented.

- The use in `type` gives a lighter weight form of newtypes that doesn't require
  manually forwarding trait impls (akin to "generalized newtype deriving" from
  the Haskell world). However, these types would likely not function as complete
  newtypes from the perspective of impl coherence -- it probably doesn't make
  sense to impl new traits for them, for example. So they don't solve the whole
  problem.

Some drawbacks:

- Complexity. This variant is *way* more complicated than pure type
  inference. And it's not clear that type abstraction is a feature that Rust
  really needs, given that we already have privacy and the newtype pattern. We
  could provide "newtype deriving" in a much simpler way to address the pain
  points there.

- Verbosity. Even with aliases, the signatures involve here tend to be much more
  complicated. Of course, that's part of the point: this proposal is trying to
  be explicit about signatures.

- A somewhat deeper change. This proposal means, for example, that `type` can no
  longer be understood as a straight-up alias, since repeated uses of `@` create
  *distinct* abstract types.

## Wrapup

We absolutely need to expand Rust in this area; I stand by the design
constraints listed here. But we managed to ship a relatively slim Rust 1.0, and
I'd like to fight to keep the language as small and concise as we can manage.

In that light, I'm leaning somewhat toward return type inference here, despite
its break from full signature explicitness. But I remain concerned about the
fact that the bound is not actually all that meaningful.
