# Why Did Replication Lag Increase After Upgrading Percona Server to MySQL 8?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Replication, Performance, Troubleshooting

Description: Diagnose post-upgrade replica lag by separating receiver, coordinator, worker, storage, configuration, and workload bottlenecks.

---

An upgrade can expose replication lag without the new server being intrinsically slower. The restart empties caches, configuration defaults change, removed options fall away, transactions may be scheduled differently, and workload shape can shift during the maintenance window.

Start by locating the bottleneck:

```text
source commit
   -> network receiver
   -> relay log
   -> coordinator
   -> applier workers
   -> InnoDB commit and storage
```

Increasing `replica_parallel_workers` helps only when the applier has independent transactions available and another resource is not already saturated. Diagnose each stage before tuning.

## Confirm That the Replica Is Actually Behind

Run:

```sql
SHOW REPLICA STATUS\G
```

Check:

- `Replica_IO_Running`
- `Replica_SQL_Running`
- `Last_IO_Error`
- `Last_SQL_Error`
- `Seconds_Behind_Source`
- retrieved and executed GTID sets
- relay-log space
- configured source delay

`Seconds_Behind_Source` is an estimate, not a complete service-level metric. MySQL documents cases where it can temporarily show zero while the receiver has not noticed a broken connection, or jump when an old event enters the relay log.

Measure application-visible staleness as well. A timestamp or monotonically increasing business marker written on the source and read from the replica often answers the question users care about more directly.

## Separate Receiver Lag from Applier Lag

The receiver copies source binary-log events to the relay log. The applier executes them.

Inspect receiver state:

```sql
SELECT
  CHANNEL_NAME,
  SOURCE_UUID,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_HEARTBEAT_TIMESTAMP,
  COUNT_RECEIVED_HEARTBEATS,
  LAST_QUEUED_TRANSACTION,
  RECEIVED_TRANSACTION_SET
FROM performance_schema.replication_connection_status;
```

If the receiver is disconnected or receives heartbeats irregularly, investigate:

- source availability
- DNS and routing
- firewall or load-balancer idle timeouts
- TLS negotiation
- source binary-log dump load
- packet loss and bandwidth
- `replica_net_timeout` and the configured heartbeat period

If the receiver is healthy and the relay log grows while executed GTIDs fall behind received GTIDs, the applier is the bottleneck.

## Inspect Every Applier Worker

MySQL 8.4 exposes transaction and timing data by worker:

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

Look for:

- one long-running transaction while other workers are idle
- repeated transient retries
- an error on a worker hidden by a coarse dashboard
- all workers busy with sustained relay-log growth
- many workers waiting to preserve commit order
- little or no distribution across workers

The coordinator has separate status:

```sql
SELECT *
FROM performance_schema.replication_applier_status_by_coordinator;
```

MySQL can also write coordinator scheduling statistics to the error log at informational verbosity. Queue-full and pending-job-size waits indicate that workers or their memory queues cannot accept events quickly enough.

## Allow for Post-Restart Warm-Up

An upgrade restarts the server. The buffer pool, filesystem cache, adaptive state, and prepared application connections may be cold.

Compare lag over three periods:

1. immediate catch-up after restart
2. warm cache under ordinary traffic
3. a full peak workload interval

If storage reads spike and lag falls as the buffer pool warms, do not permanently increase concurrency based only on the first minutes.

Check host-level saturation:

```bash
vmstat 1
iostat -xz 1
pidstat -dru -p "$(systemctl show mysql --property=MainPID --value)" 1
```

Run short, supervised samples. These tools may require packages or privileges. Do not leave high-frequency diagnostics running indefinitely on a production node.

## Compare Effective Configuration, Including Its Source

Comparing two `my.cnf` files misses defaults, included files, command-line options, and persisted variables.

Inspect relevant effective settings:

```sql
SELECT
  gv.VARIABLE_NAME,
  gv.VARIABLE_VALUE,
  vi.VARIABLE_SOURCE,
  vi.VARIABLE_PATH
FROM performance_schema.global_variables AS gv
JOIN performance_schema.variables_info AS vi
  USING (VARIABLE_NAME)
WHERE gv.VARIABLE_NAME IN (
  'replica_parallel_workers',
  'replica_parallel_type',
  'replica_preserve_commit_order',
  'replica_pending_jobs_size_max',
  'innodb_buffer_pool_size',
  'innodb_flush_log_at_trx_commit',
  'sync_binlog',
  'innodb_io_capacity',
  'innodb_io_capacity_max',
  'binlog_format'
)
ORDER BY gv.VARIABLE_NAME;
```

Run it on the old baseline and upgraded replica. Do not assume old aliases or removed variables still control 8.4.

MySQL 8.4 changes several defaults from 8.0. A changed default can improve a typical workload but still differ from the tuned 8.0 environment. Re-evaluate each override against the 8.4 documentation instead of copying all old values.

## Check Parallel Apply Before Adding Workers

In MySQL 8.4:

- `replica_parallel_workers` defaults to `4`
- `replica_preserve_commit_order` defaults to `ON`
- `replica_parallel_type` defaults to `LOGICAL_CLOCK`
- setting zero workers is deprecated
- setting one worker gives sequential apply

Verify:

```sql
SELECT
  @@replica_parallel_workers,
  @@replica_parallel_type,
  @@replica_preserve_commit_order,
  @@replica_pending_jobs_size_max;
```

An old provisioning template may have explicitly set one worker, overriding the newer default. Conversely, too many workers can increase lock contention and make throughput worse.

Commit-order preservation requires `replica_parallel_type=LOGICAL_CLOCK`. With exactly one worker, both settings are ignored because transactions are applied sequentially.

The worker count applies on the next `START REPLICA`; changing the global value does not instantly resize a running channel.

## Look for Workload That Cannot Parallelize

Parallel apply needs transactions whose dependencies permit concurrent execution. It cannot split one large transaction across workers.

Common serialization sources include:

- one large batch transaction
- repeated updates to the same hot rows
- DDL and metadata locks
- cross-database transactions
- commit-order waits
- a low-concurrency source workload
- cascades or triggers that concentrate writes

Inspect source transaction size and cadence, application deploys, and batch schedules. The version change may be coincidental with a workload change.

If one transaction takes 90 seconds to apply, raising the worker count cannot reduce that transaction's own 90-second critical path.

## Find Tables Without Useful Keys

With row-based replication, the applier must locate rows for `UPDATE` and `DELETE`. MySQL prefers a primary key, then a suitable unique non-null index. Without one, it can fall back to less efficient searches.

Find InnoDB tables without a primary key:

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

`TABLE_ROWS` is an estimate for InnoDB. Use it only to prioritize review.

Add primary keys through the normal schema-change process after validating semantics and operational cost. Do not generate arbitrary keys on a single replica without considering failover and schema consistency.

## Inspect Lock and Storage Contention

The applier competes for InnoDB locks and I/O. Check current lock waits:

```sql
SELECT *
FROM performance_schema.data_lock_waits;
```

Join lock identifiers to `performance_schema.data_locks` for object and transaction context. Capture short snapshots; current lock state changes rapidly.

Also review:

- disk latency and queue depth
- fsync throughput
- CPU steal and throttling
- memory pressure and swapping
- buffer pool hit behavior
- redo and checkpoint pressure
- temporary-table spill
- backup or scan jobs on the replica
- read traffic newly assigned after the upgrade

A replica that became a backup source or received more reads during the upgrade may simply have less capacity for apply.

## Verify Binary Log and Durability Choices

If the replica has binary logging and `log_replica_updates` enabled for promotion, each applied transaction also enters its binary log. Durability settings affect commit cost.

Do not weaken `sync_binlog` or `innodb_flush_log_at_trx_commit` merely to hide lag. Those settings define loss and recovery behavior. Compare them with the approved durability model and fix storage or capacity if the business requires durable commits.

Also verify that an upgraded replica intended for promotion still has the required binary logging. Disabling it may improve a benchmark while silently removing failover capability.

## Check Version-Mixed Topology Constraints

During a rolling upgrade, the older source can feed a newer replica for a supported path. MySQL does not support the later-release source feeding an earlier-release replica.

If lag started only after promoting the newer server, confirm that no older replica remains downstream. Also check for statements or behavior on the older source that the newer replica no longer supports; MySQL warns this can cause difficulties even in the supported older-to-newer direction.

## Change One Variable at a Time

After identifying an applier concurrency bottleneck, test a worker increase on one noncritical replica. Compare:

- transactions applied per second
- time to drain a fixed relay-log backlog
- CPU and disk saturation
- InnoDB lock waits
- worker utilization
- application read latency
- memory used by worker queues

Stop when throughput plateaus or contention rises. More threads are not free, and the setting applies to every replication channel on the server.

Keep the before-and-after values, workload interval, and rollback command in the change record.

## A Fast Diagnostic Order

Use this order during an incident:

1. Confirm the receiver and applier are running and error-free.
2. Check whether delay is intentional.
3. Compare received and executed GTID progress.
4. Inspect worker and coordinator state.
5. Allow for buffer-pool warm-up.
6. Compare effective variables and their sources.
7. identify a large transaction, hot-row serialization, or missing primary key.
8. Check disk, CPU, memory, locks, and competing workload.
9. Tune workers on one replica only after proving concurrency is the limit.

The upgrade is a useful time marker, not a root-cause category. Evidence should identify which pipeline stage lost throughput.

## Official Documentation

- [MySQL checking replication status](https://dev.mysql.com/doc/refman/8.4/en/replication-administration-status.html)
- [MySQL Performance Schema replication tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-tables.html)
- [MySQL applier worker status table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html)
- [MySQL receiver connection status table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-connection-status-table.html)
- [MySQL replica options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [MySQL replication row searches](https://dev.mysql.com/doc/refman/8.4/en/replication-features-row-searches.html)
- [MySQL Performance Schema variable-source information](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-variables-info-table.html)
- [Percona Server 8.4 defaults and tuning guidance](https://docs.percona.com/percona-server/8.4/8.4-defaults-and-tuning.html)
