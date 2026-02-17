# Vibe Coding and the Observability Gap

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, DevOps, Monitoring

Description: AI-assisted coding is shipping code faster than ever. But if you don't deeply understand every line, you need observability to catch what you missed.

Andrej Karpathy called it "vibe coding" — you describe what you want, the AI writes it, you accept the diff, and the thing mostly works. It's not a joke. It's how a growing number of developers actually ship software in 2026.

And it works. Sort of.

The code compiles. The tests pass (if there are tests). The feature does what you asked. But there's a gap between "it works on my machine" and "it works in production at 3 AM when traffic spikes." That gap has always existed. Vibe coding makes it wider.

## The Problem Isn't the Code Quality

Let's get this out of the way: AI-generated code isn't inherently worse than human-written code. Sometimes it's better. It follows patterns consistently, doesn't get tired, and doesn't cut corners because it's Friday afternoon.

The problem is understanding. When you write code line by line, you build a mental model of how it behaves — the edge cases, the failure modes, the performance characteristics. When you accept a 200-line diff from an AI, that mental model is thinner. You know *what* it does. You might not know *how* it fails.

This isn't a skill issue. It's a physics issue. You can't deeply understand code at the speed you can generate it.

## Where Things Break

Here's what typically goes wrong with AI-assisted code in production:

**Memory and resource usage.** AI models optimize for correctness, not efficiency. That elegant solution might allocate objects in a loop, hold database connections open, or buffer entire responses in memory. It works in development. It falls over under load.

**Error handling at boundaries.** AI is great at the happy path. The sad path — network timeouts, malformed inputs, partial failures, race conditions — is where things get creative. AI-generated error handling tends to be generic. Production errors are specific.

**Implicit assumptions.** The AI assumed your database supports transactions. It assumed the API returns JSON. It assumed the file system is writable. These assumptions are invisible until they're violated.

**Dependency behavior.** AI pulls in libraries and uses them according to documentation. But libraries have bugs, version-specific behavior, and undocumented quirks. The AI doesn't know that `axios` behaves differently with certain proxy configurations, or that a particular ORM version has a connection pool leak.

None of these show up in unit tests. All of them show up in production.

## Observability Is the Safety Net

If you can't fully understand every line of code before it ships — and let's be honest, even without AI, most of us couldn't — you need something that tells you what's actually happening at runtime.

That means:

**Traces that show you the full request lifecycle.** Not just "this endpoint is slow," but exactly which database query, which external call, which function is the bottleneck. When AI-generated code introduces an N+1 query you didn't notice in review, traces make it visible.

**Logs with context.** Structured logs that tell you not just what happened, but the state of the system when it happened. When that generic `catch (error)` block fires in production, you need to know what inputs triggered it and what the system was doing at the time.

**Metrics that establish baselines.** You need to know what "normal" looks like before you can detect "abnormal." Memory usage trending up? Response times creeping? Error rates spiking on a specific endpoint? These patterns emerge from metrics, not from reading code.

**Alerts that wake you up before users notice.** If you shipped code you don't fully understand, you need an early warning system. Not a dashboard you check manually — an active system that monitors thresholds and tells you when something's off.

## The Faster You Ship, the More You Need to Monitor

This is the part people get backwards. They think: "We're moving fast with AI, we'll add monitoring later." But the speed is exactly why you need monitoring *now*.

When you're shipping features in hours instead of days, the blast radius of a bad deploy is smaller (because you can fix it faster), but the frequency of potential issues is higher. You're deploying more often. Each deploy has code you spent less time reviewing. The compound risk adds up.

The teams that ship fastest with AI tools are the ones with the strongest observability. They can afford to move fast because they'll catch problems in minutes, not days.

## What Good Looks Like

A team doing vibe coding well has this stack:

1. **Distributed tracing** on every service, so any performance regression from AI-generated code is immediately visible.
2. **Structured logging** with enough context to debug issues without reproducing them locally.
3. **Real-time metrics** with automated anomaly detection — catch the memory leak before it causes an OOM.
4. **Status pages** that communicate issues to users automatically, because when you ship fast, some things will break.
5. **Incident management** with runbooks, because the person on-call might not be the person who accepted the AI-generated diff.
6. **Error tracking** that groups and deduplicates, so you see patterns instead of noise.

This isn't optional tooling. It's the infrastructure that makes fast AI-assisted development sustainable.

## The Meta Point

Vibe coding isn't going away. It's going to get better, faster, and more prevalent. The developers who thrive won't be the ones who resist it, and they won't be the ones who blindly trust it. They'll be the ones who pair it with systems that tell them the truth about what their code is doing in production.

Observability was already important. AI-assisted coding makes it non-negotiable.

The vibe is real. Just make sure you can see what it's doing.
