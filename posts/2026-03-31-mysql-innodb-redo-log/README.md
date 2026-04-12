# What Is the InnoDB Redo Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Redo Log, Crash Recovery, Durability

Description: The InnoDB redo log is a write-ahead log that records all changes to data pages, ensuring committed transactions survive crashes and server restarts in MySQL.

---

## Overview

The InnoDB redo log is a fundamental component of InnoDB's durability guarantee. It is a write-ahead log (WAL) - changes are recorded to the redo log before they are applied to the actual data pages on disk. If MySQL crashes, InnoDB replays the redo log on the next startup to restore any committed transactions whose changes had not yet been written to the data files.

Without the redo log, InnoDB would need to write every change directly to the data files synchronously, which would be extremely slow. The redo log allows InnoDB to batch data file writes while still guaranteeing that committed transactions are durable.

## How It Works

When a transaction commits, InnoDB writes the changes to the redo log buffer first, then flushes the redo log buffer to the redo log files on disk. This flush is what makes the transaction durable. The actual data pages in the buffer pool are modified in memory during the transaction, making them "dirty pages." A background thread eventually writes these dirty pages to the data files on disk.

```text
Transaction commits -->
  Changes written to redo log buffer -->
    Redo log buffer flushed to disk (makes it durable) -->
      Background thread eventually writes dirty pages to data files
```

## Redo Log Configuration

In MySQL 8.0.30 and later, the redo log size is controlled by `innodb_redo_log_capacity`. In older versions, it was controlled by `innodb_log_file_size` and `innodb_log_files_in_group`.

```sql
-- Check current redo log capacity (MySQL 8.0.30+)
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';

-- Check older parameters (MySQL 8.0 before 8.0.30)
SHOW VARIABLES LIKE 'innodb_log_file_size';
SHOW VARIABLES LIKE 'innodb_log_files_in_group';

-- Change redo log capacity (MySQL 8.0.30+, dynamic - no restart required)
SET GLOBAL innodb_redo_log_capacity = 4294967296; -- 4GB
```

## The innodb_flush_log_at_trx_commit Setting

This setting controls the balance between durability and performance:

```sql
-- Check the current setting
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
```

```text
Value 1 (default, safest): Redo log is flushed to disk on every COMMIT.
  Full ACID durability. Slowest for write-heavy workloads.

Value 2 (balanced): Redo log buffer written to OS cache on COMMIT,
  flushed to disk once per second. Survives MySQL crash but not OS crash.

Value 0 (fastest, least safe): Redo log flushed once per second only.
  Can lose up to 1 second of committed transactions on crash.
```

```ini
# In my.cnf for production (full durability)
innodb_flush_log_at_trx_commit = 1

# For batch import or lower-risk workloads
innodb_flush_log_at_trx_commit = 2
```

## Monitoring Redo Log Activity

```sql
-- Check redo log status
SHOW ENGINE INNODB STATUS\G
-- Look for "LOG" section showing LSN (Log Sequence Number) values

-- Monitor redo log usage (MySQL 8.0.30+)
SELECT * FROM performance_schema.innodb_redo_log_files;

-- Check how much redo log space is used
SHOW STATUS LIKE 'Innodb_redo_log_current_lsn';
SHOW STATUS LIKE 'Innodb_redo_log_checkpoint_lsn';
```

## Redo Log and Checkpoint

InnoDB periodically performs a checkpoint - writing dirty buffer pool pages to the data files and advancing the checkpoint LSN. Pages before the checkpoint LSN have been persisted and the redo log entries for them can be reused. A too-small redo log causes frequent checkpoints, increasing I/O and reducing throughput.

```sql
-- Monitor checkpoint age to detect if redo log is undersized
SELECT
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name = 'Innodb_redo_log_current_lsn') -
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name = 'Innodb_redo_log_checkpoint_lsn') AS checkpoint_age;
```

## Summary

The InnoDB redo log is a write-ahead log that records all data modifications before they are written to data files, ensuring committed transactions survive crashes. The `innodb_flush_log_at_trx_commit` setting controls the durability vs performance tradeoff, with a value of 1 providing full ACID guarantees. Sizing the redo log appropriately reduces checkpoint frequency and improves write throughput. The redo log is central to InnoDB's crash recovery mechanism and is one of the most important components to understand and tune for write-heavy MySQL workloads.
