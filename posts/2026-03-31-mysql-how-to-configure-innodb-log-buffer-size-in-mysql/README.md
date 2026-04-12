# How to Configure InnoDB Log Buffer Size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Log Buffer, Configuration, Performance

Description: Learn how to configure the InnoDB log buffer size in MySQL to reduce disk I/O for large transactions and improve write throughput.

---

## What Is the InnoDB Log Buffer?

The InnoDB log buffer is a memory area that buffers redo log records before they are written to the redo log files on disk. Each time a DML statement executes, redo log records are written to this buffer first. They are flushed to disk at transaction commit (controlled by `innodb_flush_log_at_trx_commit`) or when the buffer becomes full.

A larger log buffer allows large transactions that modify data across many rows to run without flushing the redo log to disk on every write, reducing I/O.

## Checking the Current Log Buffer Size

```sql
SHOW VARIABLES LIKE 'innodb_log_buffer_size';
```

```text
+------------------------+---------+
| Variable_name          | Value   |
+------------------------+---------+
| innodb_log_buffer_size | 16777216|
+------------------------+---------+
```

The default is 16MB in MySQL 8.0.

## Setting the Log Buffer Size

In `my.cnf`:

```text
[mysqld]
innodb_log_buffer_size = 64M
```

As of MySQL 8.0.30, this variable is dynamic and can be set at runtime:

```sql
SET GLOBAL innodb_log_buffer_size = 67108864;  -- 64MB
```

## Sizing the Log Buffer

The log buffer should be large enough to hold redo log records for the largest transaction in your workload without requiring mid-transaction flushes.

Estimate your transaction size by checking how much redo log is generated per transaction:

```sql
-- Before large transaction
SELECT VARIABLE_VALUE INTO @before
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Innodb_os_log_written';

-- Run transaction here

-- After large transaction
SELECT VARIABLE_VALUE - @before AS bytes_logged
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Innodb_os_log_written';
```

Common sizing guidelines:
- Default 16MB is fine for OLTP with small transactions
- Use 64MB-256MB for workloads with large bulk inserts or updates
- If you run batch jobs that insert millions of rows in one transaction, size accordingly

## Monitoring Log Buffer Flushes

Check how often the log buffer flushes to disk:

```sql
SHOW GLOBAL STATUS LIKE 'Innodb_log_waits';
```

```text
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| Innodb_log_waits | 0     |
+------------------+-------+
```

A non-zero `Innodb_log_waits` value means transactions had to wait for the log buffer to be flushed because it was full. This indicates the log buffer is too small.

Also monitor:

```sql
SHOW GLOBAL STATUS LIKE 'Innodb_os_log_%';
```

```text
+---------------------------+----------+
| Variable_name             | Value    |
+---------------------------+----------+
| Innodb_os_log_fsyncs      | 12345    |
| Innodb_os_log_pending_fsyncs | 0     |
| Innodb_os_log_pending_writes | 0     |
| Innodb_os_log_written     | 10485760 |
+---------------------------+----------+
```

## Interaction with innodb_flush_log_at_trx_commit

The log buffer flush behavior depends on `innodb_flush_log_at_trx_commit`:

| Setting | Log Buffer Flush Timing |
|---|---|
| `1` (default) | Flushed to disk on every COMMIT |
| `2` | Written to OS cache on COMMIT, flushed to disk every second |
| `0` | Flushed from buffer every second only |

For a larger log buffer to reduce mid-transaction flushes, use settings `2` or `0` (with understood durability trade-offs).

## Practical Example for Batch Loading

If you frequently load large CSV files into MySQL, increase the log buffer and combine with `innodb_flush_log_at_trx_commit = 2`:

```text
[mysqld]
innodb_log_buffer_size = 256M
innodb_flush_log_at_trx_commit = 2
```

```sql
-- Batch insert example
START TRANSACTION;
LOAD DATA INFILE '/tmp/data.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
COMMIT;
```

## Summary

The InnoDB log buffer reduces disk I/O by staging redo log records in memory before flushing them to disk. Increase `innodb_log_buffer_size` from the default 16MB if you run large transactions or experience `Innodb_log_waits` greater than zero. For bulk load workloads, 64MB-256MB paired with `innodb_flush_log_at_trx_commit = 2` can significantly improve throughput.
