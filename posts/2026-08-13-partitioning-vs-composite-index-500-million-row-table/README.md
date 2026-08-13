# Partitioning or a Composite Index for a 500-Million-Row Table?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Database Partitioning, Indexing, Query Performance, EXPLAIN

Description: Choose between partition pruning and a composite index by testing predicate selectivity, retention operations, write cost, and real execution plans instead of using row count alone.

---

Five hundred million rows sounds like a partitioning requirement, but row count does not choose the access path. A composite index and table partitioning operate at different layers. An index finds a selective set of rows inside a relation. Partition pruning proves that entire child relations cannot contain matching rows. Many successful large-table designs use both, and some need neither.

The right question is not “Is the table big?” It is “Which work dominates, and can the optimizer avoid it with the predicates the application actually sends?”

## Separate Lookup Problems From Lifecycle Problems

Consider an event table queried mostly by tenant and time:

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    event_id bigint NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL
);
~~~

This query asks for a tiny ordered slice:

~~~sql
SELECT event_id, occurred_at, status
FROM events
WHERE tenant_id = 812
  AND occurred_at >= TIMESTAMPTZ '2026-08-12 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-13 00:00:00+00'
ORDER BY occurred_at DESC
LIMIT 100;
~~~

A PostgreSQL B-tree index beginning with the equality column and followed by the range/order column is a natural candidate:

~~~sql
CREATE INDEX CONCURRENTLY events_tenant_time_idx
ON events (tenant_id, occurred_at DESC)
INCLUDE (event_id, status);
~~~

The index can navigate to one tenant's time range. Included columns may allow an index-only scan when visibility information permits it, although index-only scans are not guaranteed and the included payload increases index size and write cost.

Now consider the nightly retention operation:

~~~sql
DELETE FROM events
WHERE occurred_at < TIMESTAMPTZ '2026-02-14 00:00:00+00';
~~~

An index can locate old rows, but PostgreSQL still creates dead tuples that vacuum must process and logs row-level changes. If the data is range-partitioned on <code>occurred_at</code>, detaching or dropping complete old partitions changes the retention operation fundamentally. That lifecycle benefit can justify partitioning even if individual queries already have good indexes.

## Understand What Pruning Can and Cannot Do

PostgreSQL's partition pruning uses partition bounds, not indexes. A compatible time predicate may reduce a 180-partition plan to one daily partition. The chosen partition may still contain millions of rows; an index inside it is what makes a selective tenant lookup efficient.

Conversely, this query may touch every time partition:

~~~sql
SELECT *
FROM events
WHERE tenant_id = 812
ORDER BY occurred_at DESC
LIMIT 100;
~~~

The planner cannot discard older time partitions merely because a limit will probably be satisfied by recent data. Depending on the plan and data, it may scan or initialize multiple child paths. A global-looking composite index does not exist across PostgreSQL partitions; a partitioned index is a virtual parent whose child indexes enforce and serve each partition.

MySQL has the same conceptual separation. Its optimizer can prune partitions when a condition reduces to useful comparisons on the partitioning expression, while ordinary indexes optimize access inside the selected partitions. MySQL partitioning applies to both a table's data and indexes; it does not let one global secondary index span all partitions.

## Compare Four Candidate Designs

Do not jump directly from an unindexed heap to a partitioned hierarchy. Test these designs with production-shaped data:

### 1. Composite index only

Use this when queries are selective, retention is not a large row-level delete, and one relation remains operationally manageable. It preserves simpler DDL, foreign-key design, uniqueness, and planning.

### 2. Partitioning only

Use this when most queries consume a substantial fraction of one or a few partitions, or lifecycle operations dominate. A sequential scan over a pruned daily partition can be better than random index reads across the full table.

### 3. Partitioning plus local composite indexes

This is common for time-series OLTP: time bounds prune partitions, and <code>(tenant_id, occurred_at)</code> indexes find small ranges within them. It costs an index per child and requires automated creation, monitoring, and retention.

### 4. A different index or data model

A partial index can serve a stable predicate such as active rows. A BRIN index can summarize naturally correlated physical ranges with a much smaller index than B-tree, though it is lossy and best when column values correlate with table order. A materialized summary or separate recent-events table may better serve aggregate or hot-window queries.

Partitioning is not a replacement for these alternatives.

## Measure the Existing Query First

On PostgreSQL, capture a safe representative plan:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS, FORMAT TEXT)
SELECT event_id, occurred_at, status
FROM events
WHERE tenant_id = 812
  AND occurred_at >= TIMESTAMPTZ '2026-08-12 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-13 00:00:00+00'
ORDER BY occurred_at DESC
LIMIT 100;
~~~

<code>ANALYZE</code> executes the statement, so do not use it casually on mutating queries or an unsafe production workload. Inspect:

- planning time and execution time;
- actual versus estimated rows;
- shared buffer hits and reads;
- heap fetches for index-only scans;
- sort methods and temporary I/O;
- partitions present in an <code>Append</code> or <code>Merge Append</code>;
- repeated loops caused by joins;
- WAL produced by write experiments.

Run cold-cache and warm-cache tests if both matter. A result from a tiny development dataset says little about index height, correlation, cache pressure, or partition-planning overhead at production scale.

For MySQL 8.4, traditional <code>EXPLAIN</code> exposes a <code>partitions</code> column, and <code>EXPLAIN ANALYZE</code> uses tree output and runs the statement. Compare selected partitions, access type, chosen key, examined rows, and actual iterator timing.

## Model Index Economics

A composite B-tree is not free. Every insert must update it; updates to indexed values create more index work; vacuum and checkpoint behavior reflect the additional pages; and cache space used by the index is unavailable elsewhere. Column order is essential. An index on <code>(occurred_at, tenant_id)</code> does not offer the same navigation for <code>tenant_id = ?</code> plus a time range as <code>(tenant_id, occurred_at)</code>.

Estimate index size before and after:

~~~sql
SELECT
    pg_size_pretty(pg_relation_size('events')) AS heap,
    pg_size_pretty(pg_indexes_size('events')) AS indexes,
    pg_size_pretty(pg_total_relation_size('events')) AS total;
~~~

For a partitioned test, aggregate leaf sizes through <code>pg_partition_tree</code>. Also measure insert throughput and p95/p99 commit latency. A read improvement that violates the write objective is not a win.

## Model Partition Economics

Partitioning creates objects: leaf tables, indexes, constraints, statistics, catalog entries, and locks. PostgreSQL documentation says the planner generally handles up to a few thousand partitions fairly well when typical queries prune to a small number; planning time and memory rise when many remain. Each session that touches partitions loads metadata into local memory.

Choose granularity from operations and query windows, not from an arbitrary target row count. If retention deletes one month at a time and most queries span weeks, monthly partitions may be enough. Daily partitions may add 30 times the object count without eliminating materially more data.

Account for constraints. A PostgreSQL primary or unique constraint on a partitioned table must include all non-expression partition-key columns. MySQL requires every unique key to include every column used in the partitioning expression. A seemingly simple repartition can therefore change key semantics or require another way to enforce a business identifier.

## Run a Controlled Bake-Off

Create production-scale candidates from the same snapshot. Replay a workload mix rather than one attractive query:

~~~text
70% tenant + bounded-time reads
15% inserts
5% status updates
5% retention or archival work
5% unbounded support queries
~~~

For each design, record latency distributions, logical and physical reads, write throughput, WAL or redo volume, relation count, planning time, maintenance duration, and disk use. Validate results after <code>ANALYZE</code>, using the same server configuration.

Set an acceptance criterion before viewing results. For example: “p99 bounded read under 150 ms, at least 20,000 inserts/s, retention under five minutes, and no query planning above 20 ms.” Illustrative numbers must be replaced with your objectives.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [PostgreSQL: Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [PostgreSQL: BRIN Indexes](https://www.postgresql.org/docs/current/brin.html)
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL: Database Object Size Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE)
- [MySQL 8.4: Partition Pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- [MySQL 8.4: Multiple-Column Indexes](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL 8.4: EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

## Conclusion

A 500-million-row table does not automatically need partitioning. Use a composite index when the central problem is selective lookup; use partitioning when compatible predicates can eliminate large physical units or lifecycle operations benefit from detaching whole ranges. Test the combined design when both are true. The winning choice is the one that satisfies the whole workload's latency, write, maintenance, and correctness objectives—not the one with the most dramatic single-query benchmark.
