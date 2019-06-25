---
layout: post
title:  "Closing out an incredible week in Rust"
---

This week has been so amazing that I just *had* to write about it. Here's a
quick list of *some* of what went down in *one week*:

- **Breakthrough #1**: @withoutboats and @eddyb tag-teamed to develop a *safe*,
  *library*-based [foundation for borrowing in async blocks]. It's suddenly
  seeming plausible to ship async/await notation *with borrowing* as part of
  Rust Epoch 2018.

- **Breakthrough #2**: @nikomatsakis had a eureka moment and figured out a path
  to make specialization sound, while still supporting its most important use
  cases (blog post forthcoming!). Again, this suddenly puts specialization on
  the map for Rust Epoch 2018. **Update**: the post is [here](http://smallcultfollowing.com/babysteps/blog/2018/02/09/maximally-minimal-specialization-always-applicable-impls/)!

- **Breakthrough #3**: @seanmonstar came up with [a brilliant way to make
  "context arguments" more ergonomic], which lets us make a long-desired
  change to the futures crate without regressing ergonomics.

- **Tokio reform**: @carllerche shipped the [newly reformed Tokio crate], with a
  plan for intercepting ongoing work with futures and laying a more
  stable foundation for async I/O in 2018.

- **Futures 0.2**: @cramertj, @alexcrichton and I have completed and merged [an RFC for
  futures 0.2], and the [0.2 branch] made a ton of progress.

- **Domain working groups**: we now have an all-star lineup for [leading the 2018 Domain Working Groups]:
  - Networking services: @withoutboats and @cramertj
  - WebAssembly: @fitzgen
  - CLI apps: @killercup
  - Embedded: @japaric

- **Libs Team restructuring**: we finalized a revamp of the Libs Team, which will break out:
  - a subgroup to manage `std` led by @alexcrichton,
  - a subgroup working on discoverability led by myself, and
  - a subgroup supporting ecosystem work led by @kodraus

- **A vision for portability in Rust**: I finally wrote up [the vision we've been
  working toward] for a uniform way of handling portability concerns in Rust.

These are just the items that loomed large for me personally; one of the great
things about how Rust has grown last year is that it has taken on an increasing
set of leaders and teams doing great work independently. It's now simply
impossible to drink from the full firehose. But even a sip from the firehose,
like the list above, can blow you away.

[foundation for borrowing in async blocks]: https://boats.gitlab.io/blog/post/2018-02-07-async-iv-an-even-better-proposal/
[newly reformed Tokio crate]: https://tokio.rs/blog/2018-02-tokio-reform-shipped/
[an RFC for futures 0.2]: https://github.com/rust-lang-nursery/futures-rfcs/pull/1
[a brilliant way to make "context arguments" more ergonomic]: https://github.com/rust-lang-nursery/futures-rfcs/pull/2#issuecomment-363923477
[0.2 branch]: https://github.com/rust-lang-nursery/futures-rs/tree/0.2
[leading the 2018 Domain Working Groups]: https://internals.rust-lang.org/t/announcing-the-2018-domain-working-groups/6737
[the vision we've been working toward]: http://aturon.github.io/2018/02/06/portability-vision/
