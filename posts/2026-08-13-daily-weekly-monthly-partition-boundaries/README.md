# Daily, Weekly, or Monthly Partitions? Choose From Retention and Query Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Time-Series Data, Range Partitioning, Data Retention, Query Performance, Capacity Planning

Description: Choose daily, weekly, or monthly PostgreSQL range partitions by balancing retention precision, query windows, leaf size, object count, late data, and measured planning cost.

---

The right time-partition boundary is the coarsest interval that still gives the pruning and lifecycle unit the system needs. Daily partitions are not inherently faster than monthly partitions, and equal-sized leaves are not the objective. Finer intervals reduce the maximum irrelevant range retained or scanned, but add tables, indexes, constraints, catalog metadata, locks, and automation.

Choose from retention and query windows first, then prove the choice at the complete horizon.

## Quantify the Object Count

For a two-year retention horizon:

| Boundary | Approximate leaves | With four leaf indexes |
| --- | ---: | ---: |
| Daily | 730 | 2,920 index objects |
| Weekly | 104 | 416 index objects |
| Monthly | 24 | 96 index objects |

These are rough planning values: leap years and partial intervals change counts. Subpartitioning multiplies them again. PostgreSQL documentation says the planner can handle up to a few thousand partitions fairly well when typical queries prune most of them, but planning time and memory increase as more remain. Many sessions touching many partitions also load metadata into each backend.

Count parent, intermediate, and leaf relations:

~~~sql
SELECT count(*) FILTER (WHERE isleaf) AS leaves,
       count(*) AS relations,
       max(level) AS depth
FROM pg_partition_tree('events'::regclass);
~~~

Do not wait two years to discover the object count. Build it in a disposable environment.

## Match the Retention Unit

PostgreSQL can detach or drop a whole partition far faster than deleting rows individually, avoiding the vacuum overhead of a bulk delete. The boundary therefore controls retention precision.

Suppose policy says “retain 90 complete UTC days.” With monthly partitions, the oldest attached month can contain both expired and unexpired rows. Options are:

- retain extra days until the whole month expires;
- run row-level deletes inside the boundary month;
- archive and rewrite the partial month;
- use daily boundaries.

If policy and storage allow retaining up to one extra month, monthly may be simpler. If compliance requires deletion at daily precision, daily partitions directly encode the operation.

Weekly boundaries work when operations are genuinely weekly. Define the business week. ISO weeks start Monday and can belong to a different ISO year from their Gregorian dates. A Sunday-start retail week or a 4-4-5 fiscal calendar needs an explicit calendar table or boundary generator, not casual <code>date_trunc('week', ...)</code> assumptions.

## Match the Query Window

Inventory actual predicates:

~~~text
query                              frequency   normal window   maximum
recent tenant events              70%         6 hours         7 days
daily operational aggregate       20%         1 day           1 day
weekly report                      8%          7 days          13 weeks
incident export                    2%          30 days         2 years
~~~

A six-hour query touches at most one or two daily leaves, one or two weekly leaves, and one monthly leaf. But “one leaf” is not automatically less I/O. An index on <code>(tenant_id, occurred_at)</code> inside a monthly leaf can still find the six-hour range efficiently. Pruning selects relations; indexes select rows inside them.

A daily aggregate that scans all rows for one day may benefit from a daily leaf's direct locality and statistics. A query routinely spanning 90 days may pay planning and append overhead across 90 daily leaves while reading a similar amount of data from three monthly leaves.

Test both selective and scan-heavy shapes. Measure planning time, buffers, actual rows, and execution time.

## Bound Leaf Size and Maintenance

Estimate uncompressed rows, on-disk heap, and every index per interval:

~~~text
bytes per day
  = average rows/day
  × average on-disk bytes/row including expected index share
~~~

Use measured relation sizes, not serialized payload size:

~~~sql
SELECT pg_size_pretty(pg_relation_size('events_2026_08')),
       pg_size_pretty(pg_indexes_size('events_2026_08')),
       pg_size_pretty(pg_total_relation_size('events_2026_08'));
~~~

The interval should support:

- acceptable index build and validation duration;
- vacuum and analyze behavior;
- backup and restore objectives;
- attachment and archival windows;
- storage placement;
- acceptable blast radius for leaf corruption or operator error.

Monthly volume can be highly uneven. February and March differ in days; seasonal traffic differs more. Size the largest expected month or week, not the average.

## Account for the Active Write Edge

Range partitioning by a monotonic timestamp directs current writes to the active leaf. Daily boundaries rotate that leaf more often and keep its indexes smaller. They do not distribute write capacity across old leaves. If one active daily leaf is still a bottleneck, making hourly leaves changes objects and index locality but all remain on the same server.

Measure insert throughput and commit latency for each candidate. Partition rotation can also produce a cold-cache effect at a new boundary and trigger DDL or statistics work. Pre-create leaves and warm critical paths where justified.

Late-arriving data means more than one leaf can remain writable. Define:

- maximum accepted lateness;
- whether corrected timestamps may move rows;
- how long old leaves keep autovacuum and write-oriented settings;
- when a partition is considered sealed for archive.

## Generate Typed Half-Open Bounds

PostgreSQL range lower bounds are inclusive and upper bounds exclusive:

~~~sql
CREATE TABLE events_2026_08
PARTITION OF events
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');
~~~

Use one reviewed generator for DDL, retention metadata, and monitoring. Avoid <code>BETWEEN</code> for timestamp bounds because it includes both endpoints.

Decide whether boundaries are UTC instants or local civil time. A local “day” can be 23 or 25 hours across daylight-saving transitions. PostgreSQL <code>timestamptz</code> stores instants and displays them in a session time zone; calculate the intended boundary explicitly. A report's local-day semantics can differ from a storage partition's UTC-day semantics.

For monthly dates, advance by calendar month rather than assuming 30 days. For weeks, store the actual start and end rather than deriving partition names alone.

## Compare Candidate Designs at Full Horizon

Build daily, weekly, and monthly copies with production-shaped skew. Replay:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, SETTINGS)
SELECT event_id, occurred_at
FROM events_candidate
WHERE tenant_id = 42
  AND occurred_at >= $1
  AND occurred_at <  $2
ORDER BY occurred_at DESC
LIMIT 500;
~~~

Use the real prepared-statement parameter types. Record:

- planning p50/p95/p99;
- leaves planned and leaves executed;
- execution and buffer reads;
- insert throughput;
- per-leaf heap and index sizes;
- retention lock duration;
- backup/restore time;
- catalog and monitoring query latency;
- total objects at full retention.

Test the maximum supported export, not only the normal six-hour request. A fine-grained design often fails first on a legitimate broad query.

## Choose With a Scorecard

Example:

| Requirement | Daily | Weekly | Monthly |
| --- | --- | --- | --- |
| delete exactly one expired day | direct | partial week | partial month |
| common six-hour query | strong pruning | adequate with index | adequate with index |
| 90-day report planning | many leaves | moderate | few leaves |
| object count | highest | medium | lowest |
| largest leaf maintenance | smallest | medium | largest |

Replace qualitative cells with measurements and hard objectives. If daily and monthly both meet latency, prefer the simpler layout unless daily retention precision or maintenance size provides a concrete benefit.

## Automate Provisioning and Failure Detection

Maintain future coverage beyond the furthest accepted timestamp. Alert before missing-partition errors:

~~~sql
SELECT relid::regclass,
       pg_get_expr(c.relpartbound, c.oid) AS bound
FROM pg_partition_tree('events'::regclass) AS p
JOIN pg_class AS c ON c.oid = p.relid
WHERE p.isleaf
ORDER BY relid::text;
~~~

Generate DDL idempotently, use a session-local <code>lock_timeout</code>, and monitor any default partition. A default is a safety net, not a scheduler; expected values landing there make later explicit creation scan and lock unless excluded by a valid check.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL: Database Object Size Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE)
- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

Daily, weekly, and monthly are lifecycle units, not performance rankings. Choose the coarsest interval that meets deletion precision, pruning, leaf-maintenance, and backup objectives. Model the complete retention horizon, largest interval, broadest supported query, active write edge, and late data. Use typed half-open boundaries and automate future coverage. If two granularities meet the same objectives, the one with fewer objects is usually easier to operate.
