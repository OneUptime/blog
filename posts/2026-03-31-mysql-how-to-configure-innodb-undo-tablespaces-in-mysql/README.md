# How to Configure InnoDB Undo Tablespaces in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Undo Log, Tablespace, Configuration

Description: Learn how to configure InnoDB undo tablespaces in MySQL 8.0 to manage undo log growth and enable automated truncation for long-running transactions.

---

## What Are InnoDB Undo Tablespaces?

Undo tablespaces store the undo log records that InnoDB uses for transaction rollback and MVCC (Multi-Version Concurrency Control). When a row is updated, the previous version is written to the undo log so that concurrent transactions reading older snapshots can still see the original data.

In MySQL 8.0, undo tablespaces are fully separate files that can be managed, truncated, and moved independently of the system tablespace.

## Default Undo Tablespace Setup

By default, MySQL 8.0 creates two undo tablespaces:

```sql
SELECT TABLESPACE_NAME, FILE_NAME, FILE_TYPE, ENGINE
FROM information_schema.FILES
WHERE FILE_TYPE = 'UNDO LOG';
```

```text
+-----------------+-------------------+-----------+--------+
| TABLESPACE_NAME | FILE_NAME         | FILE_TYPE | ENGINE |
+-----------------+-------------------+-----------+--------+
| innodb_undo_001 | ./undo_001        | UNDO LOG  | InnoDB |
| innodb_undo_002 | ./undo_002        | UNDO LOG  | InnoDB |
+-----------------+-------------------+-----------+--------+
```

## Creating Additional Undo Tablespaces

You can create additional undo tablespaces to spread the undo log across multiple disks:

```sql
CREATE UNDO TABLESPACE innodb_undo_003
  ADD DATAFILE '/var/lib/mysql-undo/undo_003.ibu';
```

The `.ibu` extension is used for undo tablespace files. MySQL 8.0 requires at least two active undo tablespaces at all times for truncation to work.

## Enabling Automatic Undo Tablespace Truncation

Long-running transactions cause undo tablespaces to grow. Enable automatic truncation to reclaim disk space:

```text
[mysqld]
innodb_undo_log_truncate = ON
innodb_max_undo_log_size = 1073741824
innodb_purge_rseg_truncate_frequency = 128
```

- `innodb_undo_log_truncate = ON` - enables automatic truncation.
- `innodb_max_undo_log_size` - the size threshold (default 1GB) at which truncation is triggered.
- `innodb_purge_rseg_truncate_frequency` - how often the purge system checks for segments to truncate (in iterations of the purge coordinator loop).

Verify truncation is enabled:

```sql
SHOW VARIABLES LIKE 'innodb_undo_log_truncate';
```

## Monitoring Undo Tablespace Size

```sql
SELECT
  NAME,
  STATE,
  ROUND(FILE_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.INNODB_TABLESPACES
WHERE ROW_FORMAT = 'Undo';
```

You can also watch undo log history length in InnoDB status:

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for: History list length XXXX
```

A history list length above 100,000 indicates a long-running transaction is preventing purge from cleaning up old undo records.

## Taking an Undo Tablespace Offline for Maintenance

```sql
-- Mark it inactive (MySQL will stop writing new undo records to it)
ALTER UNDO TABLESPACE innodb_undo_003 SET INACTIVE;

-- Wait for it to become empty, then drop it
DROP UNDO TABLESPACE innodb_undo_003;
```

You cannot drop an undo tablespace that is still active. The `SET INACTIVE` command tells InnoDB to drain it first.

## Moving Undo Tablespaces

In MySQL 8.0, undo tablespaces can be stored outside the data directory:

```text
[mysqld]
innodb_undo_directory = /var/lib/mysql-undo
```

This setting applies only at initialization time when creating new undo tablespaces.

## Summary

InnoDB undo tablespaces in MySQL 8.0 are separate files that store MVCC history and rollback information. Enable `innodb_undo_log_truncate` to automatically reclaim space when tablespaces exceed `innodb_max_undo_log_size`. Monitor the history list length in `SHOW ENGINE INNODB STATUS` to detect long-running transactions that block undo purge.
