# How to Tune `replica_parallel_workers` When a Percona Replica Cannot Keep Up

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Replication, Performance Tuning, Database Operations

Description: Tune MySQL 8.4 replica applier workers with measured backlog-drain tests, worker telemetry, primary-key checks, and contention guardrails.

---

`replica_parallel_workers` sets how many applier workers a MySQL replica can use for each replication channel. Raising it can help a Percona Server replica apply independent transactions concurrently. It cannot split a large transaction, remove dependencies between hot-row updates, or make overloaded storage faster.

MySQL 8.4 defaults to four workers. The supported range is 0 to 1024, but zero is deprecated. Use one worker when you deliberately need sequential apply.

The right setting is not the CPU count. It is the lowest tested worker count that sustains the production change rate, drains expected backlog within the recovery objective, and leaves resource headroom.

## Verify That Apply Is the Bottleneck

Start with:

```sql
SHOW REPLICA STATUS\G
```

Require healthy receiver and applier threads. If `Replica_IO_Running` is not `Yes`, increasing applier workers cannot repair the source connection.

Inspect receiver progress:

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_QUEUED_TRANSACTION,
  RECEIVED_TRANSACTION_SET
FROM performance_schema.replication_connection_status;
```

Then inspect appliers:

```sql
SELECT
  CHANNEL_NAME,
  WORKER_ID,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_APPLIED_TRANSACTION,
  LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP,
  APPLYING_TRANSACTION,
  APPLYING_TRANSACTION_START_APPLY_TIMESTAMP,
  APPLYING_TRANSACTION_RETRIES_COUNT
FROM performance_schema.replication_applier_status_by_worker
ORDER BY CHANNEL_NAME, WORKER_ID;
```

Parallel-worker tuning is a candidate when:

- the receiver is current or steadily receiving
- the relay-log backlog grows under sustained writes
- the applier has no functional error
- multiple independent transactions exist
- CPU, storage, memory, and lock capacity remain

If one worker is stuck on a very large transaction while the rest are idle, transaction shape is the limit.

## Record the Current Parallel-Apply Contract

On MySQL 8.4:

```sql
SELECT
  @@replica_parallel_workers AS workers,
  @@replica_parallel_type AS parallel_type,
  @@replica_preserve_commit_order AS preserve_commit_order,
  @@replica_pending_jobs_size_max AS pending_jobs_bytes;
```

The normal 8.4 defaults are:

```text
replica_parallel_workers = 4
replica_parallel_type = LOGICAL_CLOCK
replica_preserve_commit_order = ON
```

`LOGICAL_CLOCK` schedules transactions based on dependency information written to the binary log. Commit-order preservation ensures transactions become externally visible in relay-log order, subject to documented limitations.

The older `binlog_transaction_dependency_tracking` variable was removed in MySQL 8.4. Do not copy an 8.0 `WRITESET` setting into an 8.4 option file. MySQL 8.4 uses writeset behavior without that variable.

`replica_preserve_commit_order=ON` requires `replica_parallel_type=LOGICAL_CLOCK`. The type variable remains available in 8.4 but is deprecated. With exactly one worker, both the type and commit-order settings have no effect because apply is sequential.

## Understand What a Worker Count Means

For `N >= 1`, a channel gets:

- one coordinator that reads relay-log transactions
- `N` worker threads that apply scheduled transactions

With multiple replication channels, the global worker count applies to each channel. Eight workers across four active channels can mean up to 32 applier workers plus coordinators, all competing for the server's CPU and memory.

Changing `replica_parallel_workers` has no immediate effect on a running applier. The new value is used on a subsequent `START REPLICA`.

## Establish a Reproducible Baseline

Do not tune against a single `Seconds_Behind_Source` sample. Define:

- a representative source write interval
- starting relay-log or GTID backlog
- time to drain that backlog
- transactions or bytes applied per second
- replica CPU, disk latency, IOPS, and memory
- row-lock and metadata-lock waits
- read-query latency on the replica
- worker utilization and retries

An operationally useful test is recovery from a known pause:

1. on a noncritical replica, stop only the applier for an approved short interval
2. leave the receiver running so relay logs accumulate
3. restart apply with the candidate worker count
4. measure time to reach the captured source GTID set, or source binary-log coordinates when GTIDs are not in use

Do not intentionally create backlog unless binary log and relay-log capacity, disk space, and recovery risk have been reviewed.

## Check for Primary Keys First

MySQL's documentation warns that tables without primary keys harm replica performance and can have a larger negative impact with multiple workers.

Find InnoDB tables without primary keys:

```sql
SELECT
  t.TABLE_SCHEMA,
  t.TABLE_NAME,
  t.TABLE_ROWS
FROM information_schema.tables AS t
LEFT JOIN information_schema.table_constraints AS c
  ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
 AND c.TABLE_NAME = t.TABLE_NAME
 AND c.CONSTRAINT_TYPE = 'PRIMARY KEY'
WHERE t.ENGINE = 'InnoDB'
  AND t.TABLE_SCHEMA NOT IN
    ('information_schema', 'mysql', 'performance_schema', 'sys')
  AND c.CONSTRAINT_NAME IS NULL
ORDER BY t.TABLE_ROWS DESC, t.TABLE_SCHEMA, t.TABLE_NAME;
```

For row-based `UPDATE` and `DELETE`, the applier prefers a primary key, then a suitable unique non-null index. Without an efficient key, row lookup can require substantially more work.

Add keys through a reviewed schema migration. Do not create replica-only schema divergence casually; promotion and consistency may depend on identical definitions.

## Identify Serialization in the Workload

More workers help only if dependencies allow concurrency. Look for:

- one transaction containing millions of row events
- repeated updates to the same account, counter, or queue row
- transactions with broad writesets that conflict with many later transactions
- DDL or metadata locks
- statement-logged transactions whose dependency metadata exposes little concurrency
- commit-order waits behind one slow worker

Sample worker state repeatedly. A balanced workload shows several workers progressing. If only one applies transactions, investigate dependency and transaction design before allocating more threads.

MySQL notes that `LOGICAL_CLOCK` can expose less parallelism at deeper levels of a chained replication topology. Measure each tier rather than copying the same count everywhere.

## Change the Worker Count Safely

Test on one noncritical replica. Persist the intended value:

```sql
SET PERSIST replica_parallel_workers = 8;
```

Then restart the replication channel in a controlled window:

```sql
STOP REPLICA;
START REPLICA;
```

Verify:

```sql
SELECT @@replica_parallel_workers;

SELECT CHANNEL_NAME, COUNT(*) AS worker_rows
FROM performance_schema.replication_applier_status_by_worker
GROUP BY CHANNEL_NAME;
```

`SET PERSIST` changes the runtime value and writes it to the server's persisted-variable store. If configuration management owns all server settings, update that source of truth as well and decide whether persisted settings are permitted.

For multi-source replication, stopping `REPLICA` without a channel affects all channels. Use `FOR CHANNEL 'channel_name'` and review every channel explicitly when only one should restart.

## Test a Small Sequence

A sensible experiment might compare:

```text
4 workers -> 8 workers -> 16 workers
```

Do not assume the last value is best. At each step, replay the same class of backlog and record:

- drain time
- CPU utilization and run queue
- storage latency and queue depth
- worker distribution
- lock waits
- transaction retry counts
- read latency
- memory use

Stop increasing when:

- drain throughput no longer improves materially
- lock waits or retries rise
- storage saturates
- read latency violates its objective
- coordinator or worker queues become the new bottleneck
- memory headroom becomes unsafe

Then choose the smallest count near the useful plateau.

## Watch Commit-Order Waits

With `replica_preserve_commit_order=ON`, a worker that finishes early can wait for preceding transactions to commit. This protects externally visible order and supports read scaling.

The thread state can appear as:

```text
Waiting for preceding transaction to commit
```

Many such waits can mean one earlier transaction is the critical path. Turning commit-order preservation off changes visibility and recovery properties; it is not a routine performance toggle.

Keep it on unless the architecture has explicitly accepted the documented implications of gaps and out-of-order externalization.

## Size Pending Job Memory with Evidence

`replica_pending_jobs_size_max` limits memory for events queued to workers. The 8.4 default is 128 MiB. On a multithreaded replica, MySQL says to set this value at least as large as the source's `max_allowed_packet`. An unusually large event can force special scheduling behavior, and a full queue can make the coordinator wait.

Review current value:

```sql
SELECT @@replica_pending_jobs_size_max;
```

The coordinator's informational error-log statistics can report waits caused by:

- a worker queue reaching capacity
- total pending event size reaching the configured limit

Increase this limit only after observing those waits and confirming memory headroom. MySQL shares the specified amount among the replica worker queues rather than allocating it once per worker. It does not make a large transaction execute in parallel.

## Do Not Trade Away Durability Accidentally

Worker tests often expose disk as the limit. Resist changing:

- `innodb_flush_log_at_trx_commit`
- `sync_binlog`
- binary logging
- `log_replica_updates`

without an approved durability and promotion design.

A replica intended for failover may need binary logs and replica updates even if disabling them improves a benchmark. Measure against the server's actual role.

## Tune Source Transaction Shape

Sometimes the correct fix is upstream:

- split oversized batch transactions into bounded commits
- avoid global hot-row counters
- add primary keys
- schedule heavy DDL with an online, reviewed method
- reduce unnecessary row changes
- keep transactions short

Smaller independent transactions give the coordinator more scheduling options and reduce recovery spikes. They also change application semantics, so test atomicity and failure handling.

## Roll Out Gradually

After a successful canary:

1. keep it under a full peak and batch cycle
2. validate reads and failover eligibility
3. update the documented baseline
4. rotate one additional replica
5. avoid changing every replica at once
6. retain at least one stable comparison node until confidence is high

Alert on the setting and its source:

```sql
SELECT
  gv.VARIABLE_VALUE,
  vi.VARIABLE_SOURCE,
  vi.VARIABLE_PATH
FROM performance_schema.global_variables AS gv
JOIN performance_schema.variables_info AS vi
  USING (VARIABLE_NAME)
WHERE gv.VARIABLE_NAME = 'replica_parallel_workers';
```

This identifies the effective value and the source from which it was most recently set. Compare it with configuration management's source of truth to detect drift.

## A Tuning Decision Table

| Observation | Likely action |
| --- | --- |
| Receiver disconnected | Fix connectivity or source first |
| One huge applying transaction | Reduce transaction size |
| Many tables lack primary keys | Fix schema access paths |
| Several workers busy, resources free | Test more workers |
| Workers wait on the same locks | Fix contention or hot rows |
| Storage is saturated | Improve I/O or reduce competing work |
| Commit-order waits behind one worker | Investigate that transaction |
| Throughput plateaus after eight workers | Keep eight, not sixteen |
| Multiple channels multiply resource use | Budget workers per channel |

The goal is sustainable apply capacity with recovery headroom, not the largest accepted integer.

## Official Documentation

- [MySQL replica server options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [MySQL replication threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)
- [MySQL monitoring applier worker threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads-monitor-worker.html)
- [MySQL applier worker status table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html)
- [MySQL replication row searches](https://dev.mysql.com/doc/refman/8.4/en/replication-features-row-searches.html)
- [MySQL replication and `max_allowed_packet`](https://dev.mysql.com/doc/refman/8.4/en/replication-features-max-allowed-packet.html)
- [MySQL variables removed in 8.4](https://dev.mysql.com/doc/refman/8.4/en/added-deprecated-removed.html)
- [MySQL Shell parallel applier configuration](https://dev.mysql.com/doc/mysql-shell/8.4/en/configuring-parallel-applier.html)
