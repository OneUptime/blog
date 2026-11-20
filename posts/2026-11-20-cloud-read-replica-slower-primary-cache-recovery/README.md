# Why Your Cloud PostgreSQL Read Replica Is Slower Than the Primary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Troubleshooting

Description: Diagnose slow PostgreSQL replica queries by comparing equivalent workloads, cache behavior, instance capacity, query plans, and recovery conflicts.

Moving reports to a read replica should reduce pressure on the writer. It does not guarantee that each report becomes faster. A smaller replica with a cold cache can take longer to execute the same query while also applying the writer's changes.

The useful question is which part of the replica's work differs. Start with an equivalent query and follow the evidence through execution, memory, storage, and replication. Avoid changing five settings at once: that makes a temporary improvement difficult to explain or reproduce.

This guide targets PostgreSQL 17 physical read replicas, including RDS for PostgreSQL DB instance replicas. It does not assume that another database engine or a provider's distributed storage replica behaves identically. RDS DB instance read replicas receive source updates asynchronously. [RDS read replica overview](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html).

## Make the comparison fair

Capture the actual application query, parameter values, role, database, and session settings. Compare the same result shape and similar data freshness. A primary reading today's small partition and a delayed replica reading a different state are not necessarily doing the same work.

Separate application elapsed time into pool acquisition, network transfer, and server execution where your instrumentation permits. A query can execute quickly while requests wait for an exhausted application pool. Likewise, fetching a large result across regions can dominate the user-visible delay.

Record concurrent traffic, background reporting jobs, and the writer's update rate during the comparison. An idle primary versus a replica running several large exports is a workload comparison, not a clean hardware test.

| Difference | Evidence to compare | Likely next experiment |
|---|---|---|
| First run slow, later runs faster | Buffer reads and hits across controlled runs | Repeat a representative read without clearing caches |
| Replica has less capacity | Instance class, memory, storage settings, utilization | Test a matched staging configuration |
| Execution plans differ | Scan/join choices, row estimates, settings | Explain the plan difference before resizing |
| Queries are canceled and retried | Recovery-conflict counter changes and errors | Separate reporting behavior from replay requirements |
| Server execution similar, API slower | Pool wait and transfer time | Investigate the client path |

## Compare capacity before assuming identical servers

Inspect both instances' configured CPU and memory, storage type, provisioned I/O capacity, and throughput limits. Do not infer equality from the fact that one was created as the other's replica.

For RDS, correlate CPU utilization, freeable memory, read/write latency, disk queue depth, and applicable credit metrics over the same interval. `BurstBalance` is specifically associated with gp2 storage credits; CPU credit metrics apply to eligible burstable classes. A metric absent from your configuration is not automatically a monitoring failure. [RDS CloudWatch metric definitions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html).

A replica needs resources for both user reads and recovery work. Low average CPU does not rule out storage limits, a serialized bottleneck, or short bursts hidden by the averaging period. Compare peaks and waits alongside throughput.

Keep a record of the intended change. If a matched staging replica improves the workload, that supports a capacity explanation. It does not identify which production setting should change unless the comparison isolated it.

## Read the plan before running an expensive experiment

Start with ordinary `EXPLAIN`, which reports the planned execution without running the query. Use your own approved query and parameters. Check scan choice, join order, estimated rows, and relevant planner settings. [PostgreSQL plan interpretation](https://www.postgresql.org/docs/17/using-explain.html).

When an execution test is approved, `EXPLAIN ANALYZE` provides actual measurements but **executes the statement**. Use a bounded, reviewed read-only query without functions that trigger external effects. The following PostgreSQL 17 example assumes an existing `public.orders` table with the listed columns. Replace the schema, columns, tenant value, and limit with a representative approved case.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';

EXPLAIN (ANALYZE, BUFFERS, SETTINGS, TIMING OFF)
SELECT order_id, created_at
FROM public.orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 100;

ROLLBACK;
```

This limits statement execution time and keeps the transaction locally read-only. `TIMING OFF` avoids per-node clock measurements while still collecting execution statistics. The example's rollback ends the diagnostic transaction; it does not undo resource consumption or make arbitrary queries harmless. If execution times out, end the failed transaction with `ROLLBACK` before reusing the session. [EXPLAIN options](https://www.postgresql.org/docs/17/sql-explain.html).

Review the query first: a small `LIMIT` can still require scanning or sorting a large input. Do not run an expensive report on the primary merely to obtain a comparison during an incident.

## Interpret cache evidence carefully

A shared-buffer hit means PostgreSQL found a block in its own buffer cache. A shared-buffer read means it had to obtain the block from outside that cache; the operating system may still have served it from memory. It is not proof of a physical storage read. [Buffer statistics interpretation](https://www.postgresql.org/docs/17/using-explain.html).

Compare a few controlled runs, not just the fastest result. If the first run has many reads and later runs mostly hits, cache warmth is a plausible contributor. Check whether the improvement persists under the replica's normal mixture of queries. One repeatedly executed report can look excellent while evicting pages another workload needs.

Do not drop operating-system caches or restart production instances to make the comparison “fair.” Those actions change the incident and discard useful state. A disposable staging experiment is the right place for controlled cold-start measurements.

Also compare actual row counts with estimates and whether the same plan is chosen. Physical standby maintenance is constrained: you cannot simply create a replica-only index or run `ANALYZE` there as if it were an independent writable database. Required schema and statistics changes belong on the primary through the normal change process. [Hot standby restrictions](https://www.postgresql.org/docs/17/hot-standby.html).

## Check whether recovery is competing with reads

Physical replicas replay WAL, the write-ahead log containing source changes. Long-running read snapshots can conflict with records that recovery needs to apply. PostgreSQL may cancel conflicting queries, and application retries can make the resulting latency look like an unusually slow successful query.

Inspect cumulative recovery-conflict counters on the replica:

```sql
SELECT datname,
       confl_tablespace,
       confl_lock,
       confl_snapshot,
       confl_bufferpin,
       confl_deadlock
FROM pg_catalog.pg_stat_database_conflicts
WHERE datname = current_database();
```

Take two samples around the observation window in separate short transactions and compare changes. A historical nonzero count alone does not explain today's slowdown. Keep database restart or statistics reset events with the evidence. [Conflict statistics](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-DATABASE-CONFLICTS-VIEW).

Correlate increases with query cancellation messages, replay progress, and retry counts. Do not interpret the counters as counts of every slow query; they describe recovery-related cancellations.

Increasing `max_standby_streaming_delay` can allow more time for conflicting queries but also delay replay. Enabling `hot_standby_feedback` can reduce cleanup-related conflicts while contributing to table bloat on the primary. Neither setting is a free performance switch. Review the tradeoff against the replica's purpose and freshness requirements. [Standby parameter behavior](https://www.postgresql.org/docs/17/runtime-config-replication.html#RUNTIME-CONFIG-REPLICATION-STANDBY).

## Choose a fix that matches the evidence

For a cold working set, test gradual traffic introduction and whether available memory fits the intended query mix. For sustained resource pressure, compare a suitably sized instance and storage configuration. For poor plans, improve the query, primary-side indexes, or statistics through a measured change. For recovery conflicts, consider separating long analytical work from freshness-sensitive reads.

Recheck both query latency and replay behavior after the change. A report that finishes faster because replay was allowed to fall far behind may fail the application's actual requirement.

Keep the before-and-after plan, workload rate, resource graphs, conflict deltas, and result correctness together. Those observations explain why the replica was slower and whether the chosen fix improved the service under representative conditions.
