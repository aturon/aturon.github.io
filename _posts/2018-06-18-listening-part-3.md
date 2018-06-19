---
layout: post
title:  "aturon.log: listening and trust, part 3"
---

[ergonomics initiative]: https://blog.rust-lang.org/2017/03/02/lang-ergonomics.html
[2017 roadmap]: https://github.com/rust-lang/rfcs/pull/1774
[confusing]: https://withoutboats.github.io/blog/rust/2017/01/04/the-rust-module-system-is-too-confusing.HTML
[inverting]: https://internals.rust-lang.org/t/lang-team-minutes-the-module-system-and-inverting-the-meaning-of-public/4804/
[series]: http://aturon.github.io/2018/05/25/listening-part-1/

In this this post in the [listening and trust series][series],
I'm going to talk through one of the most intense discussions the Rust community has had:
the module system changes that were part of last year's [ergonomics initiative].

## The saga, summarized

The modules saga demonstrates both payoffs and pathologies of the RFC process,
playing out over a dozen different threads reaching 1,400+ comments in total.

It was, in the end, a success -- at least as gauged by the collective enthusiasm
for the final result, compared to the starting point. Yet it left wounds that
have not entirely healed, which is part of why I want to talk about it here.

The [2017 roadmap] focused on productivity and learnability, and the Lang Team
took a look across the language for areas of improvement. Modules were a
well-known stumbling block for many users, though many others (including most of
the Lang Team) found it simple and easy to grasp. So the first order of business
was working to understand what people found confusing or difficult about modules,
which led to a couple of initial threads:

- @withoutboats's post, [The Rust module system is too confusing][confusing].
- An [internals writeup][inverting] of a Lang Team discussion about the privacy
  aspects of the module system.

These early threads produced some important insights into how different people
experienced the module system. They also highlighted the level of controversy to
expect around any discussion involving such a fundamental change, even one that
was far from a complete proposal.

A few months later, a subset of the Lang Team and some others spent a few
hundred person-hours delving into both the problem and solution space. We worked
through about a dozen different designs before finally reaching a mix of ideas
that seemed plausible enough to present to the community. I did so in an
[initial blog post], which also took a stab at a "comprehensive" analysis of the
problems. The post generated an enormous amount of discussion, and a week later
I closed its thread in favor of a new one with a [revised proposal], which
@withoutboats [revised further]. There were also a handful of other threads with
additional proposals, or that drilled into specific aspects in greater detail.

One of the problems the original proposal called out was "path confusion". The
[revised proposal] summarized some of the feedback as saying:

> Many on the thread cited this as the core problematic issue with the module
> system; I’ve collected some data about confusion around Rust modules which
> also supports that to a degree.

and suggested an approach that gave more weight to solving those problems.

After reaching what seemed to be a rough consensus on the internals thread
around the third design, @withoutboats wrote up a complete proposal as an
[initial RFC]. A similar story played out, with that initial RFC garnering quite
a bit of feedback in multiple directions, and ultimately being closed in favor a
[second], and then a [third] (and final) RFC.

The RFC that was ultimately accepted bears almost no resemblance to any of the
initial design sketches. It ultimately took the "path confusion" issue as *the*
problem to address, and oriented the design more completely around that issue
than any of the earlier proposals did. (Discussion of some aspects of the design
[is ongoing]; there will soon be a 2018 Edition Preview where we'll be looking
for further feedback.)

[initial blog post]: https://internals.rust-lang.org/t/revisiting-rusts-modules/5628
[revised proposal]: https://internals.rust-lang.org/t/revisiting-rust-s-modules-part-2/5700
[revised further]: https://internals.rust-lang.org/t/revisiting-modules-take-3/5715
[initial RFC]: https://github.com/rust-lang/rfcs/pull/2108
[second]: https://github.com/rust-lang/rfcs/pull/2121
[third]: https://github.com/rust-lang/rfcs/pull/1774
[is ongoing]: https://internals.rust-lang.org/t/the-great-module-adventure-continues/6678

With that basic background in place, I want to examine some of the social
dynamics that played out along the way, from the context of listening and trust.

## Momentum, urgency, and fatigue

I think that, collectively, we all remember the modules discussion as
*intense*. But it's interesting to dig into the *ways* it was intense.

In my memory, the discussion was heated. But it turns out that memory was
faulty: when I went back and re-read all of these threads, I was shocked by the
relative lack of heat! Granted, there were a few outlier comments, but I came away
convinced that the sense of intensity was not primarily about the
discussion being charged.

What I noticed, instead, is a recurring mention of the length and *velocity*
of the comment threads involved. Threads were accruing hundreds of comments per
week, and there was a sense of high stakes (the Lang Team is considering
changing the module system!), so many people felt compelled to get involved, at
least at the beginning. And the only way to do so was to participate in those
threads, thus compounding the effect.

While the modules discussion was an extreme case, the issue of comment thread
velocity is a familiar one in Rust. **A high velocity thread often *seems*
heated and "controversial", even if the discussion is respectful and chock full
of insights**. I think this is part of why feelings about the modules discussion
are so complex, and why it seems an exemplar of both the best and the worst of
the RFC process.

I personally don't see high comment velocity as a *root* problem, but an issue
that relates to deeper dynamics:

- **Momentum**. A comment thread has a kind of "momentum" of sentiment that can
  be hard to shift, and also hard to gauge as the thread gets long. If an RFC
  has an initial batch of negative (or positive) comments, it can be difficult
  to recover, in part because these are the first sentiments everyone sees.

- **Urgency**. Because comment threads are a major input into the
  decision-making process, there's a sense of urgency to participate and keep
  the discussion "on course" from your personal perspective. This urgency is
  compounded when a thread is fast-moving or lengthy, or when a proposal
  originates from a team member (and thus is reasonably seen as having a
  higher chance of landing).

- **Fatigue**. Many people participate early on in an RFC thread, only to
  ultimately step away because the thread has too much traffic to keep up with
  or influence. There's also sometimes a feeling of a topic getting discussed
  "to death"; many felt that way toward the end of the modules saga.

Some of these social dynamics are inevitable with a project as large and open as
Rust. But the net effect is a bit like the one I talked about in
the [first post][series] in the series: the sense that you need to be "in the
room when it happens", and that it takes a lot of time and stamina to do so. In
this case it's not about the moment of decision per se, but rather the struggle
to set the direction of the comment thread. **I often hear from people who are
intimidated by the RFC process precisely because of the huge comment
threads**. Not to mention, of course, the enormous amount of work needed to
fully participate in those threads.

These issues are particularly pronounced for early-stage
discussions. "Brainstorming" can get overwhelmed either by a deluge of ideas, or
(much worse) strong attempts to kill an idea before it has any chance to take
root.

**But I don't think comments themselves are the problem**; the whole process is,
after all, a request for comments! I think the problematic dynamics stem instead
from two core process problems:

- **A lack of clarity about the "stage" of any given discussion**. A thread
  brainstorming on a new way to approach `Ok`-wrapping should not need to
  recapitulate fundamental disagreements on whether `Ok`-wrapping is desirable.

- **Too much emphasis on "the thread", rather than on standalone artifacts**. We
  don't have a good process or culture around reflecting the discussion into the
  RFC itself, and while we do sometimes make "summary comments" to help manage
  discussion, they tend to get lost in the noise. The RFC thread takes on a
  primary, high stakes role instead.

I believe that if we adjust our process to address these two issues head-on, it
will go far in further eliminating the requirement to be "in the room" at the
right time, and the negative effects that come with it.

## Wielding power; changing minds

In my last post, I mentioned a sentiment I've often seen, one sometimes made in
reference to the modules discussion:

> Luckily enough of us yelled to stop the terrifying original proposal from
> happening; the moment we stop speaking up, Those People will start pushing in
> that direction again.

I understand where this sentiment comes from; the RFC that landed indeed bore
little resemblance to the starting point, due in part to pushback. But there are
two distinct ways to understand why RFCs change, and what it means:

- **Wielding power**. There were some particular aspects of the early modules
  proposals, like removing the need for `mod` statements, that garnered a strong
  negative reaction from a number of people. It took a lot of iterations, but
  ultimately that part of the proposal was dropped. It would be reasonable to
  see this as part of the community *asserting itself*, being loud enough about
  strong preferences to make it clear that certain changes would be intolerable.
  The result could be a capitulation, or compromise, in which the original proposers
  relent and "take what they can get".

- **Changing minds**. On the other hand, a number of folks who were positive
  about the original proposal were *even more positive* about the final one. For
  them, the final proposal wasn't a compromise at all, but rather the *best*
  option.

I'm personally in the latter camp: I'm much happier with the RFC that landed
than with the original proposal, and I wrote both of them! **But I think both of
the above elements were at play**. Let me explain.

It was not until very late in the process that we stopped proposing to drop
`mod` statements, and there's no question that, had it not been for the
persistence of a few people, it wouldn't've happened. Power was, indeed,
wielded. But the reason for changing the proposal wasn't simply "well, we can't get
this through, so let's scale back". Rather, those lengthy comment threads and
disagreements forced us all to dig deeper into the problem space. And we
eventually learned that our original analysis of the core problem was just
*wrong*, that the "path confusion" issue that I initially treated as secondary
was actually *the* problem.

This is part of why I don't want to put blame on comments themselves. Our
willingness to dig deep and long to find new insights and more nuanced designs
is a big part of what's made Rust the language it is, and why [I love][twitter]
working on it so much. Sometimes talking something "to death" is exactly what's
needed to uncover the right set of ideas.

[twitter]: https://twitter.com/aaron_turon/status/1008153135515222017

I don't think it's the job of the Rust Teams to seek a *compromise solution*,
which is a recipe for design by committee; we need a strong, coherent final
design. I think we should be *convinced* that the solution is within striking
distance of the best for our [plural community][last post]. And thus the role of
the RFC process is precisely to facilitate deep digging, to explore ideas,
tradeoffs and constraints and look for the option that genuinely seems best.

## Lived experience; active listening

A final dynamic that showed up throughout the modules discussion: reports of
"lived experience".

Going back to `mod` statements, several people talked about the role they play
in their personal workflow, whether due to their IDE, their lack of IDE, their
habits with respect to temporary files, or even the latency of their file
system.

No one can be wrong about their own lived experience. And lived experience can
bring issues to life in a way that pure empathy and speculation can't. Thus, a
big benefit of the RFC process is the crowdsourcing of lived experiences that it
provides.

Unsurprisingly, one's *own* lived experience always looms large. But our job in
building a language is to account for the experience it provides for a large and
diverse set of current *and future* users, many of whom are not well-represented
on RFC threads. Thus accounts of lived experiences are data points, at best
proxies for the experiences of similar users, but ultimately information that
needs to be weighed in a global design space.

**The work of an RFC thread is in part to employ *active listening* to turn
lived experience into design constraints**. In cartoon form this might look as
follows:

- A: "I am against this RFC."
- B: *Why?*
- A: "I don't want to get rid of `mod` statements, I think they're very important."
- B: *Can you say more about what role they play for you?*
- A: "They make it easy to temporarily remove modules while refactoring."
- B: *OK, so you have as a design constraint that workflows for refactoring should remain ergonomic?*
- A: "Yes."

The [last post] talked about the feelings that inevitably come into play in any
discussion you care about. They're strongest when they touch on lived
experience. They should not be *hidden away*, but part of the emotional labor of
the RFC process is to recognizing such feelings as emerging from our *personal*
experience, and working introspectively to dig out the actual constraints that
represents -- and then to weigh those against the constraints of other present
and future Rust users. We can help each other to do so, as in the cartoonish
dialogue above. But even better if we can each do some of that work privately
*first*, and come to the thread not with a flat "I am against this RFC" but
rather "I'm concerned about refactoring workflows; here's what my personal one
looks like..."

[last post]: http://aturon.github.io/2018/06/02/listening-part-2/

---

Last week a few folks from the Rust Core Team got to spend a few hours talking
about the RFC process in person -- something we've done many times before, but
that led in a more conclusive direction this time around. Niko is writing up
some of the ideas, which are partly aimed at the problems raised in this post.

Ultimately, though, we can't solely rely on process improvements; we need to do
the work of reflecting on, writing down, and improving our design culture as
well. I plan at least one more post in the Listening and Trust series, and then
on to other, broader topics.
