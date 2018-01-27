---
layout: post
title:  "Revisiting Rust’s modules"
---

As part of the [Ergonomics Initiative](https://blog.rust-lang.org/2017/03/02/lang-ergonomics.html), I, @withoutboats and several others on the Rust language team have been taking a hard look at Rust’s module system; you can see some earlier thoughts [here](https://withoutboats.github.io/blog/rust/2017/01/04/the-rust-module-system-is-too-confusing.html) and discussion [here](https://internals.rust-lang.org/t/lang-team-minutes-the-module-system-and-inverting-the-meaning-of-public/4804/66).

There are two related perspectives for improvement here: learnability and productivity.


- Modules are not a place that Rust was trying to innovate at 1.0, but they are nevertheless often reported as one of the major stumbling blocks to learning Rust. We should fix that.
- Even for seasoned Rustaceans, the module system has several deficiencies, as we’ll dig into below. Ideally, we can solve these problems while *also* making modules easier to learn.

This post is going to explore some of the known problems, give a few insights, and then explore the design space afresh. It does *not* contain a specific favored proposal, but rather a collection of ideas with various tradeoffs.

I want to say at the outset that, for this post, **I’m going to completely ignore backwards-compatibility**. Not for lack of importance, but rather because I think it’s a useful exercise to explore the full design space in an unconstrained way, and then separately to see how best to fit those lessons back into today’s Rust.

## Learnability issues

It’s hard to nail down the precise blockers to learnability, but here are a few of the obstacles we’ve heard repeatedly in feedback from a variety of venues:


- **Too many declaration forms**. Module-related declarations include `extern crate`, `mod foo;`, `use`, `pub use`, `mod { }` and more, and each one has somewhat subtle effects on what is in scope where. For someone just starting out, this array of choices can be bewildering and stand in the way of writing “actual code” to feel out the language.
- **Path confusion**. The fact that `use` declarations work with absolute paths while other items do not is confusing, and even experienced Rust programmers (myself included) often confuse the two. To make matters worse, the top-level namespace contains all of the external *crates*, but also the *contents* of the current crate. Unless, of course, you’re writing an external test or binary. And finally, when you’re working at the top level, the absolute/relative distinction doesn’t matter, which means that you can have the wrong mental model and only find it when trying to expand out into submodules.
- **Filesystem organization**. The `foo.rs` versus `foo/mod.rs` distinction, together with `mod foo;`, can be an intimidating amount of machinery just to incorporate a file into your project.
- **Privacy**. A module’s private items are always visible to its submodules. But private items *within* its submodules aren’t visible to each other. Moreover, it’s an error to expose a private item in a public interface, but it’s common to define public items within a private module and re-export them elsewhere. Learning the ropes of the privacy system is not easy, and even experienced Rust programmers sometimes grate against it.

It can be hard, when more experienced with Rust, to empathize with these concerns—we suffer from the “Curse of Knowledge” here. But it’s important to recognize that all of these distinctions that are hard to learn in the first place also impose a small, but non-trivial mental tax even when you know them well. So the goal is not to make things easier for newcomers *at the expense* of those with more experience, but rather to make things easier for everyone.

## Productivity issues

Once you’ve gotten the hang of the module system, there are still annoyances, ranging in importance from code readability concerns to minor papercuts.


- **Who can see this item? And how?** It’s pretty common to find items within modules that are marked `pub`, but are not in fact visible through the module defining them—or even visible outside the crate at all! This tends to happen when you want to organize code within the file system differently from the API hierarchy you expose to the rest of the crate or to the outside world. It generally means you have to look at several files to figure out how to access an item (or even whether you can).
- `pub use` **abuse**. More generally, re-exports are ubiquitous in idiomatic Rust code. The result is that the “apparent” module hierarchy (as seen from the file system) often tells you very little about the *actual* module hierarchy, as seen from inside or outside the crate. This can make it difficult to jump into a new code base, or back into one you haven’t worked on in a while.
- **Repetition**. The module system often requires two steps to do something, when a single step would suffice to convey all the necessary information:
  - When you add a dependency to `Cargo.toml`, you also need to add an `extern crate` declaration.
  - When you add a new `.rs` file, you also need to write a corresponding `mod` declaration.
  - When you have a file that exists solely for organization and you add a `pub` item to it, you also have to `pub use` that item elsewhere in the hierarchy.

These issues may not seem like a big deal at first, but at least in my experience, after thinking deeply about modules and surfacing these problems, I find myself noticing them *all the time*.

## What is a module system, anyway?

With the critique of today’s module system out of the way, I want to talk a bit about the core concerns of a module system, at least from Rust’s perspective:


- Bringing names into scope, including from external crates
- Defining the crate’s internal namespace hierarchy
- Defining the crate’s external namespace hierarchy
- Determining how code is arranged in the file system
- Visibility (aka privacy)

Things seem to work most smoothly when these concerns are closely aligned. Conversely, the places where the module system becomes hard to work with and reason about tend to be misalignments.

**An example of misalignment: facades in `futures`**

Let’s take a concrete example from the `futures` crate. Futures, like iterators, have a large number of methods that produce “adapters”, i.e. concrete types that are also futures:


```rust
trait Future {
    type Item;
    type Error;
    fn poll(&mut self) -> Poll<Self::Item, Self::Error>;

    fn map<F, U>(self, f: F) -> Map<Self, F>;
    fn then<F, B>(self, f: F) -> Then<Self, B, F>;
    // etc
}
```

Each of these concrete types (`Map`, `Then` and so on) involve a page or so of code, often with some helper functions. Thus, there was a strong desire to define each in a separate file, with the helper functions private to that file.

However, in Rust each file is a distinct module, and it was *not* desirable to have a large number of submodules each defining a single type. So, instead, the `future` module has code like this:

```rust
mod and_then;
mod flatten;
mod flatten_stream;
mod fuse;
mod into_stream;
mod join;
mod map;
mod map_err;
mod from_err;
mod or_else;
mod select;
mod select2;
mod then;
mod either;

pub use self::and_then::AndThen;
pub use self::flatten::Flatten;
pub use self::flatten_stream::FlattenStream;
pub use self::fuse::Fuse;
pub use self::into_stream::IntoStream;
pub use self::join::{Join, Join3, Join4, Join5};
pub use self::map::Map;
pub use self::map_err::MapErr;
pub use self::from_err::FromErr;
pub use self::or_else::OrElse;
pub use self::select::{Select, SelectNext};
pub use self::select2::Select2;
pub use self::then::Then;
pub use self::either::Either;
```

This kind of setup is known generally as the *facade pattern*, and it’s pretty ubiquitous in Rust code.

The facade boilerplate is needed to deal with a misalignment: each adapter is defined in its own file with its own privacy boundary, but we don’t actually want that to entail a distinct *module* for each (in the internal or external namespace hierarchy). That means we have to do two things:


- Make the modules private, despite that they contain public items
- Manually re-export each of the public items at a higher level

When first trying to navigate the `futures` codebase, you have to read the `future` module to understand how its submodules are being used, due to these re-exports. For the `futures` crate, this is a relatively small annoyance. But it can be a real source of confusion for crates that have more of a *mixture* of submodules, some of which are significant for the namespace hierarchy, other of which are hidden away.

Another common confusion: items defined as `pub` within a private module which are not, in fact, exported from the crate, but which may be re-exported in another crate-internal module. In this case, `pub(crate)` would better convey intent, but today’s module system makes `pub` the path of least resistance. That means, in turn, that an item definition alone doesn’t tell you the fully visibility story (though it does give you an *upper bound* on visibility); in general you have to crawl through the rest of the code to figure out where the item is ultimately visible.

**Expressiveness and the common case**

Rust’s module system, through things like the facade pattern, gives you a lot of expressiveness: you’re not forced to keep the various concerns of the module system in alignment, and are thus free to craft the organization that you deem best.

**The concern isn’t so much having this freedom, but rather how often you must wield it**. How often does the facade pattern show up in your code? How often do you use re-exports? How often does the directory structure of your crate bear little resemblance to the intended module hierarchy?

I spent some time [surveying](https://paper.dropbox.com/doc/Module-system-examples-AA2Gj3010ce7XwxHfOAfs) some of the most popular and most respected crates to get a qualitative feel for this question, including: `futures`, `regex`, `rayon`, `log`, `openssl`, `flate2`, `bytes`, `irc`, `clap`, `url`, `serde`, `chalk` , `std` and `chrono`. Virtually every crate had something “unique” about its organization, and almost all of them used the facade pattern somewhere. In general, **it was impossible to predict anything about the public API surface just by looking at the file system organization; you have to trace re-exports**.

In short, in the vast majority of cases the module system necessitated boilerplate and a disconnect between its various concerns, impairing both write- and read-ability.

## Increasing alignment

The question I want to pose now is: can we make the module system work more smoothly for the common case, decreasing boilerplate and increasing predictability/readability? This is a more narrow question than “how do we lower the learning curve”, but I believe that a good answer will help learnability as well.

A basic strategy is to try to make the various uses of facades more “first class”, i.e. expressed in a more explicit and clear way, rather than encoded via a particular pattern of usage. Let’s take a deeper look at the ways in which facades are commonly used in the examples mentioned above:


- **To allow breaking code into files**, with file-private definitions. This is the `futures` example discussed above: you’re forced to create submodules in order to split things into files, but you try to “hide” the submodules as much as possible using a facade, and other than the facade definition you never refer to them by name.
- **To allow for `cfg`-specific implementations**. For example, the standard library uses a facade-like pattern to have two side-by-side implementation of its core system primitives, for `cfg(unix)` and `cfg(windows)`. This is set up so that there is no visible impact on the module hierarchy, but there *is* an impact on the filesystem hierarchy.
- **For crate-internal organization**, where you *do* want a module hierarchy (for privacy or namespacing purposes), but you don’t want to reveal it to the outside world (or, in some cases, even to other modules in the crate).

How can we make these use cases more explicit, clear, and streamlined?

## Proposal: directories determine modules

The central idea in this post is to **make intent more explicit in the file system** than we do today, while streamlining common facade patterns. Here’s one way we might do it:


- Deprecate `mod foo;` declarations, instead determining module directly from directory structure.
- Directories (not files!) determine the module hierarchy.
  - A directory with a leading `_` gives you a `pub(crate)` module.
  - All other directories give you `pub` modules.
- The `.rs` files in a directory *collectively* determine the contents of the corresponding module.
  - Private items are private *to the file in which they are defined.*
  - Items with `pub(self)` or greater visibility are, in particular, visible to sibling files that are part of the module’s definition.

**A basic example**
Let’s start with an example just showing the mechanics. First, the directory structure:

```
src/
  foo/
    these.rs
    names.rs
    do_not_matter.rs
    _infer/
      instantiate.rs
      unify.rs
  bar/
    mod.rs // this is fine, but has no special status
    impls.rs
    tests.rs
  baz.rs
```

From the directory structure alone, we know the precise module structure (modulo any inline modules; more on that later):

```rust
pub mod foo {
  /* scoped contents of `these.rs`, `names.rs`, `do_not_matter.rs` */

  pub(crate) mod infer {
    /* scoped contents of `instantiate.rs` and `unify.rs` */
  }
}

pub mod bar {
  /* scoped contents of `mod.rs`, `impls.rs` and `tests.rs` */
}

/* scoped contents of `baz.rs` */
```

What do I mean by “scoped contents”? To reiterate from above, fully private definitions are private *to that file*, while `pub(self)` means private to the current module. To illustrate, imagine we have the following for `instantiate.rs`:

```rust
// private to this file
struct Instantiator { ... }
fn some_helper() { ... }

// private to this module, i.e. visible to all files within `_infer`, i.e.
// `instantiate.rs` and `unify.rs`
pub(self) fn instantiate<T: Fold>(table: &mut InfTable, arg: &T) { ... }
```

and then, in `unify.rs`:

```rust
// private to this file
struct Unifier<'a> { ... }

// note: this private definition does *not* clash with the private definition
// in `instantiate.rs`
fn some_helper() { ... }

// visible to the whole crate at `foo::infer::UnificationResult`
pub(crate) struct UnificationResult { ... }

pub(crate) fn unify<T: Zip>(table: &mut InfTable, a: &T, b: &T) -> UnificationResult {
  /* may invoke `instantiate` */
}
```

Thus, visibility annotations give you fine-grained control ranging from current file (private) to world-public (`pub`) and every module in the hierarchy in between.

**Breaking code into files without module structure: the futures example**

Having seen the basics, let’s put this proposal to use in expressing the futures example described above:

    src/
      future/
        mod.rs
        and_then.rs
        flatten.rs
        fuse.rs
        // etc

These files would have exactly the same contents as today, except that we would be able to delete most of `mod.rs`. That is, none of the following boilerplate is needed:

```rust
// these can go!
mod and_then;
mod flatten;
mod fuse;
// etc

// these too!
pub use self::and_then::AndThen;
pub use self::flatten::Flatten;
pub use self::fuse::Fuse;
// etc
```

Thus, this proposal works particularly smoothly when you want to break a module into multiple files, with potentially file-private items—because that’s exactly how modules work in the proposal! No facade necessary, and the intended (flat) module structure is made clear and explicit via the file system structure.

**Platform-specific implementations**

What if you want to provide distinct implementations by platform? Again, you no longer need a facade:


    src/
      foo/
        unix.rs
        windows.rs

Where `unix.rs` starts with `#![cfg(unix)]` and similarly for windows. Both files are considered part of the `foo` module’s definition, but depending on the platform one of the files will appear to be empty. (Today this pattern is implemented using submodules tagged with `cfg`, together with re-exports.)

**Internal module structure**

The final mis-alignment was cases where you want a module hierarchy internally, but want to expose some collapsed version of it externally. This is the one place where you still need to use `pub(use)`:


    // excerpted from `clap`

    src/
      _app/
        help.rs
        macros.rs
        mod.rs
        parser.rs
        usage.rs
      _args/
        arg.rs
        arg_matcher.rs
        arg_matches.rs
        macros.rs
        settings.rs
      errors.rs
      fmt.rs
      suggestions.rs
      lib.rs

This directory structure is excepted from `clap`, which currently has `app` and `args` subdirectories but does not export any submodules; these modules are used purely for internal organization and namespacing.

In `_app/mod.rs` you might have a definition like:

```rust
// note that this is `pub`!
pub struct App<'a, 'b> { ... }
```

The reader can immediately see something interesting happening: this item is defined within an “internal” (`pub(crate)`) module, since `_app` begins with an underscore. But it has a *larger*, world-public visibility. This is an indication that the item will be re-exported somewhere else (and in fact, we could lint against this *not* being the case).

Accordingly, in `lib.rs`, we might have:

```rust
pub use app::App;
```

In short, re-exports are still needed, but the directory structure and item visibility give the reader a strong, localized indication of what’s going on.

**Fine details**

I’m glossing over a *lot* of fine details here, including:

- How do you provide module docs? One appealing possibility: via a `README.md` file, which would have several benefits — most importantly, moving the often very large module-level docs out of band.
- Similarly, what’s the story for module-level attributes in general?
- What about inline modules?
- Backward-compatibility concerns?
- And many more.

For the moment, I’m going to ask that we avoid getting bogged down in these questions (which are ultimately important), so that we can focus first on whether the *broad* direction here is a good one.

**Tradeoffs**

Speaking of evaluation: there are some tradeoffs we can see even at this level of detail.

*Primary Upsides:*

- Learning the basics of the module system is really easy: each directory defines a module name in the module hierarchy; the `.rs` files within that directory collectively define the contents of that module. The end.
- The file system organization gives you a very clear, explicit view into the module structure and programmer intent. Compared to dropping into a random crate’s source code today (an exercise I [performed repeatedly](https://paper.dropbox.com/doc/Module-system-examples-AA2Gj3010ce7XwxHfOAfs)), I believe this approach will make it much easier to understand a crate’s overall structure with a quick run of `tree`.
- Fewer imports are needed, because module-visible items defined in sibling files are automatically in scope (but see the downside below).
- Most of the common uses of facades (breaking into files/privacy boundaries, platform-specific modules) no longer require any facading, or indeed any boilerplate at all.
- Cases where you want some crate-internal module namespacing are expressed in a natural, obvious way (via the `_` prefix), and one that makes it easier for readers to see that a given item will be re-exported elsewhere.

*Primary downsides:*

- Bringing module-visible items into scope from sibling files means that one may have to search in multiple files to discover the definition of some item. In contrast, today every item you can mention in a file is brought into scope somewhere in *that* file—assuming you don’t use globs.
  - On the other hand, this proposal eliminates boilerplate `use` declarations for definitions that are conceptually part of the same module. And in particular, the fact that such declarations would often be relative (e.g. `use self::item;`) may help mitigate confusion around the absolute/relative path issue.
  - A variant of this proposal would not bring these items into scope by default, but instead allow you to do so via `use self::item;` However, having to use `self` here is awkward, and the definition is not helpful—it only serves to tell you that another file in the directory defines `item`, which is something you can already determine if the binding isn’t located in the current file. (In contrast, today the required import also gives you a hint as to which file to look at).
- Determining module structure from file system structure is problematic for some, due either to stashing stray `.rs` files in the project directory, or due to potentially laggy network file access.
  - If this proves to be a problem in practice, we could provide an optional way to specify the desired file list. But in the vast majority of cases today the file system and module hierarchy are aligned.
  - Some have also argued that leveraging the file system is too “implicit”, but I don’t think that argument holds water; the file system arrangement itself is a perfectly “explicit” way of providing information, and there’s no particular reason to distinguish that from `mod` statements in code. I rather see it as the current setup forcing repetition of information. (I would also [urge](https://blog.rust-lang.org/2017/03/02/lang-ergonomics.html) a focus on concrete instances of *reasoning about code* in judging this kind of question.)

## Wrapping up

There’s a *lot* more to say about modules, and this proposal is just one variant of probably a dozen that the language team has been exploring. But I wanted to take the time to at least spike out one plausible option, and see what people think. As I asked above: I strongly urge people to focus only on the big-picture question of whether this avenue is appealing *at all*, and not get too bogged down in finer details until later in the process.

**A bit of editorializing**

What I like about this proposal is that it’s *dirt simple*: the correspondence between file system and module hierarchies is very easy to describe, and today’s patterns fall out naturally, usually with significant boilerplate reduction. I think there’s a very real chance that, with this proposal, people will view Rust’s module system as easy to learn. Finally, and most subjectively, compared to some of the other ideas we’ve been exploring, there’s a certain *elegance* to this set up; nothing feels bolted on, and the examples drawn from real-world code have a quite pleasing expression.

I do worry about the sibling scoping question. I know I, for one, often track down bindings by searching purely within the current file. With this proposal, I’d have to change that workflow to `grep`ing within the current directory, or using tags more consistently, etc. Yet, I suspect that in the end, these other workflows are an *improvement —* e.g., tags allow a more direct jump to definition regardless of where that definition lives, whereas my current workflow often requires following a chain of imports.

In any case, I think this potential workflow shift is more than made up for by the greater clarity about module structure, which makes it much easier to find your way around a project in the first place.
