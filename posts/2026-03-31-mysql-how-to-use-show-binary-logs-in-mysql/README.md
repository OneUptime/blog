# How to Use SHOW BINARY LOGS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Replication, Point-in-Time Recovery

Description: Learn how to use SHOW BINARY LOGS in MySQL to list binary log files, check their sizes, and manage them for replication and point-in-time recovery.

---

## What Are MySQL Binary Logs

The binary log (binlog) is a sequential record of all data-modifying SQL statements (INSERT, UPDATE, DELETE, DDL) that MySQL executes. It is used for:

- **Replication** - replicas read the primary's binary logs to apply changes
- **Point-in-time recovery (PITR)** - restore a database to any point after the last backup
- **Auditing** - review what changes were made and when

Binary logging is enabled by default in MySQL 8.0 and required for replication.

## Checking If Binary Logging Is Enabled

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'log_bin_basename';
```

## SHOW BINARY LOGS Syntax

```sql
SHOW BINARY LOGS;
-- Alias (deprecated in MySQL 8.2, removed in 8.4):
SHOW MASTER LOGS;
```

## Example Output

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000001 |       177 | No        |
| mysql-bin.000002 |  10485760 | No        |
| mysql-bin.000003 |   3212456 | No        |
+------------------+-----------+-----------+
```

- `Log_name` - the binary log filename on disk
- `File_size` - size in bytes
- `Encrypted` - whether the log is encrypted (MySQL 8.0+)

## Checking the Current Binary Log Position

```sql
SHOW MASTER STATUS\G
```

Note: `SHOW MASTER STATUS` is deprecated in MySQL 8.2 and removed in MySQL 8.4. Use `SHOW BINARY LOG STATUS\G` instead on newer versions.

```text
*************************** 1. row ***************************
             File: mysql-bin.000003
         Position: 3212456
     Binlog_Do_DB:
 Binlog_Ignore_DB:
Executed_Gtid_Set: ...
```

This shows the current write position - important for setting up replication.

## Purging Old Binary Logs

Binary logs accumulate and consume disk space. Purge logs that are no longer needed:

```sql
-- Purge all logs before a specific file
PURGE BINARY LOGS TO 'mysql-bin.000003';

-- Purge all logs older than a specific date
PURGE BINARY LOGS BEFORE '2026-03-01 00:00:00';
```

Never purge logs that a replica has not yet consumed. Check replica status first:

```sql
SHOW REPLICA STATUS\G
-- Look at: Master_Log_File and Read_Master_Log_Pos
```

## Automatic Log Expiration

Configure automatic purging to avoid disk exhaustion:

```sql
-- Expire logs after 7 days
SET GLOBAL binlog_expire_logs_seconds = 604800;
```

In `my.cnf`:

```text
[mysqld]
binlog_expire_logs_seconds = 604800
```

The deprecated `expire_logs_days` variable still works but `binlog_expire_logs_seconds` is preferred in MySQL 8.0.

## Binary Log Formats

Three formats control how events are recorded:

```sql
SHOW VARIABLES LIKE 'binlog_format';
```

- `STATEMENT` - records the SQL statement text
- `ROW` - records the actual row changes (recommended for replication safety)
- `MIXED` - MySQL chooses statement or row per query

Switch format at runtime (MySQL 8.0 only):

```sql
SET GLOBAL binlog_format = 'ROW';
```

Note: `binlog_format` is deprecated in MySQL 8.0.34 and removed in MySQL 8.4, where ROW format is the only supported format.

## Reading Binary Log Contents

Use `mysqlbinlog` to read binary log files as text:

```bash
mysqlbinlog /var/lib/mysql/mysql-bin.000003

# Filter by time range
mysqlbinlog --start-datetime="2026-03-31 00:00:00" \
            --stop-datetime="2026-03-31 06:00:00" \
            /var/lib/mysql/mysql-bin.000003
```

## Monitoring Binary Log Disk Usage

```bash
# List binary logs and their sizes
mysql -u root -p -e "SHOW BINARY LOGS;" | awk 'NR>1 {sum += $2} END {print "Total:", sum/1024/1024, "MB"}'
```

There is no Performance Schema table that lists all binary log files and their sizes. To aggregate sizes from within an application, parse the result set of `SHOW BINARY LOGS` programmatically, or use the shell command above.

## Summary

`SHOW BINARY LOGS` lists all binary log files with their sizes and encryption status. Binary logs are essential for replication and point-in-time recovery. Manage disk usage with `PURGE BINARY LOGS` and `binlog_expire_logs_seconds`, always verifying that replicas have consumed a log before purging it. Use ROW format for the safest replication fidelity.
