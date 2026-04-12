# How to Use FLUSH LOGS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Logging, Administration

Description: Learn how to use FLUSH LOGS in MySQL to rotate log files, close and reopen log handles, and manage binary, error, and slow query logs.

---

## What Is FLUSH LOGS

`FLUSH LOGS` instructs MySQL to close all currently open log files and reopen them. For the binary log, a new log file is created with an incremented sequence number. This is the primary mechanism for log rotation in MySQL and is commonly integrated into backup and maintenance scripts.

```sql
FLUSH LOGS;
```

Running `FLUSH LOGS` requires the `RELOAD` privilege.

## Types of Logs You Can Flush

MySQL 8.0 allows you to flush individual log types instead of all logs at once:

```sql
-- Flush and rotate the binary log
FLUSH BINARY LOGS;

-- Close and reopen the error log
FLUSH ERROR LOGS;

-- Close and reopen the general query log
FLUSH GENERAL LOGS;

-- Close and reopen the slow query log
FLUSH SLOW LOGS;

-- Flush and rotate the relay log on a replica
FLUSH RELAY LOGS;
```

You can combine multiple log types in one statement:

```sql
FLUSH BINARY LOGS, SLOW LOGS;
```

## Binary Log Rotation

When you flush the binary log, MySQL closes the current binary log file and starts writing to a new one with the next sequence number. This is important for managing disk space and for point-in-time recovery:

```sql
-- View current binary logs before flush
SHOW BINARY LOGS;

-- Rotate to a new binary log file
FLUSH BINARY LOGS;

-- View binary logs after flush - new file appears
SHOW BINARY LOGS;
```

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000041 |       156 | No        |
| mysql-bin.000042 |       156 | No        |
| mysql-bin.000043 |      1024 | No        |  <- new file after flush
+------------------+-----------+-----------+
```

## Log Rotation with Shell Scripts

A common pattern is to flush logs as part of a scheduled log rotation script:

```bash
#!/bin/bash
# Rotate MySQL binary logs daily
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH BINARY LOGS;"

# Remove binary logs older than 7 days
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "PURGE BINARY LOGS BEFORE NOW() - INTERVAL 7 DAY;"
```

## Flushing Error Logs

MySQL's error log captures startup, shutdown, and critical messages. Flushing closes the current file and opens a new one:

```sql
FLUSH ERROR LOGS;
```

On Linux systems, log rotation tools like `logrotate` often send a signal to MySQL or call `FLUSH LOGS` after rotating the file on disk.

## Flushing Slow Query Log

If the slow query log is enabled, you can rotate it without restarting MySQL:

```sql
-- Check if slow query log is on
SHOW VARIABLES LIKE 'slow_query_log';

-- Flush the slow query log
FLUSH SLOW LOGS;
```

## Prevent Replication of FLUSH LOGS

On a replica server, you may want to flush logs locally without the command propagating through replication:

```sql
FLUSH LOCAL LOGS;
-- or equivalently
FLUSH NO_WRITE_TO_BINLOG LOGS;
```

## FLUSH LOGS in Backup Workflows

A standard backup workflow uses `FLUSH LOGS` to mark a clean binary log boundary:

```sql
-- Flush before backup to start a fresh binary log
FLUSH BINARY LOGS;

-- Record the current binary log position
SHOW BINARY LOG STATUS;

-- ... run mysqldump or physical backup ...
```

This makes it easy to identify which binary log files contain changes made after the backup.

## Summary

`FLUSH LOGS` is the primary tool for log rotation in MySQL. Use `FLUSH BINARY LOGS` to rotate binary logs and mark backup boundaries, `FLUSH SLOW LOGS` and `FLUSH ERROR LOGS` for rotating operational logs, and `FLUSH LOCAL LOGS` on replicas to prevent the command from being replicated to downstream servers.
