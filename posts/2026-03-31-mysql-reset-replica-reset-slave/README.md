# How to Use RESET REPLICA (RESET SLAVE) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Replica

Description: Learn how to use RESET REPLICA (formerly RESET SLAVE) in MySQL to clear relay logs, reset replication state, and reconfigure replicas.

---

## What Is RESET REPLICA

`RESET REPLICA` (introduced in MySQL 8.0.22, previously called `RESET SLAVE`) clears the replica's replication state. It deletes all relay log files, resets the relay log position to 1, and clears the replication metadata stored in memory and in the `mysql.slave_relay_log_info` and `mysql.slave_master_info` tables (when using table-based repositories).

```sql
-- Modern syntax (MySQL 8.0.22+)
RESET REPLICA;

-- Legacy syntax (MySQL 5.x and 8.0 before 8.0.22)
RESET SLAVE;
```

## RESET REPLICA vs RESET REPLICA ALL

There are two forms of the command with different behavior:

- `RESET REPLICA` - deletes relay logs and resets position, but preserves the connection configuration (host, port, user, password)
- `RESET REPLICA ALL` - deletes relay logs, resets position, AND removes all connection configuration

```sql
-- Keep connection info, just reset relay logs
RESET REPLICA;

-- Remove all configuration entirely
RESET REPLICA ALL;
```

## Prerequisites

Replication must be stopped before running `RESET REPLICA`:

```sql
-- Stop the replica I/O and SQL threads
STOP REPLICA;

-- Then reset
RESET REPLICA;
```

If you try to run `RESET REPLICA` while replication is running, you get an error.

## Common Use Case: Re-synchronizing a Replica

When a replica has drifted out of sync or encountered errors, re-syncing typically involves:

```sql
-- Step 1: Stop replication
STOP REPLICA;

-- Step 2: Reset the relay log state
RESET REPLICA;

-- Step 3: Reconfigure with the correct primary position
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='primary.example.com',
  SOURCE_PORT=3306,
  SOURCE_USER='repl_user',
  SOURCE_PASSWORD='secure_password',
  SOURCE_LOG_FILE='mysql-bin.000015',
  SOURCE_LOG_POS=1234;

-- Step 4: Start replication
START REPLICA;

-- Step 5: Verify
SHOW REPLICA STATUS\G
```

## Resetting and Reconfiguring from Scratch

If you want to completely remove and reconfigure replication:

```sql
STOP REPLICA;
RESET REPLICA ALL;

-- Now configure fresh
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='new-primary.example.com',
  SOURCE_PORT=3306,
  SOURCE_USER='repl_user',
  SOURCE_PASSWORD='new_password',
  SOURCE_AUTO_POSITION=1;  -- use GTID-based replication

START REPLICA;
```

## Using GTID-Based Replication After Reset

With GTID replication, after `RESET REPLICA ALL` you also need to clear the GTID state:

```sql
STOP REPLICA;
RESET REPLICA ALL;
RESET MASTER;  -- clears the local GTID_EXECUTED set

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='primary.example.com',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
```

## Verifying Replica State

Before and after the reset, check the replica status:

```sql
SHOW REPLICA STATUS\G
```

Key fields to verify after reset and restart:
- `Replica_IO_Running: Yes`
- `Replica_SQL_Running: Yes`
- `Seconds_Behind_Source: 0` (after catch-up)
- `Last_Error:` (should be empty)

## Required Privileges

```sql
-- The user running RESET REPLICA needs RELOAD privilege
GRANT RELOAD ON *.* TO 'dba_user'@'localhost';
```

## Summary

`RESET REPLICA` clears relay logs and resets the replication position while preserving connection settings, while `RESET REPLICA ALL` also removes all connection configuration. Always stop replication with `STOP REPLICA` before resetting. Use `RESET REPLICA` for quick re-syncs and `RESET REPLICA ALL` when fully reconfiguring replication from scratch.
