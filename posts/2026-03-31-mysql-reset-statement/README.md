# How to Use RESET Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Administration

Description: Learn how to use the RESET statement in MySQL to clear binary logs, reset replica state, and reinitialize replication channels.

---

## What Is the RESET Statement

The `RESET` statement in MySQL is an administrative command used to clear and reinitialize server state. Unlike `FLUSH`, which refreshes caches while preserving state, `RESET` performs a more destructive operation - it deletes log files, clears positions, and resets counters. It requires the `RELOAD` privilege for most options and `REPLICATION SLAVE` privilege for replica-related options.

The main forms are:

```sql
RESET MASTER;         -- delete all binary logs and reset position
RESET REPLICA;        -- clear replica configuration and relay logs
RESET REPLICA ALL;    -- completely remove all replication configuration
```

## RESET MASTER

`RESET MASTER` deletes all binary log files listed in the binary log index and resets the binary log index to be empty. It creates a new binary log file starting from sequence number 1:

```sql
RESET MASTER;
```

After this command, the binary log starts fresh with `mysql-bin.000001`. This is useful in development environments or when setting up replication from scratch.

**Warning**: Never run `RESET MASTER` on a production server with active replicas - replicas will lose their synchronization point and replication will break.

You can also use `RESET MASTER TO` to set a specific starting position:

```sql
-- Reset to a specific binary log sequence number
RESET MASTER TO 100;
```

## RESET REPLICA

`RESET REPLICA` (called `RESET SLAVE` in MySQL versions before 8.0.22) clears the information stored in the replica's relay logs and resets the replication position:

```sql
-- Must stop replication first
STOP REPLICA;

-- Clear relay logs and reset replication state
RESET REPLICA;

-- Then reconfigure and restart
CHANGE REPLICATION SOURCE TO SOURCE_HOST='primary.example.com', SOURCE_PORT=3306,
  SOURCE_USER='repl_user', SOURCE_PASSWORD='repl_pass',
  SOURCE_LOG_FILE='mysql-bin.000001', SOURCE_LOG_POS=4;
START REPLICA;
```

`RESET REPLICA` preserves the replication connection configuration (host, port, credentials). Use `RESET REPLICA ALL` to remove the configuration entirely.

## RESET REPLICA ALL

`RESET REPLICA ALL` performs a complete reset, removing all relay log files and deleting all connection configuration:

```sql
STOP REPLICA;
RESET REPLICA ALL;
```

After `RESET REPLICA ALL`, the replica has no knowledge of any source server - you must reconfigure replication from scratch with `CHANGE REPLICATION SOURCE TO`.

## Checking State Before and After

Before running `RESET` commands, check current state:

```sql
-- Check binary log position on primary
SHOW MASTER STATUS;

-- Check replica state
SHOW REPLICA STATUS\G
```

After resetting:

```sql
-- Verify binary logs reset
SHOW BINARY LOGS;

-- Verify replica status cleared
SHOW REPLICA STATUS\G
```

## Resetting Query Cache Statistics

In MySQL versions that still have query cache (pre-8.0), you could reset statistics:

```sql
-- Reset query cache statistics (MySQL 5.x only)
RESET QUERY CACHE;
```

This was removed in MySQL 8.0 when the query cache was deprecated entirely.

## Practical Example: Clean Replication Setup

When setting up replication on a new replica from a fresh dump:

```bash
# On the primary - get a consistent dump with binary log position
mysqldump --single-transaction --master-data=2 -u root -p --all-databases > dump.sql
```

```sql
-- On the replica
STOP REPLICA;
RESET REPLICA ALL;

-- Import the dump
SOURCE /path/to/dump.sql;

-- Configure and start replication
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='10.0.0.1',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='pass',
  SOURCE_LOG_FILE='mysql-bin.000010',
  SOURCE_LOG_POS=1234;
START REPLICA;
```

## Summary

The `RESET` statement in MySQL reinitializes replication-related state and binary logs. Use `RESET MASTER` to clear binary logs on a primary (carefully), `RESET REPLICA` to clear relay logs while keeping connection settings, and `RESET REPLICA ALL` to completely remove replication configuration. Always stop replication before running `RESET REPLICA` commands.
