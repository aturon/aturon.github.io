---
layout: post
title:  "Revisiting Rust’s modules, part 2"
---

It's been a week since my [last post] on Rust's module system. Unsurprisingly,
the strawman proposal in that post garnered a lot of commentary--174 comments in
one week!--with sentiments ranging from

> Now *this* is a proposal I can get behind

to

> I've rarely hated anything as much as I hate the module system proposal

and everything in between :-)

The [discussion] has raised a number of very interesting points; thanks to
everyone who has participated so far!. I won't try to give a comprehensive
summary here. What I want to do instead is focus on one particular critique of
the earlier proposal, and present a quite different strawman design that
embraces a different set of priorities.

For ease of discussion:

- I'll call the strawman in my [last post] the "directories-as-modules" proposal.
- I'll call the strawman in this post the "use-universally" proposal.

[last post]: http://aturon.github.io/blog/2017/07/26/revisiting-rusts-modules/
[discussion]: https://internals.rust-lang.org/t/revisiting-rusts-modules/5628/

## A critique of the directories-as-modules proposal

There were a number of concerns about the directories-as-modules proposal
(including its fairly radical nature), but the one that struck me was that the
proposal was very heavily weighted toward a particular subset of the problems
the original post raised, and didn't help much with some of the others.

To recap briefly: the original post talked about obstacles both for learning the
module system, and for using it at scale. It ultimately focused a lot on the
issue of how much we have to employ `pub use` (aka the "facade pattern") when
setting things up today, and I think the proposal clearly streamlines that
story. (There are also variants like "inline" aka "anonymous" modules that bring
in just part of the proposal).

On the other hand, the proposal didn't do much to help with issues around "path
confusion":

> The fact that `use` declarations work with absolute paths while other items do not is confusing, and even experienced Rust programmers (myself included) often confuse the two. To make matters worse, the top-level namespace contains all of the external *crates*, but also the *contents* of the current crate. Unless, of course, you’re writing an external test or binary. And finally, when you’re working at the top level, the absolute/relative distinction doesn’t matter, which means that you can have the wrong mental model and only find it when trying to expand out into submodules.

Many on the thread cited *this* as the core problematic issue with the module
system; I've collected [some data] about confusion around Rust modules which
also supports that to a degree.

[some data]: https://gist.github.com/aturon/2f10f19f084f39330cfe2ee028b2ea0c

My goal in this post is to float a quite different proposal that emphasizes
these issues, de-emphasizes the facading issues, and overall is more
conservative. Similarly to last time, the idea here is to present a coherent,
plausible "spike" with ideas that could be useful, and seek feedback on the
broad direction without getting too bogged down in the fine details.

## One other bit of framing

Before giving the proposal, though, I want to record one other insight I've had
along the way, in terms of where people sometimes go wrong when learning the
module system.

Coming from other languages, there's often an expectation that adding a `.rs`
file to the source tree, or a dependency to `Cargo.toml`, should be all that's
needed to set up the naming hierarchy. From that perspective, you'd expect to be
able to use `use` to pull items out of any of these. Instead, you *sometimes*
can, but need to write the correct incantation (`extern crate` or `mod`) in the
right place first. It requires a shift in mental model. And the fact that `use`
is much more common than `mod` can make this all the more confusing.

@kornel put together a [really great chart comparing module systems] that makes
this point quite strongly.

[really great chart comparing module systems]: https://gist.github.com/pornel/0f7ebcec230117ab52c959fe0b090335

Part of the reason I'm labeling this proposal as "use-universally" is that it
sets up `use` declarations as the *only* thing you need to write in your Rust
source to bring items into scope. The items that are *available*, by contrast,
are determined by Cargo (or another build system), together with your file
system. This is one aspect that mirrors the earlier proposal, part of which is
now [an RFC](https://github.com/rust-lang/rfcs/pull/2088).

## The basic ingredients

Here's a quick summary of the proposal:

- Start with today's module system.
- Deprecate `extern crate`, along the lines of
  the [in-progress RFC](https://github.com/rust-lang/rfcs/pull/2088).
- Deprecate `mod foo;` and instead determine module structure from the file system.
  - However, unlike the previous proposal, this determination is the same as
    today, i.e. files are modules, and directories are used to introduce nested
    modules.
- Improve `use` for greater clarity around paths, which I'll explain below.
- Modules are `pub(crate)` unless they are `pub use`d (so `pub mod foo;` becomes
  `pub use foo;` -- note that this is using *relative* paths, as I'll explain next).

The meat is in making two adjustments for `use` declarations:

1. Introduce a `from <crate_name> use <path>;` form for importing items from
   external crates.
2. Change `use <path>;` to treat the path as *relative to the current module*
   (i.e. as if it started with `self::`).
   - A leading `::` takes you to the root *of the current crate*, but is *not* a
     way to reference items from other crates.

(Similar adjustments are needed for referencing paths in function signatures
etc., which I'll elide here.)

This is, of course, a breaking change. However, it has some properties that make
it a reasonable fit for the [checkpoint] model:

- It's trivial to write a `rustfix` tool that mechanically switches today's
  `use` declarations to this new setup, and likewise deals with `mod` and
  `extern crate`.
- We could introduce and stabilize the `from/use` syntax, then deprecate use of
  absolute paths in `use` (without a leading `::`), and employ `rustfix` at that
  point -- all before a new checkpoint is needed.

Of course, the full migration story needs to be significantly fleshed out, but
this is just meant to sketch plausibility.

[checkpoint]: https://github.com/rust-lang/rfcs/pull/2052

### What does it look like?

Before talking about the rationale, I want to show an example for
clarity. First, the parts that don't change.

Here's a `Cargo.toml` excerpt:

```toml
[dependencies]
petgraph = "0.4.5"
```

A directory structure excerpt:

```
src/
  lib.rs
  coherence/
    mod.rs
    solve.rs
```

#### Code in today's module system

In `lib.rs`:

```rust
extern crate petgraph;
pub mod coherence;
```

In `mod.rs`:

```rust
use petgraph::prelude::*;

use errors::Result;
use ir::{Program, ItemId};

mod solve;

pub use self::solve::Solver;
```

In `solve.rs`:

```rust
use std::sync::Arc;
use itertools::Itertools;

use errors::*;
use ir::*;
```

#### Code in the proposed system:

In `lib.rs`:

```rust
pub use coherence; // note relative path; this makes `coherence` pub
```

In `mod.rs`:

```rust
from petgraph use prelude::*;

use ::errors::Result;
use ::ir::{Program, ItemId};

pub use solve::Solver; // note use of relative path
```

In `solve.rs`:

```rust
from std use sync::Arc;
from itertools use Itertools;

use ::errors::*;
use ::ir::*;
```

### Rationale

Each piece of this proposal has a rationale, but in some cases they're tied
together:

- **Introducing `from`/`use`**. This form provides a much more clear distinction
  between imports from external crates and those from the local crate, which can
  be helpful when exploring a codebase. Splitting out this form also means we
  eliminate the very confusing issue that extern crates are "mounted" in the
  current crate's module hierarchy, usually at root. (In this analogy, the
  `from` form is more like addressing an entirely separate volume.)
  Incidentally, grepping for this declaration will tell you which external
  crates are in use.

- **Changing `use` to take paths relative to the current module**. There are two
  main reasons to do this.

  - If submodules are always in scope for their parent module, things like
  function signatures *feel* like they are taking relative paths. (In actuality,
  they are resolving names based on what's in scope). In any case, making paths
  everywhere relative to the current module reduces confusion.

  - We want to use `pub use` to export submodules publicly, but with absolute
    paths this would be `pub use self::my_submodule` which is awkward and
    confusing; people are almost certain to forget `self` much of the time.

  - Note that there are often arguments that `use`-like mechanisms should employ
    absolute paths by default because that's the common case. However, for Rust
    I think that's at least partly based on the current use for pulling in items
    from external crates, and would be more evenly split in this new setup.

- **Using `pub use` for exporting modules**. If the module hierarchy is
  determined from the file system, we need *some* way to say whether a module is
  public. While we could say this in the module itself, doing so is
  syntactically awkward, and also means that a module's exports are spread over
  multiple files. At the same time, `pub use` still exists as a form you need to
  use for re-exporting items, and it provides a reasonable mental model when using
  it to export your child module.

- **The general privacy setup**. A basic premise is that the visibility of a
  module *name* is not terribly important by itself; what really matters is the
  visibility of *items* within the module. Thus we simplify matters by making
  *all* modules have at least crate visibility---though this does mean that
  marking an item `pub` in a module means it, in reality, has *at least*
  `pub(crate)` visibility (and perhaps more, if it's exported in a public
  module). This is arguably a good thing; today, the fact that you can write
  `pub` but the *actual* visibility is determined by a complex nest of
  re-exports and module visibilities can make it quite hard to reason about
  unfamiliar code. As has been argued on thread, the vast majority of the time
  you only need visibility at one of three levels: the current module, the
  crate, or the world. This proposal makes those cases all easy to express, and
  requires a more explicit `pub(super)` etc to get other privacy granularities.

  - TL;DR: writing `pub` on an item means `pub(crate)` unless (re)exported in a
    public module (which itself is done via re-exporting).

- **Deprecating `mod`/`extern crate`**. This was already explained
  above. There's already been some discussion around the downsides (and ways to
  mitigate them), so I'm not going to spend time on that here.

  - Note, however, that one of the alternatives below may help further mitigate
    these concerns.

## Alternatives

This design pulls together choices I believe cohere well, but there are many
possible variations that are also quite plausible. These can be broken down into
*largely* orthogonal knobs. I'll take a brief look at each, and the tradeoffs as
I see them.

### Knob: `from`/`use` ordering

The `from`/`use` syntax follows precedent from Python, but we could instead use the
`use`/`from` ordering from JS.

Possible benefits of `use`/`from`:

- Makes it easier to read at a glance, when the item name makes obvious what the
  crate is.
- Avoids "jagged edges" of imported names.
- Arguably more "natural" reading (as a sentence).

Possible benefits of `from`/`use`:

- More natural for autocomplete in Ides.
- Gives you the crate name first when reading left-to-right (better if you often
  need that information to understand the import)

It's interesting to consider the choices when it comes to multi-line imports:

```rust
from std use {
    io::{self, Read, Write},
    collections::{HashMap, HashSet},
    rc::Rc,
};

// versus
use {
    io::{self, Read, Write},
    collections::{HashMap, HashSet},
    rc::Rc,
} from std;
```

There are of course plenty of other possible syntactic choices, but these are
relatively intuitive and descend from very commonly-used languages.

### Knob: `pub use foo` vs `pub mod foo`

Rather than using re-exports to make a module public, we could say that the file
system determines module structure, but you use `pub mod foo;` to make a child
module `foo` public.

The main advantage would be that it's more plausible to continue to make `use`
take absolute paths, which reduces breakage. On the other hand, it seems to
double down on some aspects of "path confusion", and doesn't achieve the
unification around `use` that the main proposal does.

### Knob: absolute vs relative paths

We could keep other elements of this proposal, but have `use` continue to use
absolute paths. (We could then, for example, only allow you to reference
external crates that were brought in through `extern crate` in `use`, but ones
implied from `Cargo.toml` would go through `from`/`use`, potentially making the
whole system backwards compatible).

If we go that route, then to make a module public we'd most likely wind up with
one of the following:

- `pub use self::my_submodule;`
- `pub mod my_submodule;`

And again, as above, some path confusion issues remain.

### Knob: include on `use`

Rather than determining the module hierarchy from the file system immediately,
we could follow many other languages which add modules to the name hierarchy
only if they are in some way referenced (e.g. via `use`); only at that point
would we examine the file system for resolution.

Such an approach makes the Rust source somewhat more independent of the precise
state of the file system, and may thereby address some of the concerns people
have raised about previous proposals.

A downside, though: sometimes modules contain nothing but `impl` blocks, in
which case they are not naturally referenced elsewhere. You'd have to explicitly
`use` such modules, and forgetting to do so could lead to some head-scratching
errors. (That said, we could generate a warning if the directory contains unused
`.rs` files).

### Knob: `use`ing submodules

The proposal assumes that submodules are *always* in scope for their parents. We
could instead require you to `use` them before referring to them. I can't see a
lot of advantage to doing that, though.

## Extensions

Finally, while the proposal as-is only marginally helps with facades (by
removing the need for `self::` that's currently common when facading), it's
compatible with future extensions that do more.

For example, we could draw from earlier proposals involving "anonymous modules"
(aka "inline modules") -- say, files beginning with a leading `_` -- which do
not affect the module hierarchy, and where all non-private items are
automatically re-exported by the parent module. This has some of the flavor of
the previous proposal, but with a more opt-in form.

## Wrapping up

Just like last time around, please take this proposal as charting out one more
plausible point in the design space, and see whether there are big-picture
aspects to like or dislike, or ideas that might have promise. I'm looking
forward to your feedback!
