---
layout: post
title:  "Version selection in Cargo"
---

When there are multiple ways to resolve dependencies, Cargo generally chooses
the *newest* possible version. The goal of this post is to explain why Cargo
works this way, and how that rationale relates to several recent discussions,
including:

- [Whether we should support a "minimal version selection" option](https://github.com/rust-lang/cargo/issues/5657),
  and if so how it should relate to CI and the existing ecosystem.

- [Whether we should state a minimal Rust version in Cargo.toml](https://github.com/rust-lang/rfcs/pull/2495) in
  a way that affects dependency resolution.

- [The work on `vgo`](https://research.swtch.com/vgo), a new package management
  tool for Go that explicitly opts for selecting the *oldest* possible version.

# Version selection goals

No one likes spending time futzing with their dependencies instead of writing
code on top of them. For Cargo (and, I think, most package managers) that
translates to the following design goals:

- **Reproducibility**. After building, it should be easy to perform an identical
  build again, even on a different machine, so that debugging can proceed from a
  firm foundation.

- **Control**. Users should have control over when and how dependencies are
  upgraded, so that surgical fixes can be applied.

- **Compatibility**. It should be easy to find versions of direct dependencies
  that work together.

- **Maintainability**. The support burden should be minimized and evenly
  distributed, rather than falling entirely on the upstream or downstream sides.

The "dependency hell" experience comes down to one or more of these goals being
unfulfilled. But some of the goals are directly at odds! For example, if we want
to give clients fine-grained control over version selection *and* make it easy
to find compatible sets of versions of libraries, we'll be asking for a higher
maintenance burden across the ecosystem. That's because ensuring compatibility
generally requires testing and bug-fixing, and the more combinations of versions
that arise, the more testing and fixing that's needed.

The role of the package manager is thus to provide mechanisms, defaults, and
best practices that push the ecosystem toward a good balance across these
goals. It's an imperfect science, involving some social engineering and
guesswork; there's not a clear best way to go about it.

# Rationale for maximal version resolution

Most of the time, there are many, many valid ways to resolve a dependency graph.
Even in the simplest case of having a single dependency, if you use the typical
version constraints multiple matches will be possible:

```toml
winapi = "0.3.0"
```

This version constraint asks for any version *compatible with* 0.3.0, which for
Cargo means any 0.3.X version (currently, the latest is 0.3.5). How do we decide
*which* of the compatible versions to go with? Most package managers, including
Cargo, take the maximum (newest) version possible. The new `vgo` package manager
from Go is a notable exception in taking the *minimum* version.

Let's examine this question in light of the design goals:

- **Reproducibility**:
  - If we select the *maximum* version, dependency resolution will produce
  different results as new versions of crates are published. Thus, to achieve
  reproducible builds, a separate mechanism is needed to record the
  state of the world at the time of the build: the lockfile.
  - If we select the *minimum* possible version, dependency resolution will give
  the same result even if new versions are published, so no lockfile is needed
  to achieve reproducibility.

- **Control**: the version selection strategy doesn't have direct bearing on the
  question of control, because users are always free to use more restrictive
  constraints, like "=0.3.1".

- **Compatibility**: since we're talking about different *valid* resolutions of
  dependencies, we're already in a situation where the dependency graph can be
  resolved. But whether the resulting code actually compiles and works together
  is another question! All else being equal, what will make compatibility most
  likely is if the specific combination of versions has been actively tested and
  debugged.
  - If we select the *maximum* version, then at any given point in time, the
    current maximum versions of crates will be actively tested against each
    other (due to CI), and hence likely to work. Put differently, there's an
    ecosystem-wide agreement on which versions to test compatibility with each
    other: the latest versions.
  - If we select the *minimum* version, the version we *actually* get will
    depend on what minimum versions happen to appear in any transitive
    dependencies. In other words, *it's the minimum version that can satisfy our
    particular dependency graph*. Thus, unlike the situation with maximum
    version selection, there is not ecosystem-wide agreement on which versions
    will be used together in CI and elsewhere; the versions chosen will vary
    across projects.

- **Maintainability**:
  - If we select the *maximum* version, downstream users are likelier to get the
    latest bugfixes; for apps, lockfiles help protect against the opposite
    problem of trading known bugs for unknown ones. Furthermore, as mentioned
    above, the ecosystem-wide agreement on the "frontier" of versions to test
    with each other means that bug reports against old versions (and
    expectations of backports) are less likely. Active maintenance is focused on
    the latest releases across the board.
  - If we select the *minimum* version, there is greater chance of already-fixed
    bugs biting users. Furthermore, as mentioned above, the version combination
    a project ends up with is more likely to be unique to that project, and
    hence seen less testing over all. Active maintenance is spread across a
    larger range of versions.

The Cargo team believes that, on balance, maximum version selection provides a
better experience across the ecosystem, with the primary cost being one of
conceptual and implementation complexity: the lockfile.

It's important to note, though, that while the maximum version approach tends to
focus the ecosystem on the latest versions of crates, there are still plenty of
circumstances where other version combinations arise:

- For an app with an existing lockfile, the versions will be held steady
  regardless of new publications. However, *at the time the lockfile was
  produced*, the versions selected were the latest ones available, and hence
  were receiving active testing and maintenance at the time. Similarly, when
  dependencies are subsequently adjusted, Cargo will "unlock" the affected
  dependencies and again choose the maximum version.

- Bounded constraints like `=` and `<=` prevent Cargo from choosing the newest
  version. These constraints are rare, especially for libraries, but they relate
  to toolchain version requirements, as we'll see next.

# Toolchain requirements

The Rust community has had recurring discussions about what kinds of constraints
libraries should impose on the compiler toolchain they use, and how those
constraints should be expressed:

- On the one hand, library authors would like to use the newest Rust features.
- On the other hand, doing so means their clients must be using an up-to-date
toolchain. This can be a hardship in situations where it's hard to change the
toolchain, due to deep integrations or other constraints.

Today, the most widely-used crates in the Rust ecosystem have adopted an
extremely conservative stance, effectively retaining compatibility with the
oldest version of Rust possible, in some cases with a three-year-old
toolchain. For a language as young as Rust, that's pretty painful.

Proposals for addressing this problem fall into basically two camps:

- **Shared policy**: rather than have core libraries each be "as compatible as
  possible", instead set a clear, ecosystem-wide policy on what level of
  compatibility is expected. This was first proposed
  in [2016](https://github.com/rust-lang/rfcs/pull/1619), and has been revived
  as part of the current [long-term support (LTS) proposal][LTS]. The key idea
  is that *it is not considered a breaking change to update the compiler version
  required*, as long as the new requirement is within the compatibility
  policy. For LTS-level compatibility, that means that the crate is always free
  to depend on the latest LTS toolchain.

- **Stated toolchain**. There have been several RFCs proposing to
  specify toolchain requirements as part of Cargo.toml, *and have those
  requirements affect dependency resolution*;
  the [latest such RFC][mv] is
  currently open. In this model, crates could freely bump the minimum compiler
  version needed, and Cargo would only resolve to a version of the crate that
  supports the compiler toolchain being used.

[LTS]: https://github.com/rust-lang/rfcs/pull/2483
[mv]: https://github.com/rust-lang/rfcs/pull/2495

Let's again analyze this situation in light of the design goals we started with
(except for reproducibility, which isn't relevant here):

- **Control**:
  - In the *shared policy* approach, control is very limited. Library authors
    don't choose arbitrary toolchain versions, but instead commit to
    compatibility with a *release channel* (LTS, stable, nightly).
  - In the *stated toolchain* approach, *everyone* has a lot of control. Library
    authors can set their toolchain requirements in any way they like, for any
    library release they like. Consumers can likewise choose any toolchain to
    work with, and Cargo will look for a compatible dependency resolution.

- **Compatibility**: Note first that Rust toolchains are regularly tested
  against the entire crates.io ecosystem, so unlike with version selection
  above, there's less concern here of finding a combination that "resolves but
  fails to compile/work". The concern is more about finding a resolution at all.
  - In the *shared policy* approach, similar to the "maximum version selection"
  we saw before, there's an ecosystem-wide agreement about what versions to test
  on and be compatible with: the latest LTS toolchain. If we assume that the
  majority of users are able to stay at least on or above the most recent LTS,
  then toolchain compatibility is a non-issue, at least for core crates.
  - In the *stated toolchain* approach, the toolchain being used to compile
    *effectively imposes an `=`-style version constraint*. That means that we
    are somewhat less likely to get the *latest* versions of all our
    (transitive) dependencies, since some of them may require newer toolchain
    versions; we will of course get the latest compatible versions. It's hard to
    say for certain, but this seems likely to create a larger set of crate
    version combinations than we see today, and thereby diffuse the testing for
    compatibility.

- **Maintainability**: Here the maintenance burden is largely on library authors.
  - In the *shared policy* approach, library authors are often "stuck" on an old
    (LTS) version of the toolchain, though not as outdated as with many crates
    today; that imposes a maintenance cost. On the other hand, there's a much
    greater chance that their clients are using the latest version of *the
    library* due to this generous toolchain compatibility, which helps with
    maintenance (since bug reports tend to be targeted toward the current
    release).
  - In the *stated toolchain* approach, the tradeoffs are exactly the reverse:
    it's easy to upgrade the toolchain requirement at will, but the cost is that
    doing so *effectively creates an LTS version of the library*, because users
    stuck on old toolchains will also be stuck on old library versions, and
    hence file bug reports (and request backports) for them.

There's not a clear winner here! And there are a lot of other, emergent factors
to consider as well:

- Rust's rapid release process is based on the idea that most developers will
  keep their toolchain up to date, since each incremental update is small (as
  opposed to "big bang" updates on a much slower cadence). There is some risk
  that the *stated toolchain* approach will reduce incentives toward upgrading.

- Even if crates can state toolchain requirements, there's still the question,
  for core crates, of what requirements are appropriate. Bumping the requirement
  won't break clients right away, but it will cause problems if those clients
  want to update to gain new library features (but stay with the old
  toolchain). In other words, it seems possible that the benefits of the *stated
  toolchain* approach are illusory, and that in practice critical crates will
  stick with very conservative toolchain requirements.

For me, that last point is a clincher: I think that forming a good *shared
policy* is going to be needed regardless, and that doing so will address most of
the toolchain requirement issues we have today. I similarly think that it's
quite valuable to retain the true maximum version selection that we have today,
rather than constrain it by a toolchain filter.

In the long run, it could even make sense to combine the two approaches,
allowing crates to state their toolchain requirements (and have that influence
resolution), but encourage core crates to state "LTS" as their requirement.

# Checking the minimal resolution

Finally, I wanted to address an interesting aspect of the current approach to
version resolution: most `Cargo.toml` files do not give an accurate lower bound
on their dependencies! Going back to the `winapi` example, if the stated
dependency is "0.3.0", because we will resolve to the maximum version, we can
freely rely on a feature that only appeared in 0.3.2.

Simple minimal version selection wouldn't immediately address the issue, because
one of our *other* dependencies could itself have a dependency like `winapi =
"0.3.2"`, which would mean we'd compile against a newer version than what we
stated. To get a truly precise lower-bound, we have to (1) resolve to minimal
versions and (2) check those versions against all the ones stated in the root
`Cargo.toml`. There's
been [some work](https://github.com/rust-lang/cargo/issues/5657) to add such
capabilities to Cargo, but there's an open question: do we care?

The lack of lower-bound precision hasn't been a problem for Cargo so far
because, in general, we eagerly resolve to the *maximum* version; any
requirement on newer library features will thus be automatically fulfilled.

However, there are at least two ways this could become more of a problem in the future:

- If we adopt the *stated toolchain* approach above, we end up imposing more
  `=`-style constraints, which in turn can prevent us from choosing the
  globally-maximum version of crates. The effect could be that everything passes
  CI just fine, but a user with an older toolchain gets a crate resolution that
  fails to compile (rather than a resolution saying "you need a newer
  toolchain"). Notably, the lower-bound precision issue *also* applies to the
  stated toolchain, as well.

- It's possible that we will eventually have workflows that depend on the
  accuracy of lower bounds in `Cargo.toml`. At the moment, however, this is
  purely speculative; the Cargo team does not have any ready examples.

If we do decide to care, an approach to improve accuracy is to document, as part
of CI best-practices, that a build with `--minimal-versions` should be performed
in CI in additional to the normal build. We could likewise build that test into
crate publication.

# Wrapping up

While we didn't reach crystal-clear conclusions on the current open questions,
the main goal here was to lay out more explicitly a way of thinking about the
design space. As with
the
[Ergonomics Initiative](https://blog.rust-lang.org/2017/03/02/lang-ergonomics.html) post
from last year, I'm hopeful that this framing can help give us some shared
vocabulary for grappling with the current and future design question in
Cargo.

For the particular questions examined here, I'd very much appreciate comments on:

- The [minimum version RFC][mv].
- The [LTS RFC][LTS].
- The [CI best practices](https://github.com/rust-lang/cargo/issues/5656) issue for `--minimal-versions`.
