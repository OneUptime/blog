# How to Configure innodb_flush_log_at_trx_commit in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Durability, Configuration, Performance

Description: Learn how to configure innodb_flush_log_at_trx_commit in MySQL to balance transaction durability and write performance for your workload.

---

## What Is innodb_flush_log_at_trx_commit?

`innodb_flush_log_at_trx_commit` controls how InnoDB flushes the redo log to disk when a transaction commits. It is the primary tradeoff knob between transaction durability (ACID compliance) and write performance. The setting has three values: 0, 1, and 2.

## The Three Settings

```sql
-- Check the current value
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
```

**Value 1 (default - fully ACID compliant):**

```ini
innodb_flush_log_at_trx_commit = 1
```

On every commit: write log buffer to OS file AND fsync to disk. Slowest but safest - no committed transactions are ever lost on crash.

**Value 2 (good balance for most workloads):**

```ini
innodb_flush_log_at_trx_commit = 2
```

On every commit: write log buffer to OS file (but NOT fsync). InnoDB flushes to disk approximately once per second. Transactions committed within the last second may be lost on OS crash or power failure, but not on MySQL crash.

**Value 0 (highest performance, least durable):**

```ini
innodb_flush_log_at_trx_commit = 0
```

Log buffer is written to file and flushed to disk once per second - independent of commits. Up to 1 second of committed transactions can be lost on MySQL crash.

## Performance Impact

```bash
# Benchmark comparison using sysbench
sysbench oltp_write_only --mysql-host=127.0.0.1 --threads=16 --time=60 run

# Typical results:
# Setting 1: ~5,000 transactions/second (disk-bound)
# Setting 2: ~50,000 transactions/second (OS cache)
# Setting 0: ~50,000 transactions/second (similar to 2)
```

The difference between settings 1 and 2 can be 5-10x on workloads with many small transactions.

## Setting in my.cnf

```ini
[mysqld]
# Full ACID - recommended for financial/critical data
innodb_flush_log_at_trx_commit = 1

# Battery-backed RAID or tolerant of 1-second data loss
innodb_flush_log_at_trx_commit = 2
```

## Dynamic Change

```sql
-- Change without restart (effective immediately)
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
```

## Combining with sync_binlog

For full durability with replication:

```ini
[mysqld]
# Fully durable: both redo log and binlog flushed on commit
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

# Performance: both buffered (up to 1s data loss)
innodb_flush_log_at_trx_commit = 2
sync_binlog = 0
```

Both should be set consistently to avoid a mismatch between InnoDB data durability and binary log durability.

## Recommended Settings by Use Case

```text
Use Case                          | Setting
----------------------------------|--------
Financial/banking transactions    | 1
E-commerce order processing       | 1
Analytics ETL staging data        | 2
Read replicas                     | 2
Development/test environments     | 0 or 2
Batch load operations             | 0 or 2
```

## Monitoring Redo Log Write Performance

```sql
-- Check redo log write statistics
SHOW STATUS LIKE 'Innodb_log%';

SELECT
    VARIABLE_NAME,
    VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
    'Innodb_log_writes',
    'Innodb_log_write_requests',
    'Innodb_os_log_fsyncs',
    'Innodb_os_log_written'
);
```

High `Innodb_os_log_fsyncs` with setting=1 confirms that transactions are being individually fsynced to disk.

## Summary

`innodb_flush_log_at_trx_commit` controls the durability-performance tradeoff for InnoDB transactions. Setting 1 provides full ACID compliance with individual fsync on commit. Setting 2 offers near-ACID behavior with OS-level buffering (safe against MySQL crash, not OS crash). Setting 0 buffers entirely in memory for maximum throughput. Choose based on your data loss tolerance and transaction volume requirements.
