---
layout: post
title:  "aturon.log: listening and trust, part 1"
---

For me, most weeks working on Rust are fun — [exhilarating, even](http://aturon.github.io/2018/02/09/amazing-week/). But, just like with anything else, some weeks are hard.

As this week draws to a close, I feel troubled. On the one hand, things are looking strong for the 2018 Edition (which I want to write more about soon). But on the other hand, this week I locked two RFC threads, flagged a bunch of comments for moderation, and generally absorbed a lot of emotion from a lot of different quarters of the community. There’s a sense of simmering distrust.

I worry sometimes about becoming a victim of our own success: if our community grows more quickly than we can establish shared values/norms/culture, we could so easily descend into acrimony and tribalism. I’ve seen other language communities go through very painful periods, and I’m eager to try to steer Rust’s community around them if we can.

I’m a strong believer in the fundamental importance of listening for building trust. But I’ve realized that *talking* is also important, and that Rust’s leadership needs to do [a better job](https://internals.rust-lang.org/t/fortifying-the-process-against-feature-bloat/7608/29?u=aturon) broadcasting about the people and process side of the project. This post is the beginning of an ongoing series; posts like this will form a “leadership diary”, focusing on my *highly personal* perspective as a leader — not on technical issues but rather on how the project runs.

----------

This week saw several controversies:


- [An RFC](https://github.com/rust-lang/rfcs/pull/2444) to “undo” `impl Trait` in argument position, a feature that [recently shipped](https://blog.rust-lang.org/2018/05/10/Rust-1.26.html) in stable Rust.
- [Outcry](https://github.com/rust-lang/rfcs/pull/2441#issuecomment-390406492) about keyword reservations for the 2018 Edition.
- Heated discussion on numerous threads about the role and importance of emoji reactions in GitHub.

These may seem unrelated, but I think they all boil down to the same core issue: listening and trust.

When I first started working on Rust in mid-2014, the RFC process had *just* been put into place, and we were collectively grappling with how to make it work. At that time, there was a weekly video meeting, comprised mostly of Mozilla staff, in which RFC decisions were made (amongst other things). You can see the history of this meeting [here](https://github.com/rust-lang/meeting-minutes/tree/master/weekly-meetings), all the way up to the point [it was shut down](https://github.com/rust-lang/meeting-minutes/blob/master/weekly-meetings/2015-05-26.md#future-of-weekly-meeting), just after Rust 1.0.

Looking back, it’s hard for me to believe that things used to operate this way. And although the process is *very* different now, I sometimes think those early, closed-door, Mozilla-centric meetings were a kind of “original sin” that laid seeds of distrust that we’re still working through today.

## The Great `int` Debate, and the No New Rationale rule

A critical turning point came at the end of 2014, stemming from a rather innocuous-seeming issue: what to call the types that eventually became `isize` and `usize`.

At the time, the types were called `int` and `uint`, but these names had been [debated on the issue tracker](https://github.com/rust-lang/rust/issues/9940) for over a year. As the time for Rust 1.0 drew near, finalizing these names was one of the countless “small issues” that needed to be settled for good. Seeing this as a relatively minor issue, project leaders read the comment history, discussed the matter in — you guessed it! — a closed-door meeting, and then posted an [extensive writeup](https://internals.rust-lang.org/t/a-tale-of-twos-complement/1062), which included a very important sentence:


> We (the core team) have been reading these threads and have also done a lot of internal experimentation, and we believe we’ve come to a final decision on the fate of integers in Rust.

The result was... explosive. And rightfully so! I am forever indebted to glaebhoerl, who [articulated the problem](https://www.reddit.com/r/rust/comments/2qmeeq/rfc_rename_intuint_to_intxuintx/cn8ugag/) with painful clarity:


> Importantly though: There was almost zero participation from members of the core team in [the public discussion thread](https://github.com/rust-lang/rfcs/pull/464). That's what I most think is not right. When anyone else has an opinion on an RFC that they want to express, whether in support or opposition, what they have to do is to lay out their reasoning as a comment in the discussion thread. Then other people can read, be swayed by it, or not, respond to it, and a productive discussion may ensue. Why is it a good idea for members of the core team to be entitled to skip this, to keep their reasoning and discussions to themselves, and only reveal it together with their final decision?

This moment crystallized the dysfunction in the early days of RFCs. I’m proud to say that the core team ultimately responded by going back to square one and [fully engaging](https://internals.rust-lang.org/t/restarting-the-int-uint-discussion/1131), and in the end, the decision was reversed.

But more important than that: the experience led to numerous shifts in the process. The most direct was codifying what I call the “No New Rationale” rule:


- **No New Rationale**: decisions must be made only on the basis of rationale already debated in public (to a steady state)

Here’s what we say about this in the [RFC process README](https://github.com/rust-lang/rfcs) (emphasis mine):


- At some point, a member of the subteam will propose a "motion for final comment period" (FCP), along with a *disposition* for the RFC (merge, close, or postpone).
  - This step is taken when enough of the tradeoffs have been discussed that the subteam is in a position to make a decision. That does not require consensus amongst all participants in the RFC thread (which is usually impossible). **However, the argument supporting the disposition on the RFC needs to have already been clearly articulated, and there should not be a strong consensus** ***against*** **that position outside of the subteam**. Subteam members use their best judgment in taking this step, and the FCP itself ensures there is ample time and notification for stakeholders to push back if it is made prematurely.

The “FCP” process, which involves consent of all subteam members, plays out entirely on the RFC thread, and is mediated by our beloved @rfcbot. And it’s specifically designed to signal that the team believes the discussion has reached a steady state, and give participants ample time to object if they disagree (or believe that some commentary hasn’t been sufficiently addressed).

In addition, *all* major project decisions [must go through the RFC process.](https://github.com/rust-lang/rfcs#when-you-need-to-follow-this-process)

The unifying theme here is a steady move away from “being in the room when it happens” to a fully inclusive process, and it’s something we’re always working to improve.

----------

So with all of that, why am I troubled? Because I’m seeing increasing signs of distrust, “us vs them” thinking, and people feeling like they have to yell in order to be listened to. And I’m also seeing a lot of divergent understanding of how the RFC/decision-making process is *supposed* to work.

The Rust community prides itself on being a friendly and welcoming place, but it’s going to take constant, explicit work to keep it that way — and part of that work is being forthright about the cases where things have gotten less than friendly, pausing and working together to figure out why.

In the [next post](http://aturon.github.io/2018/06/02/listening-part-2/) on this topic, I plan to focus on the kinds of breakdown I’ve been seeing, and some of my hypotheses about the underlying causes.
