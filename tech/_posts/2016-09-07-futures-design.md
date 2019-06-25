---
layout: post
title:  "Designing futures for Rust"
---

I [recently wrote](http://aturon.github.io/blog/2016/08/11/futures/) about the
importance of asynchronous I/O in Rust and the aims of the new
[futures](https://github.com/alexcrichton/futures-rs) library. This post deepens
the story by explaining the core *design* of that library. If you're looking for
more on the *use* of the library, you'll have to wait; we're very actively
working on the [Tokio stack](http://aturon.github.io/blog/2016/08/26/tokio/) and
will have more to say once that's settled down a bit.

To recap, **the aim is robust and ergonomic async I/O with no performance
penalty**:

- **Robust**: the library should have a strong story for error handling,
  cancellation, timeouts, backpressure, and other typical concerns for writing
  robust servers. This being Rust, we'll also of course
  [guarantee thread safety](https://blog.rust-lang.org/2015/04/10/Fearless-Concurrency.html).

- **Ergonomic**: the library should make writing asynchronous code as painless
  as possible—ideally, as easy as writing synchronous code, but with greater
  expressivity. While the latter will require
  [`async`/`await`](https://en.wikipedia.org/wiki/Await) to fully achieve, the
  futures library provides a high-level way of expressing and combining
  asynchronous computation, similar to Rust's successful
  [`Iterator` API](https://static.rust-lang.org/doc/master/std/iter/trait.Iterator.html).

- **Zero cost**: code written using the library should compile down to something
  equivalent (or better than) "hand-rolled" server implementations, which would
  typically use manual state machines and careful memory management.

Achieving these goals requires a mix of existing techniques in Rust, and some
new ideas about how to build a futures library; this post will cover both. In a
nutshell:

- **Leverage Rust's traits and closures for ergonomics and cost-avoidance**.
  Traits and closures in Rust do *not* require heap allocation or dynamic
  dispatch—facts we take heavy advantage of. We also use the trait system to
  package up the futures API in a simple and convenient way.

- **Design the core `Future` abstraction to be *demand-driven*, rather than callback-oriented**.
  (In async I/O terms, follow the "readiness" style rather than the "completion" style.)
  That means that composing futures together does not involve creating
  intermediate callbacks. As we'll see, the approach also has benefits for
  backpressure and cancellation.

- **Provide a *task* abstraction, similar to a green thread, that drives a future to completion**.
  Housing futures within a task is what enables the library code to compile down
  to the traditional model, i.e., with big state machines that can serve as a
  callback for a large number of underlying events.

Let's dive in!

## Background: traits in Rust

> We'll start with a quick review of traits in Rust. If you want more reading on
> these topics, you might check out the longer
> [overview of traits](https://blog.rust-lang.org/2015/05/11/traits.html).

To understand how the futures design works, you need to have a basic grasp on
Rust's traits. I won't attempt a complete introduction here, but I'll try to hit
the most relevant highlights for making sense of what's going on.

Traits provide Rust's sole notion of *interface*, meaning that a trait
is an abstraction that can apply to many concrete types. For example, here's a
simplified trait for hashing:

```rust
trait Hash {
    fn hash(&self) -> u64;
}
```

This trait stipulates that the type implementing it must provide a `hash`
method, which
[borrows](http://blog.skylight.io/rust-means-never-having-to-close-a-socket/)
`self` and produces a `u64`. To implement the trait, you have to give a concrete
definition for the method, like the following simple-minded one:

```rust
impl Hash for bool {
    fn hash(&self) -> u64 {
        if *self { 0 } else { 1 }
    }
}

impl Hash for i32 { ... } // etc
```

Once these implementations are in place, you can make calls like `true.hash()`
to invoke the method directly. But often the methods are called via *generics*,
which is where traits truly act as an abstraction:

```rust
fn print_hash<T: Hash>(t: &T) {
    println!("The hash is {}", t.hash())
}
```

The `print_hash` function is generic over an unknown type `T`, but requires that
`T` implements the `Hash` trait. That means we can use it with `bool` and `i32`
values:

```rust
print_hash(&true);   // instantiates T = bool
print_hash(&12);     // instantiates T = i32
```

**Generics are compiled away, resulting in static dispatch**. That is, as with
C++ templates, the compiler will generate *two copies* of the `print_hash`
method to handle the above code, one for each concrete argument type.  That in
turn means that the internal call to `t.hash()`—the point where the
abstraction is actually used—has zero cost: it will be compiled to a direct,
static call to the relevant implementation:

```rust
// The compiled code:
__print_hash_bool(&true);  // invoke specialized bool version directly
__print_hash_i32(&12);     // invoke specialized i32 version directly
```

Compiling down to non-generic code is essential for making an abstraction like
futures work without overhead: most of the time, that non-generic code will also
be inlined, letting the compiler produce and optimize large blocks of code that
resemble what you might have written in a low-level, "hand-rolled" style.

Closures in Rust work the same way—in fact, they're just traits. That means, in
particular, that creating a closure does not entail heap allocation, and calling
a closure can be statically-dispatched, just like the `hash` method above.

Finally, traits can *also* be used as "objects", which cause the trait methods
to be *dynamically* dispatched (so the compiler doesn't immediately know what
implementation a call will use). The benefit to trait objects is for
*heterogeneous collections*, where you need to group together a number of
objects which may have different underlying types but all implement the same
trait. Trait objects must always be behind a pointer, which in practice usually
requires heap allocation.

## Defining futures

Now, let's turn to futures. The
[earlier post](http://aturon.github.io/blog/2016/08/11/futures/) gave an
informal definition of a future:

> In essence, a future represents a value that might not be ready yet. Usually,
> the future becomes *complete* (the value is ready) due to an event happening
> somewhere else.

Clearly, we'll want futures to be some kind of trait, since there will be many
different kinds of "values that aren't ready yet" (e.g. data on a socket, the
return value from an RPC call, etc.). But how do we represent the "not ready
yet" part?

### False start: the callback (aka completion-based) approach

There's a very standard way to describe futures, which we found in every
existing futures implementation we inspected: as a function that subscribes a
*callback* for notification that the future is complete.

* **Note**: In the async I/O world, this kind of interface is sometimes referred
to as *completion-based*, because events are signaled on completion of
operations;
[Windows's IOCP](https://msdn.microsoft.com/en-us/library/windows/desktop/aa365198(v=vs.85).aspx)
is based on this model.

In Rust terms, the callback model leads to a trait like the following:

```rust
trait Future {
    // The type of value produced by the future
    type Item;

    // Tell the future to invoke the given callback on completion
    fn schedule<F>(self, f: F) where F: FnOnce(Self::Item);
}
```

The `FnOnce` here is a trait for closures that will be invoked at most
once. Because `schedule` is using generics, it will statically dispatch any
calls to that closure.

Unfortunately, **this approach nevertheless forces allocation at almost every
point of future composition, and often imposes dynamic dispatch**, despite our
best efforts to avoid such overhead.

To see why, let's consider a basic way of combining two futures:

```rust
fn join<F, G>(f: F, g: G) -> impl Future<Item = (F::Item, G::Item)>
    where F: Future, G: Future
```

This function takes two futures, `f` and `g`, and returns a new future that
yields a pair with results from both. The `join`ed future completes only when
*both* of the underlying futures complete, but allows the underlying futures to
execute concurrently until then.

How would we implement `join` using the above definition of `Future`? The
`join`ed future will be given a single callback `both_done` which expects a
pair. But the underlying futures each want their own callbacks `f_done` and
`g_done`, taking just their own results. Clearly, we need some kind of *sharing*
here: we need to construct `f_done` and `g_done` so that either can invoke
`both_done`, and make sure to include appropriate synchronization as well. Given
the type signatures involved, there's simply no way to do this without
allocating (in Rust, we'd use an `Arc` here).

This kind of problem was repeated in many of the future combinators.

Another problem is that event sources like event loops need to invoke callbacks
of arbitrary, different types—a case of the heterogeneity mentioned above. As a
concrete example, when a socket is ready for reading, that event will need to be
dispatched to *some* callback, and in general you'll need a mix of different
futures to be in play with different sockets. To make this work, you end up
needing to heap-allocate callbacks for the event loop *at every point the future
wants to listen for an event*, and dynamically dispatch notifications to those
callbacks.

TL;DR, we were unable to make the "standard" future abstraction provide
zero-cost composition of futures, and we know of no "standard" implementation
that does so.

### What worked: the demand-driven (aka readiness-based) approach

After much soul-searching, we arrived at a new "demand-driven" definition of
futures. Here's a **simplified** version that ignores the error handling of
[the real trait](http://alexcrichton.com/futures-rs/futures/trait.Future.html):

```rust
// A *simplified* version of the trait, without error-handling
trait Future {
    // The type of value produced on success
    type Item;

    // Polls the future, resolving to a value if possible
    fn poll(&mut self) -> Async<Self::Item>;
}

enum Async<T> {
    /// Represents that a value is immediately ready.
    Ready(T),

    /// Represents that a value is not ready yet, but may be so later.
    NotReady,
}
```

The API shift here is straightforward: rather than the future proactively
invoking a callback on completion, an external party must *poll* the future to
drive it to completion. The future can signal that it's not yet ready and must
be polled again at some later point by returning `Async::NotReady` (an
abstraction of `EWOULDBLOCK`).

* **Note**: In the async I/O world, this kind of interface is sometimes referred
  to as *readiness-based*, because events are signaled based on "readiness" of
  operations (e.g. bytes on a socket being ready) followed by an attempt to
  complete an operation;
  [Linux's epoll](http://man7.org/linux/man-pages/man7/epoll.7.html) is based on
  this model. (This model can also express completion, by treating the
  completion of an operation as the signal that the future is ready for
  polling.)

By eliminating all the intermediate callbacks, we've addressed some of the key
problems of the previous version of the trait. But we've introduced a new one:
after `NotReady` is returned, who polls the future, and when do they do so?

Let's take a concrete example. If a future is attempting to read bytes from a
socket, that socket may not be ready for reading, in which case the future can
return `NotReady`. *Somehow*, we must arrange for the future to later be "woken
up" (by calling `poll`) once the socket becomes ready. That kind of wakeup is
the job of the event loop. But now we need some way to connect the signal at the
event loop back to continuing to poll the future.

The solution forms the other main component of the design: tasks.

### The cornerstone: tasks

**A *task* is a future that is being executed**. That future is almost always
made up of a chain of other futures, as in the example from the original post:

```rust
id_rpc(&my_server).and_then(|id| {
    get_row(id)
}).map(|row| {
    json::encode(row)
}).and_then(|encoded| {
    write_string(my_socket, encoded)
})
```

The key point is that there's a difference between functions like `and_then`,
`map` and `join`, which combine futures into bigger futures, and functions that
*execute* futures, like:

- The `wait` method, which simply runs the future as a task pinned to the
  current thread, blocking that thread until a result is produced and returned.

- The `spawn` method on a thread pool, which launches a future as an independent
  task on the pool.

These *execution* functions create a task that contains the future and is
responsible for polling it. In the case of `wait`, polling takes place
immediately; for `spawn`, polling happens once the task is *scheduled* onto a
worker thread.

However polling begins, if any of the interior futures produced a `NotReady`
result, it can grind the whole task to a halt—the task may need to wait for
some event to occur before it can continue. In synchronous I/O, this is where a
thread would block. Tasks provide an equivalent to this model: the task "blocks"
by yielding back to its executor, **after installing itself as a callback for
the events it's waiting on**.

Returning to the example of reading from a socket, on a `NotReady` result the
task can be added to the event loop's dispatch table, so that it will be woken
up when the socket becomes ready, at which point it will re-`poll` its future.
Crucially, though, the task instance stays fixed for the lifetime of the future
it is executing—**so no allocation is needed to create or install this callback**.

Completing the analogy with threads, tasks provide a `park`/`unpark` API for
"blocking" and wakeup:

```rust
/// Returns a handle to the current task to call unpark at a later date.
fn park() -> Task;

impl Task {
    /// Indicate that the task should attempt to poll its future in a timely fashion.
    fn unpark(&self);
}
```

Blocking a future is a matter of using `park` to get a handle to its task,
putting the resulting `Task` in some wakeup queue for the event of interest, and
returning `NotReady`. When the event of interest occurs, the `Task` handle can
be used to wake back up the task, e.g. by rescheduling it for execution on a
thread pool. The precise mechanics of `park`/`unpark` vary by task executor.

In a way, the task model is an instance of "green" (aka lightweight) threading:
we schedule a potentially large number of asynchronous tasks onto a much smaller
number of real OS threads, and most of those tasks are blocked on some event
most of the time. There's an essential difference from Rust's
[old green threading model](https://github.com/aturon/rfcs/blob/remove-runtime/active/0000-remove-runtime.md),
however: **tasks do not require their own stack**. In fact, all of the data
needed by a task is contained within its future. That means we can neatly
sidestep problems of dynamic stack growth and stack swapping, giving us truly
lightweight tasks without any runtime system implications.

Perhaps surprisingly, **the future within a task compiles down to a state
machine**, so that every time the task wakes up to continue polling, it
continues execution from the current state—working just like hand-rolled code
based on [mio](http://github.com/carllerche/mio). This point is most easily seen
by example, so let's revisit `join`.

### Example: `join` in the demand-driven model

To implement the `join` function, we'll introduce a new concrete type, `Join`,
that tracks the necessary state:

```rust
fn join<F: Future, G: Future>(f: F, g: G) -> Join<F, G> {
    Join::BothRunning(f, g)
}

enum Join<F: Future, G: Future> {
    BothRunning(F, G),
    FirstDone(F::Item, G),
    SecondDone(F, G::Item),
    Done,
}

impl<F, G> Future for Join<F, G> where F: Future, G: Future {
    type Item = (F::Item, G::Item);

    fn poll(&mut self) -> Async<Self::Item> {
        // navigate the state machine
    }
}
```

The first thing to notice is that `Join` is an *enum*, whose variants represent
states in the "join state machine":

- `BothRunning`: the two underlying futures are both still executing.
- `FirstDone`: the first future has yielded a value, but the second is still executing.
- `SecondDone`: the second future has yielded a value, but the first is still executing.
- `Done`: both futures completed, and their values have been returned.

Enums in Rust are represented without requiring any pointers or heap allocation;
instead, the size of the enum is the size of the largest variant. That's exactly
what we want—that size represents the "high water mark" of this little state
machine.

The `poll` method here will attempt to make progress through the state machine
by `poll`ing the underlying futures as appropriate.

Recall that the aim of `join` is to allow its two futures to proceed
concurrently, racing to finish. For example, the two futures might each
represent subtasks running in parallel on a thread pool. When those subtasks are
still running, `poll`ing their futures will return `NotReady`, effectively
"blocking" the `Join` future, while stashing a handle to the ambient `Task` for
waking it back up when they finish. The two subtasks can then race to *wake up*
the `Task`, but that's fine: **the `unpark` method for waking a task is
threadsafe, and guarantees that the task will `poll` its future at least once
after any `unpark` call**. Thus, synchronization is handled once and for all at
the task level, without requiring combinators like `join` to allocate or handle
synchronization themselves.

* You may have noticed that `poll` takes `&mut self`, which means that a given
  future cannot be `poll`ed concurrently—the future has unique access to its
  contents while polling. The `unpark` synchronization guarantees it.

One final point. Combinators like `join` embody "small" state machines, but
because some of those states involve additional futures, they allow additional
state machines to be *nested*. In other words, `poll`ing one of the underlying
futures for `join` may involve stepping through *its* state machine, before
taking steps in the `Join` state machine. **The fact that the use of the
`Future` trait does not entail heap allocation or dynamic dispatch is key to
making this work efficiently.**

In general, the "big" future being run by a task—made up of a large chain of
futures connected by combinators—embodies a "big" nested state machine in just
this way. Once more, Rust's enum representation means that the space required is
the size of the state in the "big" machine with the largest footprint. The space
for this "big" future is allocated in *one shot* by the task, either on the
stack (for the `wait` executor) or on the heap (for `spawn`). After all, the
data has to live *somewhere*—but the key is to avoid constant allocations as
the state machine progresses, by instead making space for the entire thing up
front.

## Futures at scale

We've seen the basics of demand-driven futures, but there are a number of
concerns about *robustness* that we also want to cover. It turns out that these
concerns are addressed naturally by the demand-driven model. Let's take a look
at a few of the most important.

### Cancellation

Futures are often used to represent substantial work that is running
concurrently. Sometimes it will become clear that this work is no longer
needed, perhaps because a timeout occurred, or the client closed a connection,
or the needed answer was found in some other way.

In situations like these, you want some form of *cancellation*: the ability to
tell a future to stop executing because you're no longer interested in its
result.

In the demand-driven model, cancellation largely "falls out". All you have to do
is stop polling the future, instead "dropping" it (Rust's term for destroying
the data). And doing so is usually a natural consequence of nested state
machines like `Join`. Futures whose computation requires some special effort to
cancel (such as canceling an RPC call) can provide this logic as part of their
`Drop` implementation.

### Backpressure

Another essential aspect of at-scale use of futures (and their close relative,
streams) is *backpressure*: the ability of an overloaded component in one part
of a system to slow down input from other components. For example, if a server
has a backlog of database transactions for servicing outstanding requests, it
should slow down taking new requests.

Like cancellation, backpressure largely falls out of our model for futures and
streams. That's because tasks can be indefinitely "blocked" by a future/stream
returning `NotReady`, and notified to continue polling at a later time. For the
example of database transactions, if enqueuing a transaction is itself
represented as a future, the database service can return `NotReady` to slow down
requests. Often, such `NotReady` results cascade backward through a system,
e.g. allowing backpressure to flow from the database service back to a
particular client connection then back to the overall connection manager. Such
cascades are a natural consequence of the demand-driven model.

### Communicating the cause of a wakeup

If you're familiar with interfaces like
[epoll](http://man7.org/linux/man-pages/man7/epoll.7.html), you may have noticed
something missing from the `park`/`unpark` model: it provides no way for a task
to know *why* it was woken up.

That can be a problem for certain kinds futures that involve polling a large
number of other futures concurrently—you don't want to have to re-poll
*everything* to discover which sub-future is actually able to make progress.

To deal with this problem, the library offers a kind of "epoll for everyone":
the ability to associate "unpark events" with a given `Task` handle. That is,
there may be various handles to the same task floating around, all of which can
be used to wake the task up, but each of which carries different unpark events.
When woken, the future within the task can inspect these unpark events to
determine what happened. See
[the docs](http://alexcrichton.com/futures-rs/futures/task/fn.with_unpark_event.html)
for more detail.

## Wrapping up

We've now seen the core design principles behind the Rust futures and streams
library. To recap, it boils down to a few key ideas:

* Encapsulate running futures into *tasks*, which serve as a single, permanent
  "callback" for the future.

* Implement futures in a demand-driven, rather than callback-oriented, style.

* Use Rust's trait system to allow composed futures to flatten into big state
  machines.

Together, these ideas yield a robust, ergonomic, zero cost futures library.

As I mentioned at the outset of the post, we're very actively working on the
layers above the basic futures library—layers that incorporate particular I/O
models (like [mio](http://github.com/carllerche/mio)) and also provide
yet-higher-level tools for building servers. These layers are part of the Tokio
project, and you can read more about the overall vision in
[my earlier post](http://aturon.github.io/blog/2016/08/26/tokio/). As those APIs
stabilize, expect to see more posts describing them!
