# How to Use RESET MASTER in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Binary Log

Description: Learn how to use RESET MASTER in MySQL to delete binary log files, reset the log index, and start fresh binary logging from position 1.

---

## What Is RESET MASTER

`RESET MASTER` is a MySQL administrative command that deletes all binary log files listed in the binary log index file, clears the index, and resets the binary log file to sequence number 1 (or a specified number). It is the most aggressive way to clear binary logs and should be used with extreme caution in environments with active replication.

```sql
RESET MASTER;
```

After running this command, MySQL starts writing binary logs to `mysql-bin.000001` (or the configured prefix with `.000001`).

## When to Use RESET MASTER

Appropriate use cases include:

- Setting up a new primary for the first time when there are no replicas yet
- After restoring a database from backup and starting fresh
- In development or testing environments where binary log history is not needed
- When you want replicas to start from a clean state and will reconfigure them immediately

**Never** run `RESET MASTER` on a production primary that has active replicas without first stopping them and reconfiguring their positions afterward.

## Basic Usage

```sql
-- Delete all binary logs and start from 000001
RESET MASTER;
```

Verify the result:

```sql
SHOW BINARY LOGS;
```

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000001 |       156 | No        |
+------------------+-----------+-----------+
```

## RESET MASTER TO

MySQL 8.0.17+ supports `RESET MASTER TO` which lets you specify the starting sequence number for the new binary log:

```sql
-- Start binary log numbering from 100
RESET MASTER TO 100;
```

This results in a new log file named `mysql-bin.000100`. This is useful when you want to avoid log file name collisions after restoring a backup.

## Alternative: PURGE BINARY LOGS

If you only want to remove old binary logs without completely resetting the position, use `PURGE BINARY LOGS` instead. This is safer for production:

```sql
-- Delete logs before a specific date
PURGE BINARY LOGS BEFORE NOW() - INTERVAL 7 DAY;

-- Delete logs prior to a specific file (not including it)
PURGE BINARY LOGS TO 'mysql-bin.000040';
```

`PURGE BINARY LOGS` does not reset the current position - it just removes old files.

## Checking Current Binary Log State

Before running `RESET MASTER`, review the current state:

```sql
-- See all binary log files and their sizes
SHOW BINARY LOGS;

-- See the current binary log file and position
SHOW MASTER STATUS;
```

```text
+------------------+----------+--------------+------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB |
+------------------+----------+--------------+------------------+
| mysql-bin.000042 |     4921 |              |                  |
+------------------+----------+--------------+------------------+
```

## RESET MASTER in a Replication Workflow

When rebuilding replication after a `RESET MASTER`, you must reconfigure all replicas with the new binary log position:

```sql
-- On the primary
RESET MASTER;
SHOW MASTER STATUS;  -- note the new file and position
```

```sql
-- On each replica
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=4;
START REPLICA;
SHOW REPLICA STATUS\G
```

## Permissions Required

`RESET MASTER` requires the `RELOAD` privilege:

```sql
GRANT RELOAD ON *.* TO 'dba_user'@'localhost';
```

## Summary

`RESET MASTER` deletes all binary log files and resets the binary log position to 1, providing a clean slate for binary logging. Use it only when there are no active replicas, or when you are prepared to immediately reconfigure replica positions. For routine log cleanup in production, prefer `PURGE BINARY LOGS` which is non-destructive to replication state.
