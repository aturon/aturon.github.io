---
layout: post
title:  "Retooling the Rust Libs Team team for 2018"
---

The Libs Team met today to discuss a weighty topic: **what is its mission as a
team, and are we set up to achieve it?**

As team lead, I took the liberty of proposing a mission statement:

**To improve the quality of the crate ecosystem, as a product.**

Working backwards:

- "as a product" means that we need to focus on the *end-to-end experience*
  people have with the ecosystem. It's not enough to have great libraries if no
  one can find them. It can be a problem to have *too many* libraries. Docs
  count for a lot!

- "the crate ecosystem" means that the Libs Team needs to look far beyond `std`
  and help look after the library ecosystem as a whole. The [Libz Blitz] was one
  of our first major attempts on this front.

- "improve the quality" means that we don't *own* or *oversee* the ecosystem,
  but that we work together with library authors to improve the experience. What
  quality means, and what aspects to prioritize, is of course also important to
  nail down.

[Libz Blitz]: https://blog.rust-lang.org/2017/05/05/libz-blitz.html

That's a lofty goal! Let's take a look at how we've approached it in the past,
and then talk about the future.

Please comment on the [internals post]!

[internals post]: https://internals.rust-lang.org/t/the-libs-team-mission/6584

## The Libs Team circa 2017

Last year, the Libs Team split its focus onto two main topics:

- Overseeing `std`.
- The [Libz Blitz].

For `std`, the work involved shepherding and deciding on RFCs and jointly
reviewing PRs that impact the stable API surface. Despite the fact that `std` is
not substantially growing, the workload here is sizable!

For the Blitz, the work involved leading crate evaluations, doing API walks in
synchronous meetings, and working with crate authors to help push through
changes. As by-products, the team also worked on the [API guidelines] and, to a
lesser extent, the [Cookbook].

[API guidelines]: https://github.com/rust-lang-nursery/api-guidelines
[Cookbook]: https://github.com/rust-lang-nursery/rust-cookbook

These efforts definitely made a positive impact on our goals, but collectively
the team feels that there's more we could be doing, and that a rebalancing of
priorities is in order--partly drawing on lessons from our 2017 work.

## Retooling the team in 2018

### Growing

One clear lesson from the [Libz Blitz] and the [impl Period] is that there are a
*lot* of people out there who are excited to help improve Rust's ecosystem, but
we lack the infrastructure and leadership bandwidth to direct this energy effectively.

So the Libs Team needs to grow its leadership, *and* grow to accommodate people
eager to pitch in. Today we announced [two additions to the team], which is a
good step.

However, a limiting factor is the current "monolithic" structure to the team,
which means that *every* member is expected to participate in all activities,
including signing off on `std` changes. To remove this bottleneck, we are
considering a "working group" model, in which team members cluster into smaller
working groups that tackle particular topics, where each member participates
only in the groups they have time/interest for. Examples groups might be: std,
SIMD, networking, API guidelines, cookbook. To some degree these groups exist
informally now, but we want to be more systematic about them, explicitly
delegating decision-making power and designating a lead for each group.

The working group model should allow us to drastically increase the number of
people involved in the team, while at the same time making us *more* agile by
moving day-to-day decision-making to smaller, more focused groups.

We're working with the Core Team to flesh out these ideas, in part because
several other subteams are pursuing similar thoughts; expect an RFC on this
topic soon!

[impl Period]: https://blog.rust-lang.org/2017/09/18/impl-future-for-rust.html
[two additions to the team]: https://internals.rust-lang.org/t/welcome-kodraus-and-withoutboats-as-full-libs-team-members/6582/

### Areas of focus

With the above changes, the Libs Team should be able to devote much more of its
focus to the broader crates ecosystem, and not just `std`. But where should that
focus go?

What follows are some *preliminary* thoughts, with the main goal of stirring up
discussion.

Let's go back to the question of "product quality" for the ecosystem. I'd break
that down as follows:

- Crate availability. *Does there exist a crate for your needs?*
- Crate discoverability. *Can you find that crate?*
- Crate quality. *Is the crate good? How can you tell?*
- Crate interoperability. *Does the crate fit well into the rest of the ecosystem?*

Last year, the Libs Team's focus was clearly crate quality. Now we want to
retool to hit on *all* of these topics.

#### Availability

Where are the gaps in the ecosystem? That's not just missing crates, but crates
that are missing important features in their domain. In the past, the Libs Team
has sometimes tried to look at availability issues by examining the *entire*
ecosystem and comparing to ecosystems for other languages--an approach that's
never panned out.

I think instead we should spin up working groups devoted to particular
topics/goals. For example, we could have a SIMD working group with the mandate
to produce a stable SIMD API and the power to make decisions on related
RFCs. But working groups could also be more broad, e.g. by bringing together
people interested in "networking" in general. The theory is that these domain
experts, by talking more regularly, can come to better understand the gaps and
turn them into contribution opportunities. They can also, of course, work to
improve the quality of the crates in their domain.

It's important to note, though, that working groups should be spun up only when
we have *committed leaderhip* for keeping up momentum and organization of the
group. That comes back to team growth.

#### Discoverability

In the "distant" past (circa 2016), we floated ideas like the [Rust Platform],
that involved "blessing" crates and tools that would then, in some sense, be
"shipped" as part of the Rust distribution. Part of the goal was to improve
discoverability by officially curating these crates. But in discussion with the
broader community, it became clear that this approach just has too many
downsides; it takes the oxygen out of the room for crate iteration and
competition, amongst other things.

Instead, in 2017, the crates.io team put a lot of work into improving
discoverability within crates.io. The Libs Team also intended to turn the
[Cookbook] into a central point of discoverability, but that work hasn't fully
panned out.

I don't think the work here is finished. As I said in my [#Rust 2018 post], I
think this year we should focus on shipping a new iteration of Rust as a
product, and that should include a more polished discoverability story. As such,
I think we should have a working group dedicated purely to improving the process
of finding and evaluating crates. (There are lots of specific ideas about
further improvements, but those are out of scope for this post.)

[Rust Platform]: http://aturon.github.io/blog/2016/07/27/rust-platform/
[#Rust 2018 post]: http://aturon.github.io/blog/2018/01/09/rust-2018/

#### Quality

The Libs Team put a lot of its focus in 2017 on crate quality. As KodrAus put it,
this happened both strategically and tactically:

- Strategically: by creating resources like the [API guidelines], we started to
  give library authors much more guidance how to create a high quality crate.

- Tactically: through the [Libz Blitz], we *directly* impacted the quality of
  specific crates.

Both of these efforts were shaped by the [Libz Blitz], which purposefully
targeted nearly-stable crates in an attempt to help clear up remaining design
questions and polish toward a 1.0.

These kinds of quality improvements are one of the highest-leverage activities
the Libs Team can take on, so we want to expand our efforts here. Some ideas and
open questions include:

- Supplementing the [API guidelines] with more "long form" material, e.g. by
  writing detailed "design evaluation" documents that explain all the design
  choices made in a particular crate.

- Surfacing pockets of the ecosystem that lack uniformity, such as the current
  situation around `-sys` crates, and working to produce a set of consensus conventions.

- Improving maintenance of vital crates (e.g. libc, rand, cc) by bringing on
  more contributors.

- Doing deeper dives into particular domains that need more design work; dhardy
  took on such work with the `rand` crate, and there are several other areas
  that need more than a Blitz-style treatment to get to 1.0-level libraries.

I'm sure there are other avenues to explore, and I'd love to hear your ideas!
It'll also take some work to figure out how to map these to working groups we
can plausibly staff.

#### Interoperability

One important aspect of looking at the ecosystem *as a whole* is making sure
that crates work well together. For example, there's currently an [issue with
error-chain] that is preventing smooth interop with [failure]. The Libs Team
should be working to surface and help solve this kind of issue. Probably this is
best done by working toward another useful goal: building and documenting
mid-sized sample applications that plug together various Rust libraries.

[issue with error-chain]: https://github.com/rust-lang-nursery/error-chain/issues/240
[failure]: https://github.com/withoutboats/failure

### Cross-cutting concerns

Finally, a general point: to fully achieve its mission, the Libs Team needs to
have much more contact with the ecosystem in general; the team should understand
what libraries are becoming important in which areas, and spend time checking
them out and helping contribute. There are a lot of ways we could do that, but
most fundamentally this means bringing more folks working in particular
sub-ecosystems into the Libs Team working groups. Thoughts on how we might
structure such an effort are welcome, particularly from crate authors!

## Wrapping up

This post was essentially a brain-dump of my current thinking about how to take
the Libs Team to the next level. I'm eager to hear from you about the problems
*you* see with the ecosystem, the ways you can envision the Libs Team helping,
and best of all, the ways you'd like to be involved.
