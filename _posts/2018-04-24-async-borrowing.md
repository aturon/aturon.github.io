---
layout: post
title:  "Borrowing in async code"
---

The
[networking working group](https://internals.rust-lang.org/t/announcing-the-network-services-working-group-wg-net/7354) is
pushing hard on async/await notation for Rust, and @withoutbloats in particular
wrote a fantastic blog series working through the design space (final
post [here](https://boats.gitlab.io/blog/post/2018-04-06-async-await-final/)).

I wanted to talk a little bit about some of the *implications* of async/await,
which may not have been entirely clear. In particular, **async/await is not just
about avoiding combinators; it completely changes the game for borrowing**.

The core issue is that, while the `Future` trait does not itself impose a
`'static` bound, in practice futures have to be `'static` because they are
tossed onto executors like thread pools and hence not tied to any particular
stack frame. Today, what that means is that futures-based APIs have to be
careful not to hold on to borrows, and instead take ownership of whatever they
need. That in turn leads to all kinds of unidiomatic patterns, including
threading through ownership and widespread use of `Rc` and `RefCell`.

## Idioms in the standard library

To see what I mean, it's helpful to work through an example. Let's take the
`read` method from the standard library:

```rust
fn read(&mut self, buf: &mut [u8]) -> Result<usize, io::Error>
```

This method takes a mutable reference to both an I/O object and a buffer to read
into, then does the read synchronously. That lets you write idiomatic code like
the following:

```rust
let mut buf = [0; 1024];
let mut cursor = 0;

while cursor < 1024 {
    cursor += socket.read(&mut buf)?;
}
```

This is perfectly ordinary code, in which we repeatedly take mutable borrows
within a loop.

## Idioms in futures today

If we wanted to translate the above to an asynchronous setting using futures,
we'd need to use a futures-based analog to the read method. That exists today
with roughly the following signature:

```rust
fn read<T: AsMut<[u8]>>(self, buf: T) ->
    impl Future<Item = (Self, T, usize), Error = (Self, T, io::Error)>
```

That signature looks rather different! The reason is that we want the returned
future to be `'static`, so we have to pass in (and return) ownership of both the
I/O object and the buffer.

Not only is the signature more complicated: it's also unwieldy to use, even if
we employ async/await notation:

```rust
let mut buf = Box::new([0; 1024]); // box this up so we're not moving it around
let mut cursor = 0;

while cursor < 1024 {
    match await!(socket.read(buf)) {
        Ok((new_socket, new_buf, n)) => {
            socket = new_socket;
            buf = new_buf;
            cursor += n;
        }
        Err((new_socket, new_buf, e)) => {
            socket = new_socket;
            buf = new_buf;
            Err(e)?
        }
    }
}
```

While we could take steps to make this particular example easier, the fact is
that requiring you to always move values in and out of async code prevents you
from following the usual Rust idioms for borrowing.

## Borrowing in async code

You might wonder: why can't we just use the following signature instead?

```rust
fn read<'a>(&'a mut self, buf: &'a mut [u8]) -> impl Future<Item = usize, Error = io::Error> + 'a
```

And indeed, you *can* write and implement such a function; you just can't
effectively use it. The problem is that the future you get back contains
borrowed values, which today will prevent it from being used in most
futures-based code, due to there being a `'static` requirement to ultimately
execute futures.

This is where the async/await plan comes in: **you can `await` a future with
borrowed data, while still being `'static` overall!**. This is what it means to
support "borrowing across yield points", as explained in
@withoutboats's
[post](https://boats.gitlab.io/blog/post/2018-01-25-async-i-self-referential-structs/).

In particular, using this borrowing version of `read`, we can write:

```rust
async {
    let mut socket = /* .. */;
    let mut buf = [0; 1024];
    let mut cursor = 0;

    while cursor < 1024 {
        cursor += await!(socket.read(&mut buf))?;
    };

    buf
}
```

and the type of the `async` block will be:

```rust
impl Future<Item = [0; 1024], Error = io::Error> + 'static
```

Despite the fact that we borrow *internally* within the async block, the block
as a whole produces a `'static` future which we can spawn onto a thread pool or
other executor.

In other words, **the async/await proposal allows you to write fully idiomatic
Rust code that runs asynchronously**. That applies even to signatures; the
borrowing version of async `read` will ultimately look as follows:

```rust
async fn read(&mut self, buf: &mut [u8]) -> Result<usize, io::Error>
```

This signature is *exactly* the same as for the synchronous version, just with
an `async` on the front.

## The implications

The bottom line is that async/await isn't just about not having to use
combinators like `and_then`. It also fundamentally changes API design in the
async world, allowing us to use borrowing in the idiomatic style. Those who have
written much futures-based code in Rust will be able to tell you just how big a
deal this is.

Right now the networking WG is focused on landing async/await itself
(which
[will probably happen soon](https://github.com/rust-lang/rfcs/pull/2394#issuecomment-383773009)),
and providing a migration path for the futures crate. Once those basics are in
place, though, we'll be able to revisit APIs throughout the async stack and make
them more idiomatic. With luck, we'll have a very strong story in place for Rust 2018.

If you're interested in getting involved in this effort, please check out the [Net WG gitter]
and [repo]!

[Net WG gitter]: https://gitter.im/rust-lang/WG-net
[repo]: https://github.com/rust-lang-nursery/net-wg/
