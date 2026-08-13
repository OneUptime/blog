# How Many PostgreSQL Partitions Are Too Many? Measure the Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Table Partitioning, Query Planner, Locks, System Catalogs, Performance Testing

Description: Find a safe PostgreSQL partition count by measuring planning time, backend memory, locks, catalog objects, and maintenance at the expected workload and retention horizon.

---

PostgreSQL has no universal “too many partitions” number. Current documentation says the planner generally handles hierarchies of up to a few thousand partitions fairly well when typical queries prune all but a small number. It immediately qualifies that guidance: planning time and memory rise when more partitions remain, and server memory can grow when many sessions touch many partitions because each backend loads partition metadata.

That is a workload condition, not a target. An OLTP service with thousands of short prepared queries and 500 connections can reach its limit before a warehouse with longer scans and a small session pool. Measure the hierarchy you intend to keep, including every leaf index and concurrent session.

## Count the Whole Object Tree

Start with leaves and depth:

~~~sql
SELECT
    count(*) FILTER (WHERE isleaf) AS leaf_count,
    max(level) AS max_depth,
    count(*) AS relations_in_tree
FROM pg_partition_tree('public.events'::regclass);
~~~

Then count associated indexes:

~~~sql
SELECT count(*) AS indexes_on_tree
FROM pg_index AS i
JOIN pg_partition_tree('public.events'::regclass) AS p
  ON p.relid = i.indrelid;
~~~

One “partition” may mean a leaf table plus several indexes, constraints, toast relations, statistics entries, and dependencies. Two-level partitioning multiplies quickly:

~~~text
36 monthly parents
× 32 tenant hash leaves per month
= 1,152 leaf tables

1,152 leaves × 4 indexes
= 4,608 leaf indexes
~~~

Include the future partitions pre-created for safety and the old partitions awaiting archival. The maximum concurrent catalog footprint matters more than today's count.

## Measure Planning Separately From Execution

Use representative query families:

1. a point query that prunes to one leaf;
2. a normal bounded query that uses several leaves;
3. a worst supported query that touches the whole retention horizon;
4. a join that obtains the partition key at execution;
5. maintenance and DDL operations.

Plain <code>EXPLAIN</code> reports planning time without running the query:

~~~sql
EXPLAIN (ANALYZE FALSE, SUMMARY TRUE, FORMAT JSON)
SELECT count(*)
FROM events
WHERE occurred_at >= TIMESTAMPTZ '2026-08-13 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-14 00:00:00+00';
~~~

Run many iterations through the same driver and prepared-statement behavior as production. Separate:

- client round-trip time;
- server parse and plan time;
- execution time;
- custom versus generic plan behavior;
- cold catalog-cache versus warmed backend behavior.

A one-off <code>psql</code> plan on a warm session cannot represent thousands of newly created pool sessions. Conversely, repeatedly reconnecting exaggerates cost if production uses stable sessions. Match reality.

Use <code>pg_stat_statements</code> when installed and configured to compare cumulative planning and execution statistics. Planning tracking depends on <code>pg_stat_statements.track_planning</code>; the documentation warns that enabling it can impose a noticeable penalty under some concurrent workloads. Test that setting before enabling it broadly.

## Observe Backend Memory

PostgreSQL uses a process-per-connection model, and relation metadata is cached in each backend that touches it. Current partitioning guidance warns that memory can grow significantly over time when many sessions touch large numbers of partitions.

For the current session, inspect memory contexts:

~~~sql
SELECT name, total_bytes, used_bytes, free_bytes
FROM pg_backend_memory_contexts
ORDER BY total_bytes DESC
LIMIT 30;
~~~

Take comparable snapshots:

1. open a fresh controlled session;
2. record memory contexts;
3. execute the normal query set;
4. execute the maximum-partition query set;
5. record memory contexts again.

The view exposes the current session, not a cluster-wide per-backend table. PostgreSQL also provides <code>pg_log_backend_memory_contexts(pid)</code> to request that another backend log its memory contexts, subject to permissions. Logs may contain operational detail and can be voluminous, so use it deliberately.

Multiply observed per-session changes by realistic concurrently active backends only as a capacity estimate, not an exact allocation formula. Shared buffers, shared lock structures, allocator behavior, and different query paths require direct load testing.

## Count Relation Locks

Queries acquire relation locks on the objects they use. PostgreSQL's partition-pruning documentation notes that partitions removed during executor initialization are still locked at the beginning of execution. Broad queries and DDL can therefore create many lock entries even when some scans do not run.

From another session, inspect locks for a target backend:

~~~sql
SELECT mode, granted, count(*) AS lock_count
FROM pg_locks
WHERE pid = $1
GROUP BY mode, granted
ORDER BY mode, granted;
~~~

Join <code>pg_locks.relation</code> to <code>pg_class.oid</code> in the current database to identify relations. Use <code>pg_blocking_pids()</code> to find blockers rather than attempting a fragile self-join over lock compatibility.

<code>max_locks_per_transaction</code> sizes the shared lock table based on an average number of distinct lockable objects per transaction or prepared transaction. Individual transactions can exceed it while shared capacity remains, but a hierarchy query touching many tables is an official example of why it may need adjustment. This setting requires a server restart and increases shared-memory allocation, so do not raise it blindly to accommodate an accidental full-tree query.

## Measure Catalog Work and DDL

Every leaf adds rows and dependencies across system catalogs. Inspect counts relevant to the tree:

~~~sql
WITH tree AS (
    SELECT relid FROM pg_partition_tree('public.events'::regclass)
)
SELECT
    (SELECT count(*) FROM tree) AS relations,
    (SELECT count(*) FROM pg_attribute a
      JOIN tree t ON t.relid = a.attrelid
      WHERE a.attnum > 0 AND NOT a.attisdropped) AS user_columns,
    (SELECT count(*) FROM pg_constraint c
      JOIN tree t ON t.relid = c.conrelid) AS constraints,
    (SELECT count(*) FROM pg_index i
      JOIN tree t ON t.relid = i.indrelid) AS indexes;
~~~

Benchmark operations that traverse or modify the hierarchy:

- adding a column or constraint;
- creating and attaching a new partition;
- creating and attaching leaf indexes;
- <code>ANALYZE</code> and autovacuum activity;
- schema dumps and restores;
- deployment tools that introspect all tables;
- monitoring collectors that query catalog views;
- detach, drop, and retention jobs.

Lock duration matters more than raw DDL duration during traffic. Test with concurrent reads and writes, set a deliberate session <code>lock_timeout</code> for automation, and make retries idempotent. Do not set a low cluster-wide <code>lock_timeout</code> as a substitute for careful DDL scheduling.

## Test the Final Count Before You Need It

Create a disposable environment with the planned schema and partition count. Generate DDL using a reviewed script; do not hand-maintain thousands of leaves. Load production-shaped statistics and skew. Then replay concurrency at the expected pool size.

Record:

| Signal | Normal query | Worst supported query | DDL |
| --- | ---: | ---: | ---: |
| Planning p50/p95/p99 | | | |
| Execution p95/p99 | | | |
| Children after pruning | | | |
| Relation locks | | | |
| Backend memory delta | | | |
| Catalog query latency | | | |
| Blocking duration | | | |

Increase count in steps—perhaps 100, 500, 1,000, 2,000—while keeping data volume and query semantics comparable. Those are experiment points, not recommended thresholds. Stop when an agreed service objective or memory budget fails.

## Reduce Count or Reduce Exposure

If overhead is too high:

- use coarser time boundaries when query and retention windows allow;
- keep only the operational retention horizon attached;
- avoid one list partition per unbounded tenant population;
- use a fixed, reasonable hash count for tenants when that access pattern fits;
- remove unnecessary leaf indexes;
- repair predicates so normal queries prune early;
- cap or isolate legitimate whole-history queries;
- use connection pooling thoughtfully to control active backends;
- avoid subpartitioning unless it yields a measured benefit.

Detaching old partitions can shrink the active tree, but archived standalone tables remain catalog objects until moved or dropped. Moving them to another schema changes naming, not database-wide catalog count.

## Avoid False Shortcuts

- **“PostgreSQL supports thousands, so 2,000 is safe.”** The docs condition that statement on pruning and workload.
- **“Only one leaf executed, so only one was locked.”** Initialization-pruned leaves can still be locked.
- **“The parent has one index.”** A partitioned index has child indexes across the hierarchy.
- **“Catalog cache is shared once.”** important relation metadata is also loaded per backend.
- **“More partitions mean faster queries.”** Once the useful scan unit is small enough, additional objects may add overhead without eliminating work.

## Official Documentation

- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: pg_partition_tree](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL: pg_locks](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL: Lock Management Configuration](https://www.postgresql.org/docs/current/runtime-config-locks.html)
- [PostgreSQL: Viewing Locks](https://www.postgresql.org/docs/current/monitoring-locks.html)
- [PostgreSQL: Backend Memory Contexts](https://www.postgresql.org/docs/current/view-pg-backend-memory-contexts.html)
- [PostgreSQL: pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL: System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)

## Conclusion

“Too many” is the first partition count at which your supported workload misses its planning, memory, lock, catalog, or maintenance objective. PostgreSQL can handle large hierarchies well when normal predicates prune aggressively, but that conditional guidance is not a guarantee. Build the final-size tree early, replay real prepared queries and session concurrency, measure backend memory and relation locks, and include DDL and tooling. Choose the coarsest layout that delivers the pruning and lifecycle benefit you can prove.
