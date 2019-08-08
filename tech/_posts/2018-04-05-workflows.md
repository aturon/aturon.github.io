---
layout: post
title:  "Custom tasks in Cargo"
---

One of the big requests from the [Domain Working Groups] for Rust 2018 is a
richer feature set for framework- or domain-specific workflows in Cargo. At the
simplest level, that might look like *project templates* -- the ability to
direct `cargo new` to start with a custom template defined in crates.io. That's
already enough to get you cooking with frameworks like [QuiCLI], which today
involve a fixed set of initial scaffolding that you can fill in.

[Domain Working Groups]: https://github.com/rust-lang/rfcs/blob/master/text/2314-roadmap-2018.md#domains
[QuiCLI]: https://github.com/killercup/quicli

More ambitiously, though, working within a particular framework or domain may
require special workflows *after* initial project creation. For example, a web
framework might want to provide workflows for making database changes or adding
new resources.

At the Rust All Hands in Berlin last week, the Cargo team and other stakeholders
talked about these desires and cooked up a simple but compelling plan to address
them.

## Cargo tasks

The core idea is extremely simple. We add a `[tasks]` section to `Cargo.toml`,
with entries resembling normal dependencies. However, the *binaries* provided by
those packages are automatically available from the Cargo CLI via the `task`
subcommand.

Suppose for example that we have the following in `Cargo.toml`:

```toml
[tasks]
rust-on-rails = "0.1"
```

If the `rust-on-rails` crate provides `server` and `console` bins, then you'd be
able to type:

```
> cargo task server
> cargo task console
```

at the CLI to invoke those binaries.

Ultimately, we may want to avoid the need for writing `task`, but this raises
questions about conflicts with built-in and installed custom commands that we
didn't want to get into.

Anyway... that's it! A very simple but powerful idea.

## Metapackages

In subsequently discussing these ideas with @wycats, he (as always) raised a
very astute point: in some package managers, the existence of project templates
has made it easy to set up leaky abstractions. For example, if we do have a
`rust-on-rails` crate, it would probably provide a Cargo template that would
include *several* sections of `Cargo.toml` -- at the very least, both
`[dependencies]` and `[tasks]`. But that's not really what we want;
conceptually, these are all part of the same framework, and should be versioned
together, requiring only a single entry to bring into your project.

Incidentally, the same is already true of things like custom derives and build
scripts, where to use what is conceptually a single package requires multiple
bits of setup.

A while back I proposed [metapackages] as a way of grouping and versioning a
*set* of dependencies. But in my chat with @wycats, we had the insight that
metapackages could more generally be a way of *abstracting a chunk of
`Cargo.toml`*, including not just normal dependencies, but also tasks, build
scripts, and more.

[metapackages]: http://aturon.github.io/tech/2016/07/27/rust-platform/

In this brave new world, a single dependency entry in `Cargo.toml` is generally
all that is ever needed to bring in a conceptual package.

Open question: what might this mean for things like [metabuild]?

[metabuild]: https://github.com/rust-lang/rfcs/pull/2196/

## Today's custom subcommands?

One open question: if we provide `[tasks]`, how should we think about today's
custom subcommands (generally set up via `cargo install`)?

One possibility would be to allow for a `[tasks]` section in `.cargo/config`,
basically using the same mechanism for *all* workflow customization. But this
raises questions about conflicting names, global lockfiles, and more. More
thought and design is needed.

## Prior art?

Before finalizing any design here, we should do a survey of existing package
managers, many of which offer similar functionality and have learned painful
lessons.

## The plan

The most immediate step along these lines is to write and implement an RFC for
Cargo templates, which @withoutboats plans to do.

After that, I'm hoping to pair up with @ag_dubs to dig into the ideas in this
post and put together an RFC. In the meantime, though, please let me know if you
have thoughts or pointers to prior art!
