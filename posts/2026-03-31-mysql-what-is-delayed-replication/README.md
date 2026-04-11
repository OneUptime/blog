# What Is Delayed Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Delayed Replication, Disaster Recovery, Source Replica

Description: Delayed replication in MySQL intentionally lags a replica behind the source by a set number of seconds, providing a recovery window for accidental data changes.

---

## Overview

Delayed replication configures a MySQL replica to intentionally apply transactions from the source with a fixed time delay. Instead of applying events as soon as they arrive, the replica holds them in the relay log and applies them only after the specified delay has passed. This creates a time window in which you can recover from accidental destructive operations on the source -- such as an unintended `DROP TABLE` or mass `DELETE` -- by stopping the replica before the operation is applied.

## Configuring Delayed Replication

Set the delay in seconds when configuring the replication channel:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source-host',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_DELAY = 3600;  -- 1 hour delay

START REPLICA;
```

To change the delay on an existing replica:

```sql
STOP REPLICA SQL_THREAD;

CHANGE REPLICATION SOURCE TO
  SOURCE_DELAY = 7200;  -- Change to 2 hours

START REPLICA SQL_THREAD;
```

## Viewing the Current Delay

```sql
SHOW REPLICA STATUS\G
```

Look for these fields:
- `SQL_Delay`: configured delay in seconds
- `SQL_Remaining_Delay`: seconds until the next queued transaction will be applied
- `Replica_SQL_Running_State`: shows `Waiting until SOURCE_DELAY seconds after master executed event` when delay is active

## Using a Delayed Replica for Recovery

Suppose you accidentally run `DROP TABLE orders` on the source. Your recovery process:

```sql
-- 1. Stop the SQL thread on the delayed replica immediately
STOP REPLICA SQL_THREAD;

-- 2. Check what the replica has applied so far
SHOW REPLICA STATUS\G

-- 3. Apply transactions up to just before the DROP
-- Use START REPLICA UNTIL to replay to a specific position or GTID
START REPLICA SQL_THREAD UNTIL
  SOURCE_LOG_FILE = 'mysql-bin.000010',
  SOURCE_LOG_POS = 54321;

-- 4. Dump the recovered table from the replica
mysqldump -u root -p mydb orders > orders_recovery.sql

-- 5. Import into production source
mysql -u root -p mydb < orders_recovery.sql
```

## Combining Delayed Replication with GTID

With GTID mode, use `SQL_BEFORE_GTIDS` to stop before a specific transaction:

```sql
START REPLICA SQL_THREAD UNTIL
  SQL_BEFORE_GTIDS = '3E11FA47-71CA-11E1-9E33-C80AA9429562:500';
```

## Limitations

- A delayed replica cannot serve as an immediate failover target without first catching up.
- The delay only protects against operations that replicate; local source server crashes are not covered.
- Very large delays consume significant relay log disk space.

## Summary

Delayed replication is a safety net that holds transactions on a replica for a configurable period before applying them. When a destructive operation reaches the source, administrators have a window to stop the delayed replica, recover the affected data, and restore it to production. It complements regular backups but does not replace them, as it only covers recent operations within the delay window.
