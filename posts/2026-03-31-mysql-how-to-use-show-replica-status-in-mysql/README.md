# How to Use SHOW REPLICA STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, SHOW REPLICA STATUS, High Availability

Description: Learn how to use SHOW REPLICA STATUS in MySQL to monitor replication health, check lag, diagnose errors, and verify replica connectivity.

---

## What Is SHOW REPLICA STATUS

`SHOW REPLICA STATUS` (previously `SHOW SLAVE STATUS` before MySQL 8.0.22) displays the current state of a MySQL replica's replication threads - the I/O thread that receives binary log events from the primary, and the SQL thread that applies them. It is the primary tool for monitoring replication health and diagnosing failures.

## Basic Syntax

```sql
-- MySQL 8.0.22+
SHOW REPLICA STATUS\G

-- Older syntax still works
SHOW SLAVE STATUS\G
```

The `\G` vertical format is essential because the output has many columns.

## Key Fields in SHOW REPLICA STATUS

```sql
SHOW REPLICA STATUS\G
```

Critical fields to monitor:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Seconds_Behind_Source: 0
Last_IO_Error:
Last_SQL_Error:
Source_Host: 192.168.1.10
Source_Port: 3306
Source_Log_File: mysql-bin.000010
Read_Source_Log_Pos: 4523891
Relay_Source_Log_File: mysql-bin.000010
Exec_Source_Log_Pos: 4523891
```

## Health Check - Both Threads Running

For a healthy replica, both `Replica_IO_Running` and `Replica_SQL_Running` must be `Yes`:

```sql
SHOW REPLICA STATUS\G
-- Replica_IO_Running: Yes (must be Yes)
-- Replica_SQL_Running: Yes (must be Yes)
```

Or using performance_schema tables (MySQL 8.0+):

```sql
SELECT
    conn.SERVICE_STATE AS io_thread_state,
    applier.SERVICE_STATE AS sql_thread_state,
    conn.LAST_ERROR_MESSAGE AS last_io_error
FROM performance_schema.replication_connection_status conn
JOIN performance_schema.replication_applier_status applier
    ON conn.CHANNEL_NAME = applier.CHANNEL_NAME;
```

## Monitoring Replication Lag

`Seconds_Behind_Source` measures how far the replica's SQL thread is behind the primary's binary log:

```sql
SHOW REPLICA STATUS\G
-- Seconds_Behind_Source: 0  (healthy)
-- Seconds_Behind_Source: 45 (45 seconds behind - investigate)
-- Seconds_Behind_Source: NULL (replica not running)
```

Note: `Seconds_Behind_Source` can be imprecise under high load. For accurate lag measurement, use the `heartbeat_period` mechanism or tools like `pt-heartbeat`.

## Diagnosing I/O Thread Errors

If `Replica_IO_Running` is `No`, check `Last_IO_Error`:

```text
Last_IO_Error: error connecting to master 'repl@192.168.1.10:3306'
- retry-time: 60 retries: 86400
Message: Authentication plugin 'caching_sha2_password' reported error: ...
```

Common causes:
- Network connectivity issues
- Replication user password change
- Primary IP address change
- Firewall blocking port 3306

## Diagnosing SQL Thread Errors

If `Replica_SQL_Running` is `No`, check `Last_SQL_Error`:

```text
Last_SQL_Error: Error 'Duplicate entry '123' for key 'PRIMARY'' on query.
Default database: 'mydb'. Query: 'INSERT INTO users VALUES ...'
```

Common causes:
- Data divergence between primary and replica
- Conflicting writes directly on the replica
- DDL statement failed due to missing objects

## Skipping a Failed Transaction (GTID mode)

With GTID replication, skip a failed transaction:

```sql
-- Find the failing GTID
SHOW REPLICA STATUS\G
-- Look at: Executed_Gtid_Set and Retrieved_Gtid_Set

-- Stop replication before skipping
STOP REPLICA;

-- Skip the transaction by executing an empty transaction
SET GTID_NEXT = '3E11FA47-71CA-11E1-9E33-C80AA9429562:42';
BEGIN;
COMMIT;
SET GTID_NEXT = 'AUTOMATIC';
START REPLICA;
```

## Checking Binary Log Position Lag

The difference between `Read_Source_Log_Pos` and `Exec_Source_Log_Pos` shows how much of the received binary log has been applied:

```sql
SHOW REPLICA STATUS\G
-- Compare Read_Source_Log_Pos and Exec_Source_Log_Pos
-- When both reference the same log file, the difference is:
-- Read_Source_Log_Pos - Exec_Source_Log_Pos = unapplied bytes in relay log
```

## Replication with GTID - Checking GTID Sets

```sql
SHOW REPLICA STATUS\G
-- Retrieved_Gtid_Set: all GTIDs received from the primary
-- Executed_Gtid_Set: all GTIDs applied on this replica
```

Compare with the primary:

```sql
-- On primary (MySQL 8.0)
SHOW MASTER STATUS\G
-- MySQL 8.2+ uses: SHOW BINARY LOG STATUS\G
-- Executed_Gtid_Set: all events that happened on primary
```

## Starting and Stopping Replication Threads

```sql
-- Stop both threads
STOP REPLICA;

-- Stop only the SQL thread
STOP REPLICA SQL_THREAD;

-- Start replication
START REPLICA;

-- Start from a specific position
START REPLICA UNTIL SOURCE_LOG_FILE='mysql-bin.000010', SOURCE_LOG_POS=4523891;
```

## Summary

`SHOW REPLICA STATUS` is the primary command for monitoring MySQL replication health. Always verify both `Replica_IO_Running` and `Replica_SQL_Running` are `Yes`, monitor `Seconds_Behind_Source` for lag, and check `Last_IO_Error`/`Last_SQL_Error` when threads stop. For production monitoring, use performance_schema tables and alerting tools to detect replication failures automatically.
