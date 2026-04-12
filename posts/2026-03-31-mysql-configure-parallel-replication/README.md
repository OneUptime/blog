# How to Configure Parallel Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Performance, Parallel, Configuration

Description: Learn how to configure MySQL parallel replication to reduce replica lag by applying transactions concurrently across multiple worker threads.

---

Traditional MySQL replication applies transactions serially - one at a time on the replica. On busy sources, this creates replication lag as the single SQL thread cannot keep up with the source's write rate. Parallel replication uses multiple worker threads to apply transactions concurrently, dramatically reducing lag on modern multi-core replica servers.

## How Parallel Replication Works

MySQL supports two parallel replication policies:

- **DATABASE** (MySQL 5.6+): Transactions for different databases are applied in parallel. Only useful if writes are distributed across multiple databases.
- **LOGICAL_CLOCK** (MySQL 5.7.2+): Transactions that were committed simultaneously on the source (sharing a commit timestamp) can be applied in parallel on the replica. This is the recommended policy for most setups.

## Checking Current Settings

```sql
SHOW VARIABLES LIKE 'replica_parallel_type';
SHOW VARIABLES LIKE 'replica_parallel_workers';
```

## Configuring Parallel Replication

In `my.cnf` on the replica:

```ini
[mysqld]
# Enable multi-threaded replication
replica_parallel_type = LOGICAL_CLOCK
replica_parallel_workers = 8

# Strongly recommended to preserve commit order consistency
replica_preserve_commit_order = ON
```

Apply dynamically without restart:

```sql
STOP REPLICA SQL_THREAD;

SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL replica_parallel_workers = 8;
SET GLOBAL replica_preserve_commit_order = ON;

START REPLICA SQL_THREAD;
```

## Choosing the Number of Workers

A good starting point is the number of CPU cores on the replica:

```bash
# Check CPU count
nproc
```

For a 16-core replica, start with 8-12 workers:

```sql
SET GLOBAL replica_parallel_workers = 8;
```

Monitor worker utilization and adjust:

```sql
SELECT thread_id, type, processlist_state
FROM performance_schema.threads
WHERE name LIKE '%replica_worker%';
```

## Source-Side Configuration for Better Parallelism

On the source, enable `binlog_transaction_dependency_tracking` to improve parallel replay opportunities on replicas:

```ini
[mysqld]
# On the SOURCE server
binlog_transaction_dependency_tracking = WRITESET
transaction_write_set_extraction = XXHASH64
```

```sql
-- Apply dynamically on source (set extraction algorithm first)
SET GLOBAL transaction_write_set_extraction = 'XXHASH64';
SET GLOBAL binlog_transaction_dependency_tracking = 'WRITESET';
```

`WRITESET` allows non-conflicting transactions (those touching different rows) to be replayed in parallel on the replica, even if they were not committed simultaneously.

## Monitoring Parallel Replication Performance

Check the replication coordinator status:

```sql
SELECT * FROM performance_schema.replication_applier_status_by_coordinator;
```

Monitor individual workers:

```sql
SELECT worker_id, service_state, last_applied_transaction,
       applying_transaction, last_error_number, last_error_message
FROM performance_schema.replication_applier_status_by_worker;
```

Check for lag improvement:

```sql
SHOW REPLICA STATUS\G
-- Monitor: Seconds_Behind_Source
```

## replica_preserve_commit_order Explained

```ini
[mysqld]
replica_preserve_commit_order = ON
```

When parallel workers apply transactions out of order, the replica's binary log would have a different commit order than the source. This breaks replica-of-replica setups and makes the replica's binary log unreliable for recovery. `replica_preserve_commit_order = ON` ensures workers commit in the same order as the source, at a small performance cost.

**Always set this to ON** if the replica itself has replicas downstream, or if you plan to use it as a promotion candidate.

## Handling Parallel Replication Errors

If a worker thread encounters an error, all workers stop:

```sql
SHOW REPLICA STATUS\G
-- Check: Last_SQL_Error and Last_SQL_Errno

-- Identify which worker failed
SELECT worker_id, last_error_number, last_error_message
FROM performance_schema.replication_applier_status_by_worker
WHERE last_error_number != 0;
```

## Summary

Parallel replication with `replica_parallel_type = LOGICAL_CLOCK` and `replica_parallel_workers` set to the replica's core count is the most effective way to reduce replication lag on busy MySQL systems. Enable `WRITESET`-based dependency tracking on the source to expose more parallelism opportunities. Always set `replica_preserve_commit_order = ON` when the replica participates in a replication chain or may be promoted. Monitor worker utilization via `performance_schema` tables and tune the worker count based on observed lag reduction.
