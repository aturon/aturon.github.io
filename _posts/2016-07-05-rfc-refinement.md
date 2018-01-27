---
layout: post
title:  "Refining Rust's RFCs"
---

At the heart of Rust's open development is the **RFC process**. Every major
change to the language, compiler, core libraries, tooling, and policy go through
an RFC writeup and consensus-building process. The process served us incredibly
well in clarifying our technical direction on the road to 1.0, and has continued
to be highly active since then, with on average about 2 RFCs merged every week.

But it's not all roses. There's been a growing sense among both Rust leadership
and the broader community that the RFC process needs some further refinement as
we continue to grow the community. I want to lay out my view of the problems and
sketch some possible solutions, based on extensive discussion and brainstorming
with many others on the team.

Each idea operates at a different scale (from big-picture to low-level
mechanics), but they are intended to fit together into a whole; each one
supports the others. Ultimately, these should result in a single RFC, but in the
meantime I'll start a discuss thread for each proposal.

There is a clear common theme to all of the problems I want to raise:
**communication**. We need to find ways to better scale up lines of
communication around the RFC process, and for Rust core development in general.
There is also a cross-cutting concern: a need to increase our focus
on **mentoring** and **the path to team membership**. @wycats has a great saying
about measuring the health of the team structure:

> Being a very active contributor who is not yet on a subteam should feel very
> close to actually being on that subteam.

Shooting for such a state of affairs has many benefits, not least of which
is increasing the scalability of our community.

## Proposal: Roadmap

[Discuss link](https://internals.rust-lang.org/t/refining-rfcs-part-1-roadmap/3656/1).

### The problem

**Lack of clear rallying points**. One thing that made the run-up to the 1.0
release so exhilarating was the way the release focused our effort: there was a
big overarching goal we were all working toward, which led to a number of fairly
clear-cut subgoals that everyone could pitch in on.

Since then, though, we've never had quite as clear of a "north star". We've
communicated some
[very high-level plans](http://blog.rust-lang.org/2015/08/14/Next-year.html),
and had success rallying efforts around self-contained projects like
[MIR](http://blog.rust-lang.org/2016/04/19/MIR.html). But we don't have a
systematic way of rallying our efforts around important goals on a regular
basis. This gap is a shame, because there are many people eager to contribute,
who we should be directing toward common, important goals with good mentoring
opportunities. Likewise, there are lots of people who could provide useful
perspective on goals, or even provide leadership on initiatives, who don't have
an outlet today.

Relatedly, it can be difficult to contribute at the RFC level. Is the problem
you want to solve a priority for the relevant team or wider community? When it
comes to the core language, there is only so much design work that can be in
flight at once (since it all needs to fit together), so **greater clarity on
priorities and motivations is essential**.

### The proposal

**Idea**: publish a *roadmap* on a regular cadence, e.g. every two release
  cycles (12 weeks).

The roadmap would contain, at a minimum, a *small* set of "major initiatives" for
that period. An initiative might cover any phase of development, e.g.:

- *Early investigation*: For example,
  [building out NDK support in rustup](http://blog.rust-lang.org/2016/05/13/rustup.html)
  or exploring implications of various memory model choices.
- *Design*: For example, working out a revised design for `rand` or const generics.
- *Implementation*: For example, the
  [MIR initiative](http://blog.rust-lang.org/2016/04/19/MIR.html) or
  [rustbuild](https://internals.rust-lang.org/t/the-rustbuild-feature-thread/3643/).
- *Documentation*: For example, focused effort on updating API docs in a portion
  of the standard library.
- *Community*: For example, launching
  [RustBridge](https://github.com/rust-community/rustbridge).

And potentially many other categories as well.

**Initiatives are intended to be a primary rallying point for the community**,
  and thus should share some basic traits:

- **Clear scope**: an initiative should have clear-cut goals that can actually
  be *finished*. So, an open-ended goal like "MIR" doesn't fly, but "Get
  MIR-trans working on all of crates.io" does.
- **Timeboxed**: relatedly, an initiative should realistically last at most,
  say, 24 weeks (two roadmaps).
- **Commitment**: There should be some level of commitment from multiple people
  to actually work on the initiative. In particular, the initiative should list
  some primary points of contact, and ideally mentors.

Each initiative would have a dedicated status page with this information, links
to issues or other materials, and potentially a FAQ. We've often found that
there are recurring questions ("When is MIR going to be turned on by default?")
about big, ongoing work. The roadmap and status pages give us a highly visible,
central and curated place to put this information.

The roadmap should be set via an open consensus process in which anyone can
propose or influence initiatives. The initiatives should fit criteria like those
listed above, and should also fit into an overall vision for Rust's evolution
over a longer period.

*Details to be worked out*:

- Cadence
- Can initiatives be added mid-stream?
- Full guidelines for initiatives; how many should be in flight at once? Needs
  to be a small number to make this practical and useful (it's a form of
  curation/rallying).
- What is the process for deciding on the initiatives?
- Do we divvy things up by subteam? That would make the discussion easier, but
  doesn't allow for cross-cutting initiatives very easily.
- Can we find less boring terms than "Roadmap" and "Initiative"?
- Can we also include the "feature pipeline" and other long-running concerns
  into a roadmap somehow?

## Proposal: RFC staging

[Discuss link](https://internals.rust-lang.org/t/refining-rfcs-part-2-rfc-staging/3657/1).

### The problem

RFCs are hard to keep up with in part because reading a full design -- and all
the commentary around it -- can be a lot of work, and there tend to be a large
number of active RFCs in flight at any time. **RFC discussions are often hard to
follow, due to the overwhelming number of comments, sometimes stretching over
multiple forums.** Naturally, this problem is exacerbated by "controversial"
RFCs, which is where we most need broad input and careful discussion. It can
also be hard to track RFCs that are in some sense "competing" (offering
alternative proposals for a common problem), or to correlate discussion between
the discuss forum and github.

It's also problematic to start off with a full proposal. What we really want is
to get the community on the same page first about the importance of the problem
being solved, and *then* to proceed to the design phase, perhaps considering
multiple competing designs.

Finally, RFCs are sometimes closed as "postponed", but ideally that should not
simply *terminate* the discussion; instead, the discussion should simply
continue elsewhere, or somehow be marked as being at a different stage.

### The proposal

**Idea**: introduce stages into the RFC process, including one for reaching
  consensus on *motivation* prior to considering a design.

**Idea**: move the focus away from an RFC PR as the primary venue for RFC
  discussion.

Put differently, the idea is to orient the RFC process around *problems* first,
and solutions second.

The rough phases I have in mind are:

1. Problem consensus
2. RFC drafting
3. RFC PR(s)
4. FCP
5. RFC merged

Concretely, what this would look like is having some venue for tracking the
problems we might want to solve, perhaps a revamped version of the RFC issue
tracker. Whatever this venue is, it would track the progression through all of
the phases. Let's call this venue the "Problem Tracker".

* *Phase 1: Problem consensus*. The initial discussion is essentially about
**reaching consensus on the motivation section of an RFC**, which should include
examples and make a compelling case that solving the problem is important enough
to warrant expending energy and potential complexity. The subteam would sign off
on that motivation, at which point there is some level of commitment to solve
the problem. That puts the focus where it should be -- solving problems -- and
should make it much easier for subteam members to engage early on in the RFC
lifecycle.

* *Phase 2: RFC drafting*. This phase can proceed in parallel with the previous
  one. During this phase, people sketch designs and work toward one or more full
  RFC drafts. Brainstorming and discussion on specific drafts would happen
  within dedicated "pre-RFC" [discuss posts](http://internals.rust-lang.org/),
  which are linked from the Problem Tracker. In particular, newly-opened RFC PRs
  today often get an avalanche of comments and early revisions, making it very
  hard to join the discussion even a week later. Pushing early feedback to our
  forum instead will make the eventual RFC PR discussion more focused and easier
  to participate in.

* *Phase 3: RFC PR(s)*. At some point, a *shepherd* (see below) can determine
  that an RFC draft is of sufficiently high quality and steady state that a PR
  should be opened, at which point discussion proceeds as it does
  today. Multiple RFC PRs might be open for the same basic problem -- and
  indeed, this is a good way to take the "Alternatives" section more
  seriously. All open PRs would be linked from the Problem Tracker.

* Phases 4 and 5 work just as today.

One interesting aspect of this phasing: it's possible to approve a Motivation
section, then get all the way to RFC PR, only to close out the PR for one reason
or another. In such cases, it should be possible to go back to the Problem
Tracker and build a new, alternative RFC draft with the same Motivation section.

Note that, in this regime, you don't ever open an RFC PR out of hand -- it must
go through the earlier phases, including the pre-RFC discuss post. While this
may feel like more process, I think that globally it will make the whole thing
more efficient, by weeding out poorly motivated RFCs earlier, by focusing
attention on the problem, by producing higher quality RFC PRs, and (as we'll
see) by decentralizing the process a bit more. In addition, it makes it easier
to cope with the problem of "Does this need an RFC?"

As part of this proposal, **I think we should "reboot" the notion of a
*shepherd*.** The idea would be to create a broader network of people around a
subteam who are empowered to help move the RFC process along in various ways,
but aren't necessarily responsible for the final decision. So, for example, we
would have a larger set of "lang shepherds" who help lang RFCs progress. The
powers and responsibilities of shepherds would include:

- "Calling to question" -- that is, proposing that the subteam move to make a
  decision on problem consensus or moving to FCP.

- Working with the community to help brainstorm, draft, and revise pre-RFCs.

- Moving to from pre-RFC to RFC PR phase.

- Acting as the "scribe" for the RFC process, by keeping the Problem Tracker up
  to date. In particular, the subteams currently attempt to provide "summary"
  comments for contentious RFCs, to help people track the discussion. This
  proposal would give those comments more formal status, as something that would
  go directly on the Problem Tracker, and that any shepherd could provide at any
  point.

All subteam members can act as shepherds as well.

In general, I envision the Problem Tracker as the go-to place to see where
things stand for a given problem/set of proposals, including summarization of
discussion and pros/cons for the proposals. The shepherds would play a special
role in establishing that official record.

I think these changes make the RFC process both more accessible and more
scalable. More accessible because it's easier to get involved and get quick
feedback in lightweight ways (before writing up an entire design). More scalable
because of increased parallelism, and because the big decision points happen at
either an easier stage (establishing motivation) or with many fewer proposals in
flight (the RFC PR stage).

*Details to be worked out*:

- What happens to current RFC PRs? Are they grandfathered in, or moved into this
  new process?
- Where does the "problem tracker" live?
- What are good guidelines around an initial "motivation"?
- How and where can we keep an "official record" of the progression of a
  problem, including links to (and summaries of) pre-RFC and RFC PR threads?

## Proposal: Async decisions

[Discuss link](https://internals.rust-lang.org/t/refining-rfcs-part-3-async-decisions/3658/1).

### The problem

There is room for improvement around the way that the subteams themselves
work. Today, subteams reach decisions on RFCs and other issues in (bi)weekly
meetings. There are at least two problems with doing so. First, since the
meetings have a limited duration, **we often run out of time without finishing
the active business, introducing delays**; similarly, because of the high amount
of RFC activity, **the subteams often operate in "reactive" mode, more than
actively leading**.

Another issue is that meetings provide, in some sense, the "wrong defaults" for
making decisions. We have to be careful to ensure that all the rationale for a
decision is present in the online discussion thread, and that any new rationale
that came up during a meeting means that the decision is delayed, to give the
full community a chance to respond. The point is that, **while we work hard to
provide this transparency, it requires that extra work**. At the same time,
there is often good discussion in meetings wherein the subteam members build up
a set of shared values -- thereby missing the opportunity to argue for those
values to the wider community. Finding a way to move decision-making to a more
public, asynchronous system seems ideal, though meetings *do* have the benefit
of providing a steady cadence to ensure that business is getting done.

### The proposal

**Idea**: move away from video meetings for decision-making, instead reaching
  decisions entirely in the associated comment threads.

By moving the decision-making process fully online, we make it transparent by
default. That is not to say that subteam members -- or anyone else -- will never
have private conversation, of course. Just that this particular bit of business
is better conducted online.

The key to making this work is automation. Right now, the meetings provide a
convenient "forcing function" to ensure that decisions are being reached in a
somewhat timely fashion. To ensure that we still make steady progress, we need a
*dashboard* for every subteam member, showing them precisely what outstanding
items they need to weigh in on -- and that list needs to be kept manageably
short.

We'll need a dashboard tool that can pick up on special text from subteam
members for:

- Calling an RFC/issue into FCP
  - "process: fcp"
- Approving/disapproving FCP
  - "process: fcp r+"
  - "process: fcp r-"
- Extending FCP
  - "process: fcp extend" (for one more week by default; possibly give parameter?)
- Approving stabilization/RFC merging
  - "process: r+" (ideally followed up by some commentary)
- Weakly objecting
  - Just leave a comment, followed by a "process: r+" once you are satisfied
    that the objection is addressed or that it's OK not to address it.
- Strongly objecting (i.e. blocking acceptance)
  - "process: r-" (followed up with objection)
- Abstaining (possibly?)
  - "process: ack"

The dashboard tool would track the current status of RFCs/issues facing a
decision, and would track the various timelines involved, e.g. that RFC FCP
lasts for one week.

We can and should continue to hold video subteam meetings (they're high
bandwidth!), but for more forward-looking purposes: discussing specific
early-stage RFCs, brainstorming, and prioritization. We can explore recording
these meetings, and potentially opening them up to additional stakeholders who
are not part of the subteam.

*Details to be worked out*:

- A plausible story for automation that retains the consensus process and is
  likely to keep things moving.
- Can the automation itself be responsible for moving to FCP/merging? Or at
  least provide a pushbutton way for doing so?
