# How to Tune InnoDB Log File Size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Performance Tuning, Redo Log, Database

Description: Learn how to tune InnoDB redo log file size in MySQL to reduce checkpoint frequency, improve write throughput, and minimize I/O spikes.

---

## What Are InnoDB Log Files

InnoDB uses redo logs (also called the write-ahead log) to ensure durability. Before any data page is modified in the buffer pool, the change is written to the redo log. On crash recovery, MySQL replays redo log entries to bring data back to a consistent state.

The redo log is circular - when it fills up, InnoDB must flush dirty pages from the buffer pool to disk to free space. This process is called a checkpoint and causes I/O spikes.

## Check Current Log File Settings

```sql
SHOW VARIABLES LIKE 'innodb_log%';
```

```text
+-----------------------------+----------+
| Variable_name               | Value    |
+-----------------------------+----------+
| innodb_log_buffer_size      | 16777216 |
| innodb_log_file_size        | 50331648 |
| innodb_log_files_in_group   | 2        |
+-----------------------------+----------+
```

The default total redo log size is 2 x 48 MB = 96 MB - too small for write-heavy workloads.

## Check How Often Checkpoints Are Triggered

A useful heuristic: if InnoDB is performing checkpoints more frequently than every 60 seconds under normal load, the log size is too small.

```sql
-- Check LSN (Log Sequence Number) advancement
SHOW ENGINE INNODB STATUS\G
```

Look for:
```text
Log sequence number 1234567890
Log flushed up to   1234567850
Pages flushed up to 1234567000
Last checkpoint at  1234565000
```

If `Log sequence number` and `Last checkpoint at` are close together, checkpoints are frequent.

## Determine the Optimal Log File Size

A common approach is to measure 1 hour of redo log writes under typical load:

```sql
SELECT variable_value INTO @written1
FROM performance_schema.global_status
WHERE variable_name = 'Innodb_os_log_written';

-- Wait 1 hour, then run:
SELECT variable_value INTO @written2
FROM performance_schema.global_status
WHERE variable_name = 'Innodb_os_log_written';

SELECT ROUND((@written2 - @written1) / 1024 / 1024, 0) AS redo_log_mb_per_hour;
```

Set the total redo log size to 1-2x the hourly write volume. A 1-4 GB total log size is typical for write-heavy production servers.

## Configure in MySQL 8.0 (Dynamic Resizing)

MySQL 8.0.30+ supports dynamic redo log resizing - no restart required:

```sql
-- Check current innodb_redo_log_capacity (MySQL 8.0.30+)
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';

-- Set to 4 GB
SET GLOBAL innodb_redo_log_capacity = 4 * 1024 * 1024 * 1024;
```

Verify:
```sql
SELECT variable_value
FROM performance_schema.global_variables
WHERE variable_name = 'innodb_redo_log_capacity';
```

## Configure in MySQL 5.7 or Earlier MySQL 8.0

For older versions requiring a restart:

```text
[mysqld]
innodb_log_file_size = 1G
innodb_log_files_in_group = 2
```

Procedure for MySQL 5.7:

```bash
# 1. Stop MySQL cleanly
systemctl stop mysql

# 2. Update my.cnf with new innodb_log_file_size, then start MySQL
# MySQL 5.7+ detects the size change and recreates log files automatically
systemctl start mysql
```

## Trade-offs of Larger Log Files

| Aspect | Smaller Log | Larger Log |
|--------|-------------|------------|
| Checkpoint frequency | High | Low |
| Write I/O spikes | More frequent | Fewer |
| Crash recovery time | Faster | Slower (more log to replay) |
| Write throughput | Lower | Higher |

For most production systems, the write throughput improvement outweighs the slightly longer crash recovery time.

## Monitor Redo Log Pressure

```sql
-- MySQL 8.0.30+
SELECT * FROM performance_schema.innodb_redo_log_files;
```

```sql
-- Check dirty pages waiting to be flushed
SHOW STATUS LIKE 'Innodb_buffer_pool_pages_dirty';
```

## Summary

Tuning InnoDB log file size reduces checkpoint frequency and I/O spikes for write-heavy workloads. Set total redo log capacity to 1-4 GB based on measured hourly write volume. MySQL 8.0.30+ supports dynamic resizing, while older versions require removing old log files and restarting MySQL.
