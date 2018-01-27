---
layout: post
title:  "Specialization, coherence, and API evolution"
---

Specialization has been available in nightly Rust for over a year, and we&rsquo;ve
recently been thinking about the steps needed to stabilize it.

There are a couple of implementation issues that are currently blocked on an
<a href="https://github.com/rust-lang/rust-roadmap/issues/8">overhaul of the trait system</a>
which should be coming in the next couple of months.

What I want to talk about, though, is some deeper design questions that need to
be resolved prior to stabilization, ones involving potential changes to the core
specialization rules. This is a story that begins with a bold hope, runs
headlong into a tragic discovery, and ultimately ends up close to where it
started.

## A New Hope

A rite of passage for learning Rust&rsquo;s trait system is first encountering a
*coherence error*. Coherence is a vital but frustrating property; it
guarantees that there is always a single, unambiguous impl of a trait that is
used for any given type.

It&rsquo;s not too hard to see why coherence is vital. Imagine working with a
<code>HashMap</code> in which multiple implementations of <code>Hash</code> applied to the key
type. If different pieces of code ended up using different impls, map operations
would return totally bogus results, and it would be very difficult to track down
why.

What makes coherence frustrating is that, to enforce it, we must limit the kinds
of impls you can write in different crates. We do this through a pair of rules:

<ul>
<li><strong>The orphan rule</strong>, which *very roughly* says that you can write an impl only
if either your crate defined the trait or defined one of the types the impl is
for.</li>
<li><strong>The overlap rule</strong>, which says that a given trait cannot have two impls that
both apply to a single type (which would introduce ambiguity about which impl
to use), unless one is a specialization of the other.</li>
</ul>

These rules work closely together; in particular, the orphan rule ensures that
sibling crates can&rsquo;t accidentally define overlapping impls for a parent trait,
since their impls must each involve crate-local types.

Prior to Rust 1.0, we iterated quite a bit on these rules, and arrived at
the current design in the <a href="https://github.com/rust-lang/rfcs/pull/1023">Rebalancing coherence RFC</a>. That RFC was predicated
on a core assumption:

<blockquote>
The problem is that due to coherence, the ability to define impls is a
zero-sum game: every impl that is legal to add in a child crate is also an
impl that a parent crate cannot add without fear of breaking downstream
crates.
</blockquote>

<strong>However, with specialization, it seems this assumption may not longer hold!</strong>
The point of specialization is to allow for impls to overlap, and then to select
the &ldquo;most specific&rdquo; impl. That means, in particular, that it&rsquo;s feasible for a
parent and child crate to safely define overlapping impls. Niko wrote a
<a href="http://smallcultfollowing.com/babysteps/blog/2016/10/24/supporting-blanket-impls-in-specialization/">blog post</a>
proposing to leverage specialization in just this way.

<h3 id="the-fundamental-attribute">The <code>fundamental</code> attribute</h3>

The existing orphan rule is based on an idea of &ldquo;fundamental&rdquo; types. It&rsquo;s
easiest to understand how it works through example:
<div class="highlight"><pre><code class="language-rust" data-lang="rust"><span class="c-Doc">//// Parent crate ////</span>
<span class="k">trait</span> <span class="n">ParentTrait</span> <span class="p">{</span>
    <span class="k">fn</span> <span class="n">foo</span><span class="p">(</span><span class="o">&amp;</span><span class="bp">self</span><span class="p">);</span>
<span class="p">}</span>

<span class="c-Doc">//// Child crate ////</span>
<span class="k">struct</span> <span class="n">ChildType</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Box</span><span class="o">&lt;</span><span class="n">ChildType</span><span class="o">&gt;</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
</code></pre></div>
This example is permitted today, and works fine as written. However, it means
that adding the following blanket impl to the parent crate is a *breaking
change* (assuming that the new impl is not specializable):
<div class="highlight"><pre><code class="language-rust" data-lang="rust"><span class="c1">// Add to parent crate</span>
<span class="k">impl</span><span class="o">&lt;</span><span class="n">T</span><span class="o">&gt;</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Box</span><span class="o">&lt;</span><span class="n">T</span><span class="o">&gt;</span> <span class="p">{</span>
    <span class="c1">// note: not specializable, since we didn&#39;t write `default`</span>
    <span class="k">fn</span> <span class="n">foo</span><span class="p">(</span><span class="o">&amp;</span><span class="bp">self</span><span class="p">)</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="p">}</span>
</code></pre></div>
This change would introduce an overlap with the child crate&rsquo;s impl, which
prevents it from compiling.

To avoid *all* such new parent crate impls being breaking changes, the
<a href="https://github.com/rust-lang/rfcs/pull/1023">Rebalancing coherence RFC</a> introduced a restriction on child crates: roughly
speaking, their impls of parent traits much either directly reference a type
defined in the child crate, or reference it within a &ldquo;fundamental&rdquo; type
constructor (<code>&amp;</code>, <code>&amp;mut</code>, <code>Box</code>). In other words:
<div class="highlight"><pre><code class="language-rust" data-lang="rust"><span class="c1">// These child crate impls are allowed:</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">ChildType</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Box</span><span class="o">&lt;</span><span class="n">ChildType</span><span class="o">&gt;</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="k">impl</span><span class="o">&lt;</span><span class="nl">&#39;a</span><span class="o">&gt;</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="o">&amp;</span><span class="n">&#39;a</span> <span class="n">ChildType</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>

<span class="c1">// ... but these impls are NOT allowed:</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Vec</span><span class="o">&lt;</span><span class="n">ChildType</span><span class="o">&gt;</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="p">(</span><span class="n">ChildType</span><span class="p">,</span> <span class="n">ChildType</span><span class="p">)</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
</code></pre></div>
The idea is to strike a balance between the impls that child crates can have,
and the ones that parent crates can add over time. If a parent crate adds a
blanket impl involving a fundamental type constructor, that&rsquo;s a breaking change
(since it could overlap with a child crate). But if it adds one for
e.g. <code>Vec&lt;T&gt;</code>, that&rsquo;s fine, because no child crate could have an impl involving
that type.

This &ldquo;fundamental&rdquo; restriction is an arbitrary line drawn as part of the
&ldquo;zero-sum game&rdquo; of writing non-overlapping impls. It&rsquo;s applied using an unstable
attribute, <code>#[fundamental]</code>, which is difficult to understand and has had no
clear path toward stabilization.

<h3 id="a-positive-sum-game">A positive-sum game?</h3>

But wait. When we introduced specialization, we relaxed the overlap rule to
allow for overlap, *as long as one impl specialized the other*. Since the orphan
rule is ultimately about preventing overlap from arising between multiple
crates, maybe there&rsquo;s a way to leverage specialization there as well?

If we revisit the above example, but make the new parent crate impl
specializable (by using <code>default</code>), <strong>it no longer breaks the child crate</strong>. In
other words, the following impls can all safely coexist:
<div class="highlight"><pre><code class="language-rust" data-lang="rust"><span class="c-Doc">//// Parent crate ////</span>
<span class="k">trait</span> <span class="n">ParentTrait</span> <span class="p">{</span>
    <span class="k">fn</span> <span class="n">foo</span><span class="p">(</span><span class="o">&amp;</span><span class="bp">self</span><span class="p">);</span>
<span class="p">}</span>

<span class="k">impl</span><span class="o">&lt;</span><span class="n">T</span><span class="o">&gt;</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Box</span><span class="o">&lt;</span><span class="n">T</span><span class="o">&gt;</span> <span class="p">{</span>
    <span class="n">default</span> <span class="k">fn</span> <span class="n">foo</span><span class="p">(</span><span class="o">&amp;</span><span class="bp">self</span><span class="p">)</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
<span class="p">}</span>

<span class="c-Doc">//// Child crate ////</span>
<span class="k">struct</span> <span class="n">ChildType</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>

<span class="c1">// Now specializes the blanket impl from the parent crate</span>
<span class="k">impl</span> <span class="n">ParentTrait</span> <span class="k">for</span> <span class="n">Box</span><span class="o">&lt;</span><span class="n">ChildType</span><span class="o">&gt;</span> <span class="p">{</span> <span class="p">..</span> <span class="p">}</span>
</code></pre></div>
Is this always the case? In other words, if you add a new impl in the parent
crate and mark it specializable, are you guaranteed not to break any child
crates? That would allow us to get rid of <code>fundamental</code>, allowing both parent
and client crates to add more kinds of impls than they can today, without
breakage!

To make this idea work, you&rsquo;d need to expand the specialization rules a bit, as
Niko explains in
<a href="http://smallcultfollowing.com/babysteps/blog/2016/10/24/supporting-blanket-impls-in-specialization/">his post</a>. But
those details won&rsquo;t be too relevant to the core point of this post.

<h2 id="the-trait-system-strikes-back">The Trait System Strikes Back</h2>

Half way toward writing up an RFC with the above ideas, trying to prove to
myself that they worked, I started to get worried. And then I started trying to
prove that they didn&rsquo;t work. And it turns out they don&rsquo;t.

The crux of the problem is that the trait system is just too powerful; as we&rsquo;ve
learned over and over again, the trait system can be used to draw sneaky
connections that are hard to defend against. Let me show you what I mean.

Imagine we have three crates, arranged in the following way:
<div class="highlight"><pre><code class="language-rust" data-lang="rust"><span class="c-Doc">//// Crate A ////</span>

<span class="k">trait</span> <span class="n">A</span> <span class="p">{}</span>

<span class="c1">// Line we want to add:</span>
<span class="c1">// impl&lt;T&gt; A for T {}</span>


<span class="c-Doc">//// Crate B ////</span>

<span class="k">trait</span> <span class="n">B</span> <span class="p">{</span>
    <span class="k">type</span> <span class="n">Out</span><span class="p">;</span>
<span class="p">}</span>

<span class="k">impl</span><span class="o">&lt;</span><span class="n">T</span><span class="o">&gt;</span> <span class="n">B</span> <span class="k">for</span> <span class="n">T</span> <span class="n">where</span> <span class="n">T</span><span class="o">:</span> <span class="n">A</span> <span class="p">{</span>
    <span class="c1">// Note: not specializable</span>
    <span class="k">type</span> <span class="n">Out</span> <span class="o">=</span> <span class="p">();</span>
<span class="p">}</span>


<span class="c-Doc">//// Crate C ////</span>

<span class="k">struct</span> <span class="n">C</span><span class="p">;</span>

<span class="k">impl</span> <span class="n">B</span> <span class="k">for</span> <span class="n">C</span> <span class="p">{</span>
    <span class="k">type</span> <span class="n">Out</span> <span class="o">=</span> <span class="kt">bool</span><span class="p">;</span>
<span class="p">}</span>
</code></pre></div>
Here, we have *two* traits in action, linked by the impl in crate B. The problem
is that, because the traits are connected in this way, adding the impl in crate
A for trait A creates overlap for trait *B*. And crucially, it&rsquo;s not enough to
require that the impl we *added* be specializable; the problem is that the
existing impl in crate B, which crate A doesn&rsquo;t even know about, is not
specializable.

Like all of our problems around API evolution, this problem boils down to
*negative reasoning*. In particular, crate C is initially allowed to write its
impl because it knows, locally, that <code>C</code> does not implement <code>A</code> (and thus the
blanket impl in crate B doesn&rsquo;t apply). The problem is that crate C isn&rsquo;t the
only crate that gets to decide whether it&rsquo;s type implements <code>A</code>. So it&rsquo;s a
zero-sum game after all, and something like <code>fundemantal</code> is needed to
adjudicate between different crates.

You might ask: is it really essential to make specialization opt-in? And indeed,
if *all* impls were specializable, the idea would&rsquo;ve worked out.

However, it&rsquo;s not a tenable option. Associated types, in particular,
<a href="https://github.com/rust-lang/rfcs/blob/master/text/1210-impl-specialization.md#hazard-interactions-with-type-checking">need to opt in to specialization</a>,
and these days every method has an implicit associated type.

<h2 id="return-of-the-subset-rule">Return of the Subset Rule</h2>

So where does that lead us?

In the short term, it means that we should stick with the
<a href="https://github.com/rust-lang/rfcs/blob/master/text/1210-impl-specialization.md#permitting-overlap">subset rule</a>
as-is. (I didn&rsquo;t go into detail here, but Niko, Withoutboats and I had been
playing with some changes to support the idea of getting rid of fundamental,
which would also be breaking changes to the specialization rule; we&rsquo;re backing
off on that).

In the long term, there are several extensions we&rsquo;d like to explore for
specialization. While these extensions won&rsquo;t let us relax the orphan rule, they
will allow for more kinds of overlap, thereby making specialization usable in
more contexts.

<ul>
<li><a href="http://smallcultfollowing.com/babysteps/blog/2016/09/24/intersection-impls/"><strong>Intersection impls</strong></a>,
which allow arbitrary partial overlap between impls as long as there&rsquo;s an
additional impl that covers precisely the area of overlap (thereby avoiding
any ambiguity).</li>
<li><a href="http://smallcultfollowing.com/babysteps/blog/2016/10/24/supporting-blanket-impls-in-specialization/"><strong>Type structure precedence</strong></a>,
which considers more specific *type structure* before considering where
clauses. While the idea was originally motivated by relaxing the orphan rules,
which we can&rsquo;t do, it is still a potentially useful expansion of specialization.</li>
<li><strong>Child trumps parent</strong>, in which a child crate impl always specializes any
parent crate impl it overlaps with. This rule is particularly simple and is
usually what you want when such overlap arises.</li>
</ul>

The good news is that:

<ul>
<li>The current subset rule is forwards-compatible with *all* of these extensions.</li>
<li>Moreover, these extensions are compatible with each other!</li>
</ul>

I think it&rsquo;s probably worth ultimately landing all three extensions under
separate feature gates, to gain experience and determine which ones are most
useful. They are all pretty straightforward to implement.

In the meantime, though, we can press forward with stabilization of today&rsquo;s
specialization, as soon as the remaining implementation issues are resolved.
