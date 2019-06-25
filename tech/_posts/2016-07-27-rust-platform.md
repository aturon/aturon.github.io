---
layout: post
title:  "The Rust Platform"
---

A programming language is much more than its compiler and standard library. It's
a community. Tools. Documentation. An ecosystem. All of these elements affect
how a language feels, its productivity, and its applicability.

Rust is a very young language --
[barely a year past 1.0](https://blog.rust-lang.org/2016/05/16/rust-at-one-year.html)
-- and building out and maturing the full complement of ecosystem and tooling is
crucial to its success. That building is happening, but sometimes at an
explosive rate that makes it hard to track what's going on, to find the right
library for a task, or to choose between several options that show up on a
[crates.io](https://crates.io/) search. It can be hard to coordinate versions of
important libraries that all work well together. We also lack tools to push toward
maturity in a community-wide way, or to incentivize work toward a common
quality standard.

On the other hand, the core parts of Rust get a *tremendous* amount of
focus. But we have tended to be pretty conservative in what is considered
"core": today, essentially it's `rustc`, `cargo`, `libstd`/`libcore`, and a
couple of other crates. The standard library also takes a deliberately
minimalistic approach, to avoid the well-known pitfalls of large standard
libraries that are versioned with the compiler and quickly stagnate, while the
real action happens in the broader ecosystem ("`std` is where code goes to die").

**In short, there are batteries out there, but we're failing to include them** (or
even tell you where to shop for them).

Can we provide a "batteries included" experience for Rust that doesn't lead to
stagnation, one that instead works directly with and through the ecosystem,
focusing attention, driving compatibility, and reaching for maturity?

I think we can, and I want to lay out a plan that's emerged after discussion
with many on the core and subteams.

## What is "The Rust Platform"?

> I want to say right off the bat that the ideas here draw significant inspiration
> from the [Haskell Platform](https://en.wikipedia.org/wiki/Haskell_Platform),
> which is working toward similar goals for Haskell.

The basic idea of the Rust Platform is simple:

- Distribute a wide range of artifacts in a single "Rust Platform Package", including:
  - The compiler, Cargo, rust-lang crates (e.g. `std`, `libc`), docs
  - Libraries drawn from the wider ecosystem (going beyond rust-lang crates)
  - Tools drawn from the wider ecosystem (e.g. `rustfmt`,
    [NDKs](https://blog.rust-lang.org/2016/05/13/rustup.html), editor plugins,
    lints)
  - [Cross-compilation targets](https://blog.rust-lang.org/2016/05/13/rustup.html)

- Periodically curate the ecosystem, determining consensus choices for what
  artifacts, and at what versions, to distribute.

In general, [rustup](https://blog.rust-lang.org/2016/05/13/rustup.html) is
intended to be the primary mechanism for distribution; it's expected that it
will soon replace the guts of our official installers, becoming the primary way
to acquire Rust and related artifacts.

As you'd expect, the real meat here is in the details. It's probably unclear
what it even means to "distribute" a library, given Cargo's approach to
dependency management. Read on!

## Library mechanics

### Cargo metapackages

The most novel part of the proposal is the idea of curating and distributing
crates. **The goal is to provide an experience that feels much like `std`, but
provides much greater agility, avoiding the typical pitfalls of large standard
libraries.**

The key to making sense of library "packaging" for Rust is the idea of a
*metapackage* for Cargo, which aggregates together a number of library
dependencies as a single name and version. Concretely, this would look like:

```toml
[dependencies]
rust-platform = "2.7"
```

which is effectively then shorthand for something like:

```toml
[dependencies]
mio = "1.2"
regex = "2.0"
log = "1.1"
serde = "3.0"
```

Meta packages give technical meaning to curation: we can provide assurance that
the crates within a metapackage will all play well together, at the versions
stated.

With the platform metapackage, we can talk coherently about the "Rust Platform
2.0 Series" as a chapter in Rust's evolution. After all, core libraries play a
major role in shaping the idioms of a language at a given point of time.
Evolution in these core libraries can have an effect on the experience of the
language rivaling changes to the language itself.

With those basics out of the way, let's look at the ways that the platform is,
and is not, like a bigger `std`.

### Stability without stagnation

The fact that `std` is effectively coupled with `rustc` means that upgrading the
compiler entails upgrading the standard library, like it or not. That means that
the two need to provide essentially the same
[backwards-compatibility guarantees](http://blog.rust-lang.org/2014/10/30/Stability.html). TL;DR,
it's simply not feasible to do a new, major version of `std` with breaking
changes. Moreover, `std` is forcibly tied to the Rust release schedule, meaning
that new versions arrive every six weeks, period. Given these constraints, we've
chosen to take a minimalist route with `std`, to avoid accumulating a mass of
deprecated APIs over time.

With the platform metapackage, things are quite different. On the one hand, we
can provide an experience that *feels* a lot like `std` (see below for more on
that). But it doesn't suffer from the deficits of `std`. Why? It all comes down
to versioning:

- **Stability**: Doing a `rustup` to the latest platform will never break your
  existing code, for one simple reason: existing `Cargo.toml` files will be
  pinned to a prior version of the platform metapackage, which is fundamentally
  just a collection of normal dependencies. So you can upgrade the compiler and
  toolchain, but be using an old version of the platform metapackage in perpetuity.
  In short, the metapackage version is *orthogonal* to the toolchain version.

- **Without stagnation**: Because of the versioning orthogonality, we can be
  more free to make breaking changes to the platform libraries. That could come
  in the form of upgrading to a new major version of one of the platform crates,
  or even dropping a crate altogether. These changes are never *forced* on users.

But we can do even better. In practice, while code will continue working with an
old metapackage version, people are going to want to upgrade. We can smooth that
process by allowing metapackage dependencies to be *overridden* if they appear
explicitly in the `Cargo.toml` file. So, for example, if you say:

```toml
[dependencies]
rust-platform = "2.7"
regex = "3.0"
```

you're getting the versions stipulated by platform 2.7 in general, but
specifying a different version of `regex`.

There are lots of uses for this kind of override. It can allow you to track
progress of a given platform library more aggressively (not just every six
weeks), or to try out a new, experimental major version. Or you can use it to
*downgrade* a dependency where you can otherwise transition to a new version of
the platform.

### Approaching `std` ergonomics

There are several steps we can take, above and beyond the idea of a metapackage,
to make the experience of using the Rust Platform libraries approximate using
`std` itself.

- **`cargo new`**. A simple step: have `cargo new` automatically insert a
  dependency on the current toolchain's version of the platform.

- **Global coherence**. When we assemble a version of the platform, we can do
  integration testing against the whole thing, making sure that the libraries
  not only compile together, but *work* together. Moreover, libraries in the
  platform can assume the inclusion of other libraries in the platform, meaning
  that example code and documentation can cross-reference between libraries,
  with the precise APIs that will be shipped.

- **Precompilation**. If we implement metapackages naively, then the first time
  you compile something that depends on the platform, you're going to be
  compiling some large number of crates that you're not yet using. There are a
  few ways we could solve this, but certainly one option would be to provide
  binary distribution of the libraries through `rustup` -- much like we already
  do for `std`.

- **No `extern crate`**. Getting a bit more aggressive, we might drop the need
  for `extern crate` when using platform crates, giving a truly `std`-like
  feel. (In general, `extern crate` is already redundant with `Cargo.toml` for
  most use cases, so we might want to take this step broadly, anyway.)

## Versioning and release cadence

I've already alluded to "major versions" of the platform in a few senses. Here's
what I'm thinking in more detail:

First off, `rustc` itself is separately versioned. Conceivably, the Rust
Platform 5.0 ships with `rustc` 1.89. In other words, **a new major version of
the platform does *not* imply breaking changes to the language or standard
library**. As discussed above, the metapackage approach makes it possible to
release new major versions without forcibly breaking any existing code; people
can upgrade their platform dependency orthogonally from the compiler, at their
own pace, in a fine-grained way.

With that out of the way, here's a plausible versioning scheme and cadence:

- A new **minor version** of the platform is released every six weeks,
  essentially subsuming the existing release process. New minor releases should
  only include minor version upgrades of libraries and tools (or expansions to
  include new libs/tools).

- A new **major version** of the platform is released roughly every 18-24
  months. This is the opportunity to move to new major versions of platform
  libraries or to drop existing libraries. It also gives us a way to recognize
  major shifts in the way you write Rust code, for example by moving to a new
  set of libraries that depend on a major new language feature (say,
  specialization or HKT).

More broadly, I see major version releases as a way to lay out a *narrative arc*
for Rust, recognizing major new chapters in its development. That's helpful
internally, because it provides medium-term focus toward shipping The Next
Iteration of Rust, which we as a community can rally around. It's also helpful
externally, because people less immediately involved in Rust's development will
have a much easier way to understand the accumulation of major changes that make
up each major release. These ideas are closely tied to the recent
[Roadmap proposal](http://aturon.github.io/blog/2016/07/05/rfc-refinement/),
providing a clear "north star" toward which quarterly plans can head.

## Two-level curation

So far I've focused on artifacts that officially ship as part of the
platform. Curating at that level is going to be a lot of work, and we'll want to
be quite selective about what's included. (For reference, the
[Haskell Platform](https://www.haskell.org/platform/) has about 35 libraries
packaged).

But there are some additional opportunities for curation. What I'd love to see
is a kind of *two-level* scheme. Imagine that, somewhere on the Rust home page,
we have a listing of major areas of libraries and tools. Think: "Parsing",
"Networking", "Serialization", "Debugging". Under each of these categories, we
have a very small number of immediate links to libraries that are part of the
official platform. But we also have a "see more" link that provides a more
comprehensive list.

That leads to two tiers of curation:

- **Tier one**: shown on front page; shipped with the platform; highly curated and reviewed; driven
  by community consensus; integration tested and cross-referenced with the rest
  of the platform.

- **Tier two**: shown in "see more"; lightly curated, according to a clearly
  stated set of objective criteria. Things like: platform compatibility; CI;
  documentation; API conventions; versioned at 1.0 or above.

By providing two tiers, we release some of the pressure around being in the
platform proper, and we provide valuable base-level quality curation and
standardization across the ecosystem. The second tier gives us a way to motivate
the ecosystem toward common quality and consistency goals: anyone is welcome to
get their crate on a "see more" page, but they have to meet a minimum bar
first.

## The `rust-lang` crates

One small note: our previous attempt at a kind of "extended `std`" was the
[rust-lang crates](https://github.com/rust-lang/rfcs/pull/1242) concept. These
crates are "owned" by the Rust community, and governed by the RFC process, much
like `std`. They're also held to similar quality standards.

Ultimately, it's proved pretty heavy weight to require full RFCs and central
control over central crates, and so the set of rust-lang crates has grown
slowly. The platform model is more of a "federated" approach, providing
decentralized ownership and evolution, while periodically trying to pull
together a coherent global story.

However, I expect the rust-lang crates to stick around, and for the set to
slowly grow over time; there is definitely scope for some very important crates
to be completely "owned by the community". These crates would automatically be
part of the platform, having been approved via the RFC process already.

## Open questions

The biggest open question here is: how does curation work? Obviously, it can't
run entirely through the libs team; that doesn't scale, and the team doesn't
have the needed domain expertise anyway.

What I envision is something that fits into the
[Roadmap planning proposal](http://aturon.github.io/blog/2016/07/05/rfc-refinement/). In
a given quarter, we set out as an initiative to curate crates in a few areas --
let's say, networking and parsing. During that quarter, the libs team works
closely with the portion of the community actively working in that space, acting
as API consultants and reviewers, and helping shepherd consensus toward a
reasonable selection. There are a lot of details to sort out, but working in an
incremental way (a sort of quarterly round-robin between areas) seems like a
good balance between focus and coverage. But there are a lot of details to sort out.

It's also not entirely clear what will need to go into each minor
release. Hopefully it can be kept relatively minimal (e.g., with library/tool
maintainers largely driving the version choice for a given minor release).

## Wrap-up

Although the mechanics are not all that earth-shattering, I think that
introducing the Rust Platform could have a massive impact on how the Rust
community works, and on what life as a Rust user feels like. It tells a clear
story about Rust's evolution, and lets us rally around that story as we hammer
out the work needed to bring it to life. I'm eager to hear what you think!
