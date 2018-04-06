---
layout: post
title:  "Cargo, Xargo, and Rustup"
---

Another topic of discussion at the [Berlin Rust All Hands] was the long-term
story around Cargo, Xargo, and Rustup. The latter two tools are both involved in
managing your Rust toolchain, with Xargo allowing you to build custom `std`s and
Rustup managing pre-built artifacts for mainstream targets. Xargo is most
commonly used for cross-compiling to less common platforms, but can also be used
to customize the standard library on mainstream platforms.

[Berlin Rust All Hands]: https://blog.rust-lang.org/2018/04/06/all-hands.html

The tools today are a bit of a muddle: Xargo acts as a CLI wrapper around Cargo,
while Rustup is a completely separate tool, despite the fact that they handle
some similar responsibilities. Moreover, Rustup cannot manage targets set up by
Xargo. And there's long been a desire for toolchain requirements to be expressed
directly within `Cargo.toml`, so that `cargo build` is all that is ever required
to build a Rust package.

Given all that context, we've talked at various junctures about simply
integrating *all* of the above functionality into Cargo. We had another such
discussion at the All Hands, which I'll summarize below. **Note**: as always,
this summary covers *preliminary* thoughts; all changes will go through the
usual RFC process.

## Xargo integration

There is widespread agreement that Xargo's functionality should instead be
expressed directly within Cargo, along the rough lines of the [std-aware Cargo
RFC]. In particular, we strongly want the ability to enrich `std` with feature
flags and enable crates to customize those flags.

There are a lot of open design questions here; in particular, there is *not*
consensus on the details in the std-aware RFC. There are a lot of moving parts,
since the ability to specify details for the standard library is closely related
to specifying details about the compiler version and release channel as well.

The upshot, though, is that once we have this integration the concept of
"target" within *Rustup* can disappear entirely (though, of course, the target
must be specified at some point in the build process). Rather than manually
installing a list of targets per toolchain, Cargo will automatically set up
targets as needed, either building them or downloading cached binaries when
available.

[std-aware Cargo RFC]: https://github.com/rust-lang/rfcs/pull/1133

## Rustup integration

In general, folks didn't see a lot of value in having toolchain management
handled by a separate command from Cargo, especially given the desire for crates
to specify toolchain dependency information. Hence, while there will probably
always be a need to have a `rustup` *binary*, we want to explore exposing its
functionality through Cargo instead.

Here, again, the hard work is in the details. We probably want some combination of:

- Toolchain declarations within `Cargo.toml`, as with the Xargo integration.
- Automatic toolchain component installation.
- New Cargo subcommands for manual toolchain adjustments.
- Additional settings in `.cargo/config`.

All told, the hope is that we can replace some of Rustup's unique aspects (like
its override system) with uses of standard Cargo concepts (like `Cargo.toml` and
`.cargo/config`), and generally speaking to make toolchain management
"disappear", instead driving it on demand as part of the normal project
workflows.

One other insight: since `rustup` the tool will likely stay around in some form,
we can retain its CLI for niche cases, meaning that the Cargo integration only
needs cover the common case, and can thus likely make some simplifications.

## The plan

The most pressing issue to address for the Rust 2018 release is the needs of the
Embedded WG, where Xargo is currently commonly used to set up embedded targets.
It turns out, though, that by raising a handful of those targets to Tier 1
status (which has other benefits besides), the large majority of these cases will
be covered just by using Rustup.

On the whole, the Rust community is entering another "impl period" like state:
for the next several months, the focus will be on executing all of the plans
already laid for Rust 2018, rather than on brand new design. So the relevant
teams plan to pick back up these integration questions in the last quarter of
the year, after the 2018 edition has shipped.
