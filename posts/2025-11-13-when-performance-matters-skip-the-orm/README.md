# When Performance Matters, Skip the ORM

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Performance, Latency, Software Development, DevOps

Description: ORMs are great when iteration speed matters more than raw throughput. But once you are optimizing a hot path for performance, the abstraction leaks. Here's how we think about the trade-offs, how to measure the cost, and the pragmatic way to build fast services without an ORM.

> Performance is a product choice. If you need every millisecond, choose the data access strategy that lets you shape the query, not the tool that writes one for you.

When teams feel their API is “slow,” the instinct is to profile the code around the database. Typically the slowdown *is* the database - specifically, the overhead introduced by an Object-Relational Mapper (ORM). ORMs are phenomenal for rapid prototyping, but once latency and throughput become hard requirements, they often stand in the way. Here's how we decide when to ditch the ORM and what to do instead.

## 1. The Abstraction Tax Adds Up Fast

Every ORM layer has to solve hard problems: mapping relationships, generating SQL safely, tracking entity state, and managing migrations. Those are real features - but they come with a runtime cost.

Common symptoms we see when profiling ORM-heavy services:

- **Chatty query plans:** N+1 fetches, hidden eager loads, or redundant joins.
- **Serialization overhead:** Converting rows to objects that are immediately re-serialized to JSON.
- **Lost optimizer hints:** ORMs limit access to query planner controls like `INDEX` hints or `ANALYZE` timing.
- **Inefficient batching:** Framework-level prefetch still issues dozens of network round-trips.

When your P99 is creeping past your SLO, that abstraction tax shows up in every trace. Removing the ORM gives you back direct control of the SQL, the transaction boundaries, and the shape of the data you return.

## 2. Know When the ORM Is Working Against You

A good heuristic: if a code path is both high-traffic and performance-sensitive, you can’t afford ORM overhead there. Watch for these red flags in your telemetry and logs:

| Signal | What it shows | Why it matters |
| --- | --- | --- |
| `db.query.duration` spikes on a single endpoint | ORM is emitting multiple sequential queries | Per-request latency balloons even with small data sizes |
| High CPU time in serialization layers | ORM is hydrating full models for partial responses | Wasted CPU and memory per request |
| Query plans with implicit joins | ORM-generated SQL takes the long path | Forces planner into costly nested loops |

When we see any of the above in tracing or query plans, we rewrite the hot path using direct SQL access. The result is predictable latency and fewer surprises in production.

## 3. Raw SQL Doesn’t Mean Unsafe or Unmaintainable

Skipping the ORM isn’t a return to string-concatenation SQL. Use a thin query builder (Knex, SQLX, pgtyped) or even generated parameterized statements. The key is *you* own the SQL. For example, in a Node.js service:

```ts
// db/users.ts
import { Pool } from "pg";

const pool = new Pool();

export async function findActiveUsers(limit: number) {
  const text = `SELECT id, email, last_seen_at
                FROM users
                WHERE status = $1
                ORDER BY last_seen_at DESC
                LIMIT $2`;

  // Avoid ORM hydration; return rows directly
  const { rows } = await pool.query({ text, values: ["active", limit] });
  return rows;
}
```

A few guidelines keep this maintainable:

- **Centralize SQL** alongside the domain it supports; version it with migrations.
- **Enforce linting and formatting** so query style stays consistent.
- **Wrap results** in `zod`/`io-ts` schemas if you need runtime validation.
- **Instrument at the data layer** so traces still show `db.statement` metadata.

Raw SQL with guardrails still gives you type safety, auditing, and observability - without the heavy abstraction.

## 4. Keep ORMs for the Right Jobs (Just Not Hot Paths)

We still use ORMs in a few places where they shine:

- Internal admin tooling or analytics dashboards.
- Background jobs that process bulk records with relaxed SLAs.
- Rapidly-evolving features where schema churn is high.

But for anything in the critical path we:

1. Design the SQL by hand and review the query plan.
2. Benchmark the endpoint using representative datasets.
3. Ship with tracing and slow-query alerts wired in.

This hybrid approach keeps developer productivity high where performance is irrelevant, and performance high where it matters.

## 5. Start With Measurement, End With Discipline

Performance work only sticks if it’s measurable. Before ripping out the ORM, capture the baseline:

- Record P50/P95/P99 latency and throughput.
- Export the ORM-generated SQL and compare to your handcrafted version.
- Use the database’s `EXPLAIN ANALYZE` to verify row counts, buffers, and joins.

After you ship the raw SQL path, keep a regression budget: if a future change adds back an ORM model or introduces a new implicit join, it should fail CI or alert.

For broader context on managing the weight of abstractions, we wrote about the hidden impact of unnecessary dependencies here: https://oneuptime.com/blog/post/2025-09-02-the-hidden-costs-of-dependency-bloat-in-software-development/view

---

**Bottom line:** ORMs are productivity tools, not performance tools. When customers feel latency or your SLO is on the line, own the SQL. The moment you control the queries directly, tuning becomes obvious, the database does less guesswork, and your service delivers the reliability users expect.
