---
layout: post
title:  "aturon.log: listening and trust, part 2"
---

In [the previous post](http://aturon.github.io/2018/05/25/listening-part-1/) in
this series, I recounted an early lesson for the Rust Core Team about working in
the open. In this post, I want to talk about the delicate interplay between
listening and trust when doing design in the open.

----------

> I honestly despise being subtle or "nice". The fact is, people need to know
> what my position on things are. And I can't just say "please don't do that",
> because people won't listen. I say "On the internet, nobody can hear you being
> subtle", and I mean it.

That’s Linus
Torvalds
[on talking and listening in OSS](https://marc.info/?l=linux-kernel&m=137391223711946&w=2).
There is, of course, a long and continuing battle in the OSS world around codes
of conduct, and Linus is often cited in these debates (by both sides). Given
that the Rust community is firmly in the pro-CoC camp, it’s tempting to think
that what Linus is describing here is simply not relevant in the Rust world.

But notice that Linus talks about two things here: being subtle, and being
nice. The “being nice” part is indeed covered by codes of conduct, and is by and
large not an issue for the Rust community. But the “being subtle” part is, well,
more subtle.

To be concrete, saying “This idea is insane” or “An idiotic unreadable mess” is
obviously not being nice, and the CoC draws a clear line here. But what about “I
**very strongly** object” or “Doing this would ruin what I love most about
Rust”? These aren’t personal attacks, and they’re often given along with
detailed technical critiques. Moreover, they accurately describe the feelings
being experienced by the author! Yet, I think such un-nuanced statements are
often counterproductive to the design approach at the heart of Rust.

I’m going to spend the rest of this post unpacking that sentiment.

## Pluralism and positive sums

In the run-up to 1.0, the Rust community went through a process of articulating
the value propositions of the language, and — relatedly! — the design values for
the project. We developed a pattern of slogans that summarized our understanding
at that point:

- Memory safety without garbage collection
- [Abstraction without overhead](https://blog.rust-lang.org/2015/05/11/traits.html)
- [Concurrency without data races](http://blog.rust-lang.org/2015/04/10/Fearless-Concurrency.html)
- [Stability without stagnation](https://blog.rust-lang.org/2014/10/30/Stability.html)

and ultimately: *Hack without fear*.

The common thread here is reconciling oppositions. Not just finding a balance in
a tradeoff, but finding ways to reduce or eliminate the tradeoff itself. In
our [2016 RustConf keynote](https://www.youtube.com/watch?v=pTQxHIzGqFI), Niko
and I talked about this as the Rust community "knowing how to have our cake and
eat it too", as part of our challenge to the community to take another such
step:

> In short, **productivity should be a core value of Rust**, and we should work
> creatively to improve it while retaining Rust’s other core values. By the end
> of 2017, we want to have earned the slogan: Rust: fast, reliable,
> productive—pick three.

Of course, such reconciliations are not always possible, and certainly aren’t
easy. It’s an aspiration, not an edict. **But Rust’s culture and design process
is engineered to produce such outcomes**, by embracing pluralism and
positive-sum thinking:

- **Pluralism** is about who we target: Rust seeks to simultaneously appeal to
  die-hard C++ programmers and to empower dyed-in-the-wool JS devs, and to reach
  several other varied audiences. That’s uncomfortable! These audiences are very
  different, they have divergent needs and priorities, and the usual adage
  applies: if you try to please everyone, you won’t please anyone. But...

- **Positive-sum thinking** is how we embrace pluralism while retaining a
  coherent vision and set of values for the language. A zero-sum view would
  assume that apparent oppositions are fundamental, e.g., that appealing to the
  JS crowd inherently hurts the C++ one. A positive-sum view starts by seeing
  different perspectives and priorities as *legitimate* and *worthwhile*, with a
  faith that **by respecting each other in this way, we can find strictly better
  solutions than had we optimized solely for one perspective.**

I can’t tell you the number of times I’ve experienced positive-sum outcomes when
working with the Rust community. Times when I’ve ended up with a design much
better than the one I started with, and got there because I thought it was
important to listen to people with different priorities.

But there's a lot of nuance here. Rust does not seek to be a language for
*everyone*, but the audiences and use cases it does target are nevertheless
diverse. And pluralism happens at the level of community and goals, *not* at the
level of the actual design. We don't embrace "there's more than one way to do
it" as a goal for our designs, nor do we "take the average" between opposed
priorities (and please no one). Ultimately, we have to make hard decisions.

It's the formal Rust teams, the people who make the final decisions, who are
tasked to take in and care about a plurality of *perspectives*, but ultimately put
forth a singular, coherent *vision*. They are the keepers of the vision, the
counterbalance to the process of exploration and give-and-take.

## Fear and power

> Second, [we must] "defend" the language many times, but failing once has
> dire consequences. No matter how good the defenders are, they are going to let
> something slip from time to time.

(from [Fortifying the process against feature bloat](https://internals.rust-lang.org/t/fortifying-the-process-against-feature-bloat/7608))

> Many times, the language team hasn’t had a chance to even read the thread
> before it spirals out of control like this one, because every little bit of
> discussion makes you feel like you’re losing the fight.

([comment from @rpjohnst](https://internals.rust-lang.org/t/pre-rfc-flexible-try-fn/7564/112))

The idea that discussions can be "purely technical", i.e. devoid of emotional
content, is bogus. If we care at any level about what we're discussing, then our
emotions are going to play a role, and more likely than not, they will spill
over onto the thread.

People care about Rust. It resonates with their values and experiences, in
specific and highly personal ways. Because of that context, seeing a proposal
that appears at odds with those values and experiences can be distressing. And
that feeling is only heightened when you also feel you have limited power.
Someone else is making the decision, there seems to be growing momentum around
it, and so you reach for the only tool you have: raising your voice as loud as
you can.

And so we come back to Linus's issue of "subtle" communication. His
recommendation is to amplify these feelings, to yell loud to make sure you're
heard. "I'm against every idea in this proposal". "This feature will ruin
Rust". "Rust is heading in the wrong direction".

These feelings are real and legitimate. But embracing and amplifying them works
directly against the principles of plurality and positive-sum
thinking. **Escalation encourages a zero-sum environment, an us-versus-them
battle, completely at odds with the positive-sum thinking that has led to Rust's
best innovations**. And it's a vicious cycle: if everyone is yelling, *truly*
listening becomes very painful, and you "grow a thicker skin" in part by
learning to not take other people's feelings so seriously... which means they
need to yell louder...

## Humility and trust

> Those that do argue for the proposal you hate often don’t have a strong
> opinion one way or the other yet—they may bring up counterpoints just to have
> them on the table, or to explore the design space. And, you should note, they
> often do wind up agreeing with you!

([comment from @rpjohnst](https://internals.rust-lang.org/t/pre-rfc-flexible-try-fn/7564/112))

Fear and creativity don't mix. Working in a positive-sum, pluralistic way
requires significant vulnerability and emotional labor:

- Humility, in order to genuinely question the instinct that your values, ideas
  and opinions are the Right Ones.

- Empathy, in order to genuinely "put on" someone else's perspective, needs and
  values as if they were your own.

- Introspection, in order to reach a deeper understanding of your own impulses and values.

We look for these skills when selecting people to join the Rust teams, and we
expect them to do this kind of work when exploring a design space. But this is
delicate work, and we do it best when the work is shared by the *whole*
community, not just team members. And, in particular, "unsubtle" shouting driven
by fear makes this work so, so much harder.

This is why I feel distraught when I see accusations of bad faith, of people
having an "agenda" and the "listening" done in the RFC process being a charade
to avoid revolt. Or the sense of "luckily enough of us yelled to stop the
terrifying original proposal from happening; the moment we stop speaking up,
Those People will start pushing in that direction again". All of these
sentiments indicate a rising distrust, a zero-sum power-focused framing, with
a dose of tribalism to boot.

What we need is to work against the vicious circle of escalation by creating a
virtuous circle instead, based on humility and trust. **If we can trust each
other to listen and take concerns seriously, we free ourselves to be uncertain
about those concerns, and open to possibilities that superficially work against
them**. In other words, we free ourselves to communicate and explore with
subtlety and nuance. Trust and humility go hand-in-hand. And they are the key to
finding positive-sum outcomes.

---

A code of conduct is not enough. Being "nice" is not enough. We need to take a
leap of faith and embrace humility and trust in our discussions. **It is my
strong belief that doing so will lead to strictly better ideas and decisions**,
enabling us to find positive-sum outcomes. But I also think it's vital for
keeping our plural community whole and inclusive.

In the next post in this series, I'll present some concrete case studies from
Rust's past and present, examining how the discussions functioned and what we
might learn from them.
