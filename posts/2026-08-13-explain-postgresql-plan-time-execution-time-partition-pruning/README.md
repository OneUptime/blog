# Use EXPLAIN to Prove PostgreSQL Pruned Partitions at Plan Time or Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, EXPLAIN, Partition Pruning, Query Plans, Query Performance, Prepared Statements

Description: Read PostgreSQL plans for static, initialization-time, and per-loop partition pruning using child nodes, Subplans Removed, loops, and never-executed markers.

---

Seeing an <code>Append</code> node does not prove that PostgreSQL scanned every partition. PostgreSQL can prune partitions while planning, while initializing the executor, and while execution parameters change. Each phase leaves different evidence in <code>EXPLAIN</code>.

To validate pruning, ask two separate questions:

1. Which child plans had to exist?
2. Which child plans actually executed, and how often?

## Build a Small Controlled Hierarchy

Use a range-partitioned table whose bounds are easy to reason about:

~~~sql
CREATE TABLE events (
    event_id bigint NOT NULL,
    occurred_at date NOT NULL,
    payload text NOT NULL
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_07 PARTITION OF events
FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE events_2026_08 PARTITION OF events
FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE events_2026_09 PARTITION OF events
FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

ANALYZE events;
~~~

Keep <code>enable_partition_pruning</code> enabled:

~~~sql
SHOW enable_partition_pruning;
~~~

It is on by default. Disabling it is a useful diagnostic control, not a production tuning recommendation.

## Plan-Time Pruning: Irrelevant Children Are Absent

A constant range is known during planning:

~~~sql
EXPLAIN (COSTS OFF)
SELECT *
FROM events
WHERE occurred_at >= DATE '2026-08-10'
  AND occurred_at <  DATE '2026-08-11';
~~~

The plan should name only <code>events_2026_08</code>. PostgreSQL has compared the conditions with partition bounds and omitted July and September before execution.

If more than one child legitimately overlaps a range, an <code>Append</code> containing those children is correct. Pruning means excluding partitions that cannot match; it does not promise exactly one child.

Static pruning is easiest to prove because the irrelevant child scan nodes are simply not present. Compare with:

~~~sql
BEGIN;
SET LOCAL enable_partition_pruning = off;

EXPLAIN (COSTS OFF)
SELECT *
FROM events
WHERE occurred_at >= DATE '2026-08-10'
  AND occurred_at <  DATE '2026-08-11';
ROLLBACK;
~~~

Inside a transaction, <code>SET LOCAL</code> lasts until transaction end. With pruning off, the plan normally includes all children and filters within them. Do not use the comparison to claim a universal timing ratio; cache state, data, indexes, and planning all influence results.

## Initialization-Time Pruning: Read Subplans Removed

Some values are unavailable to the planner but known when the executor initializes. PostgreSQL documentation names prepared-statement parameters and values from init plans as examples of execution-time pruning.

Force a generic prepared plan for a controlled demonstration:

~~~sql
SET plan_cache_mode = force_generic_plan;

PREPARE event_day(date) AS
SELECT *
FROM events
WHERE occurred_at >= $1
  AND occurred_at < $1 + 1;

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
EXECUTE event_day(DATE '2026-08-10');
~~~

Because the generic plan cannot bake the actual date into a custom plan, it may retain an <code>Append</code> with potential children. At executor initialization, the parameter is known and partitions can be removed. Look for:

~~~text
Subplans Removed: 2
~~~

The exact plan shape is version-, schema-, and cost-dependent; do not require an <code>Append</code> when the planner selects another valid node. The key official behavior is that partitions pruned during initialization do not appear as executed child nodes, and the number removed is exposed by <code>Subplans Removed</code>.

PostgreSQL also notes an important limitation: partitions removed at executor initialization are still locked at the beginning of execution. Initialization pruning can save scans without eliminating all relation-lock overhead.

In normal <code>auto</code> plan-cache mode, PostgreSQL may choose custom plans for early executions and later choose a generic plan when its estimated cost is not much higher. The <code>PREPARE</code> documentation describes the policy. Capture both the prepared statement and the cache mode when explaining different plans across environments.

## Per-Loop Runtime Pruning: Inspect loops

An execution parameter can change during a parameterized nested-loop join. Imagine a small requested-days table:

~~~sql
CREATE TEMP TABLE requested_days(day date);
INSERT INTO requested_days VALUES
    (DATE '2026-07-10'),
    (DATE '2026-09-10');
ANALYZE requested_days;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS OFF)
SELECT d.day, e.event_id
FROM requested_days AS d
CROSS JOIN LATERAL (
    SELECT event_id
    FROM events AS e
    WHERE e.occurred_at >= d.day
      AND e.occurred_at <  d.day + 1
) AS e;
~~~

Whether PostgreSQL preserves the lateral shape as a parameterized nested loop depends on costing and transformations. For a plan that does, the outer value can change for each loop, and runtime pruning can select different event partitions.

The documentation tells you how to recognize this phase:

- inspect <code>loops</code> on each child;
- a child may execute fewer times than its parent;
- a child pruned on every iteration can display <code>(never executed)</code>.

Do not add child row counts together without accounting for loops. “Actual rows=10 loops=50” represents 10 rows per loop in text output, not necessarily 10 total.

If a demonstration plan flattens the lateral query or otherwise chooses an unparameterized plan, do not disable planner methods in application sessions just to obtain a desired screenshot. Use the actual production plan. Per-loop runtime partition pruning is useful only when the selected plan exposes changing parameters to a prune-capable partitioned scan.

## Use JSON for Automated Checks

Text plans are readable but brittle to parse. PostgreSQL supports JSON:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
EXECUTE event_day(DATE '2026-08-10');
~~~

Reset the prepared statement and session setting after the experiment:

~~~sql
DEALLOCATE event_day;
RESET plan_cache_mode;
~~~

Automation can walk the plan tree and record:

- relation names under scan nodes;
- <code>Subplans Removed</code>;
- actual loops;
- actual rows;
- planning and execution time;
- shared hit and read blocks.

Treat the JSON schema as PostgreSQL output that can evolve; pin checks to supported major versions and test upgrades. Avoid asserting exact cost or timing values. Assert invariants such as “no July or September scan executes for an August-only request.”

## Do Not Confuse Pruning With Filter Selectivity

This plan can be correctly pruned and still slow:

~~~sql
SELECT *
FROM events
WHERE occurred_at = DATE '2026-08-10'
  AND payload LIKE '%timeout%';
~~~

Pruning chooses the August relation. The <code>payload</code> predicate may then scan a large part of that relation. Look for <code>Rows Removed by Filter</code>, buffer reads, and the child access method. Pruning and indexes solve different levels of the problem.

Likewise, a child shown as <code>(never executed)</code> is evidence about this invocation and its parameter values, not proof that the partition can never be used. A later execution may route to it.

## Explain Safely

<code>EXPLAIN</code> without <code>ANALYZE</code> does not run the query. <code>EXPLAIN ANALYZE</code> does, including writes:

~~~sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM events
WHERE occurred_at < DATE '2026-07-15';
ROLLBACK;
~~~

This transaction pattern avoids committing the delete, but it still executes work and takes locks; it can generate WAL, fire applicable triggers, and affect concurrent sessions. A rollback is not a harmless dry run. Prefer a restored environment or a read-only representative query for risky analysis.

Timing overhead is also real. <code>TIMING OFF</code> can reduce per-node clock overhead while retaining actual rows and loops:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY ON)
SELECT *
FROM events
WHERE occurred_at >= DATE '2026-08-10'
  AND occurred_at <  DATE '2026-08-11';
~~~

## A Repeatable Pruning Audit

For every important query shape:

1. Record PostgreSQL major version and relevant settings.
2. Capture the partition key and current leaf bounds.
3. Run plain <code>EXPLAIN</code> with constants.
4. Run the real prepared form with production parameter types.
5. Use <code>EXPLAIN ANALYZE</code> safely to expose runtime evidence.
6. Record child relations, <code>Subplans Removed</code>, loops, and never-executed nodes.
7. Compare actual and estimated rows inside the surviving partitions.
8. Repeat at the full planned partition count.

Keep plan-time and execution-time conclusions separate in the report:

~~~text
Static literal:
  plan-time children: events_2026_08

Generic parameter:
  potential children in plan: 3
  initialization subplans removed: 2
  executed children: events_2026_08

Parameterized join:
  children used varied by outer row
  verify child loops in EXPLAIN ANALYZE
~~~

## Official Documentation

- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL: PREPARE](https://www.postgresql.org/docs/current/sql-prepare.html)
- [PostgreSQL: Planner Method Configuration](https://www.postgresql.org/docs/current/runtime-config-query.html#RUNTIME-CONFIG-QUERY-ENABLE)
- [PostgreSQL: Date/Time Operators](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL: pg_partition_tree](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

Plan-time pruning removes child plans before execution, initialization-time pruning is reported through <code>Subplans Removed</code>, and pruning driven by changing execution parameters appears in child loop counts and <code>(never executed)</code> nodes. Read all three signals. A potential child in an <code>Append</code> is not proof of a scan, and successful pruning is not proof that access within the surviving partition is efficient. Capture the real prepared form, parameter types, settings, and full plan before drawing a conclusion.
