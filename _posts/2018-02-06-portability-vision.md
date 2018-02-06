---
layout: post
title:  "A vision for portability in Rust"
---

**TL;DR**: This post proposes to deprecate the `std` facade, instead having a
unified `std` that uses target- and capability-based `cfg`s to control API
availability.

Portability is extremely important for Rust, in two distinct (and sometimes
competing!) ways:

- Rust should be usable in almost any environment, and ideally much of the
  ecosystem would be as well.

- Rust should be low-friction when writing for "mainstream" platforms (32- and
  64-bit machines running Windows, Linux, or macOS).

An example of the tension between these two goals is handling allocation:

- Some targets for Rust do not support allocation natively, so Rust must at
  least have a "mode" in which no allocation is assumed.

- For "mainstream" applications and platforms, we want to assume not only that
  allocation is available, but that running out of memory is a catastrophic
  failure. Those assumptions are reasonable for a huge amount of software, and
  making them greatly reduces the friction to writing Rust code.

We've been slowly evolving a *set* of answers to this kind of question, and part
of the point of this blog post is to step back and try to give a unifying vision
for how to approach portability issues in Rust.

But first, let's take stock of where we are today.

## The status quo

### The facade

Rust's standard library is actually made up of three "rings" of increasing
assumptions:

- `core`: assume "nothing" about the target platform.
- `alloc`: assume that allocation is available.
- `std`: assume that "mainstream" OS facilities are available.

In particular, `std` is partly a ["facade" crate] that re-exports almost all of
the functionality from `core` and `alloc`. This factoring allows crates that
target `core` to be seamlessly used with crates that target `std`, and led to
the [`no_std` flag]. So far, only [`core`] and `std` are stable.

["facade" crate]: https://github.com/rust-lang/rfcs/pull/40
[`no_std` flag]: https://github.com/rust-lang/rfcs/pull/1184
[`core`]: https://github.com/rust-lang/rust/issues/27701

#### Problems with the facade

While the three-layer division may *seem* very clean, in practice things turn
out to be far more complicated:

- `core` does not in fact assume "nothing": some core types like `i128` and
  `AtomicU8` are available within `core`, but not available on all platforms
  Rust targets. Thus, on some of these platforms, these definitions are simply
  *missing* (i.e. have `cfg` applied).

- For non-mainstream OSes, often only a portion of `std` functionality is
  available. The remaining pieces are either `cfg`-ed out, return errors, or
  panic if you try to use them.

- Because the crates are separated, there are some trait coherence issues, which
  `std` uses special magic to overcome.

- Libraries have to specifically opt in to `no_std` and rewrite to use `core`
  rather than `std`. While it's relatively rare for a library to just happen to
  be `no_std` compatible, it's still a bit of a papercut.

The root issue here is that the three-layer arrangement is based on a particular
division of environment capabilities, and that reality is not so simple.

### Environment-specific extensions

Today we provide access to low-level or OS-specific services via the `std::os`
module. APIs in this module are largely traits that extend the cross-platform
APIs, and in particular can expose their OS-level representation. The fact that
these APIs require explicitly importing from `std::os` provides a small "speed
bump" for venturing out of guaranteed mainstream platform portability.

#### Problems with environment-specific extensions

- The `std::os` module has submodules that correspond to a hierarchy of OS
  types. Butit's not at all clear how to use the module hierarchy to organize
  features like [fixed-size atomic types][more-atomics], where the types
  available vary in a fine-grained way based on the CPU family; [SIMD] is even
  worse. And even the OS story is ultimately not such a simple hierarchy.

- The "speed bump" for using `std::os` is minimal and easy to miss; it's just an
  import that looks the same as any other.

- Platform-specific APIs don't live in their "natural location". The majority of
  `std::os` works through extension traits to enhance the functionality of
  standard primitives, rather than providing inherent methods directly on the
  relevant types.

## The vision

Rather than today's assortment of approaches to portability, I propose the
following consolidated story:

- There is just `std`.
- All APIs in `std` live in their "natural" location.
- APIs not supported by a target are `cfg`-ed off for that target.
- There are capability-based `cfg` flags.
- You can use the [portability lint] to check for compatibility with arbitrary
  platform assumptions.

[portability lint](https://github.com/rust-lang/rfcs/pull/1868)

In short, I propose that we move away from the facade, the `std::os` model, and
runtime failure, and instead embrace target- and capability-based `cfg`s as the
*sole* way of expressing portability information.

The portability lint makes it possible to compile and test on one target while
checking that you are not accidentally making assumptions based on that
target. For example, by default Rust code will be checked for "mainstream"
portability, so that even if you're compiling on Windows, any use of a
Windows-specific API will be linted against. If you want to be compatible with
today's "no_std" ecosystem, you can tune the knob to check that you are--but you
won't have to change from `std` to `core`. The [RFC][portability lint] has full
details.

To make this all work, we will need to give careful design to the set of `cfg`
flags and their interrelations.

And to fully gain from abandoning the facade (i.e., to remove the special magic
used in `std` today), we would need to use an epoch boundary to fully remove
libcore.

As part of this effort:

- `std` itself should likely be refactored to make maintaining the external
  `cfg` information as easy as possible, and to create a [sharper division]
  between public APIs and internal, platform-specific implementation.

- We would need to reconceptualize "pluggability" into `std`. For example, today
  `no_std` allows you to define certain primitives, like panic handling, which
  are normally defined by `std`. We would need a way to instead *swap out*
  `std`'s default definition. Some related issues [have come up][wasm] in the
  wasm world, where ideally we would let you plug in your own JS imports to define
  things like printing to `stdout`.

[sharper division]: https://internals.rust-lang.org/t/libsystem-or-the-great-libstd-refactor/2765/33
[wasm]: https://github.com/rust-lang-nursery/rust-wasm/issues/38

## Call to action

The vision above is deliberately sketchy. The fact of the matter is that the
Rust project has never had a group of people tasked with thinking about
portability and platform support from a holistic design perspective--and as we
continue to expand Rust, we really need that.

In particular, we need help:

- Implementing the portability lint.
- Fleshing out a unified `std` design.
- Designing a clean, coherent `cfg` hierarchy.
- Refactoring `std` to make portability cleaner and easier.
- Designing a more general "plugability" story.
- Ensuring that we provide top-notch support for platform capabilities.

I propose that the Rust project spin up a dedicated Portability Working Group
devoted to this work. The group will need a strong leader who can take a
holistic, design-focused view of things. If you're interested in leading or
participating in such a group, please leave a comment on [the internals thread]!
