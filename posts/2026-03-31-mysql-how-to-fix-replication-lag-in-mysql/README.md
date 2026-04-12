# How to Fix Replication Lag in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Performance Tuning, Replication Lag

Description: Learn the main causes of MySQL replication lag and practical techniques to reduce or eliminate it, including parallel replication and hardware tuning.

---

## Diagnosing the Root Cause

Before fixing lag, identify what is causing it:

```sql
SHOW REPLICA STATUS\G
```

Key fields to check:

- `Seconds_Behind_Source` - current lag
- `Last_SQL_Error` - whether the SQL thread is erroring
- `Exec_Source_Log_Pos` vs `Read_Source_Log_Pos` - is the SQL thread falling behind the IO thread?

Also check if the replica is I/O-bound or CPU-bound:

```bash
top
iostat -x 1 5
```

## Fix 1 - Enable Parallel Replication

By default, MySQL applies binary log events serially on the replica. Parallel replication uses multiple worker threads to apply transactions concurrently.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
replica_parallel_workers    = 8
replica_parallel_type       = LOGICAL_CLOCK
replica_preserve_commit_order = ON
```

Apply without restart (MySQL 8.0+):

```sql
STOP REPLICA SQL_THREAD;
SET GLOBAL replica_parallel_workers = 8;
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
START REPLICA SQL_THREAD;
```

## Fix 2 - Tune InnoDB on the Replica

If the replica is write-heavy during catch-up, tune InnoDB for throughput:

```ini
[mysqld]
innodb_flush_log_at_trx_commit = 2
innodb_flush_method            = O_DIRECT
innodb_buffer_pool_size        = 8G
sync_binlog                    = 0
```

`innodb_flush_log_at_trx_commit = 2` reduces fsync calls, significantly improving write throughput on the replica at the cost of 1 second of potential data loss on crash (acceptable for replicas).

## Fix 3 - Use Row-Based Replication

Statement-based replication can cause lag if the replica must re-execute expensive queries. Switch to row-based replication:

```sql
-- On the primary
SET GLOBAL binlog_format = 'ROW';
```

Or in the config:

```ini
[mysqld]
binlog_format = ROW
```

## Fix 4 - Reduce Long-Running Transactions on the Primary

Large transactions block the replica's SQL thread while being applied. Find long transactions on the primary:

```sql
SELECT trx_id, trx_started, trx_mysql_thread_id, trx_query
FROM information_schema.innodb_trx
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 30;
```

Break large batch operations into smaller chunks:

```sql
-- Instead of deleting millions of rows at once
DELETE FROM orders WHERE created_at < '2023-01-01';

-- Use chunked deletes
DELETE FROM orders WHERE created_at < '2023-01-01' LIMIT 1000;
```

## Fix 5 - Upgrade the Replica Hardware

If the replica's disk I/O is saturated, consider:

- Moving to SSDs or NVMe storage
- Increasing RAM to allow a larger InnoDB buffer pool
- Moving the relay log to a separate disk

Check disk saturation:

```bash
iostat -x 2 5 | grep -E "Device|sda|nvme"
```

## Fix 6 - Skip Non-Critical Replication Filters

If the primary writes to databases the replica does not need, use replication filters to skip them:

```ini
[mysqld]
replicate_ignore_db = analytics_logs
replicate_ignore_db = temp_scratch
```

## Monitoring Progress After Fixes

```sql
SELECT
  WORKER_ID,
  TIMESTAMPDIFF(SECOND, LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP, NOW()) AS lag_s
FROM performance_schema.replication_applier_status_by_worker;
```

## Summary

MySQL replication lag is most commonly caused by single-threaded replication applying large transactions serially. The most effective fix is enabling `LOGICAL_CLOCK` parallel replication with multiple workers. For persistent lag, combine this with InnoDB durability tuning (`innodb_flush_log_at_trx_commit = 2`) and hardware improvements on the replica.
