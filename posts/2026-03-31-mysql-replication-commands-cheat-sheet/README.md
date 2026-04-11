# MySQL Replication Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Command, Cheat Sheet

Description: Quick reference for MySQL replication setup and management commands including CHANGE REPLICATION SOURCE, START/STOP REPLICA, and GTID replication commands.

---

## Check Replication Status

```sql
-- On replica (MySQL 8.0+ syntax)
SHOW REPLICA STATUS\G

-- Legacy syntax (still works in 8.0)
SHOW SLAVE STATUS\G

-- Key fields to check
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes
-- Seconds_Behind_Source: 0
-- Last_Error: (empty)
```

## Setting Up a Replica (Classic Binary Log)

```sql
-- On source: get binary log position (MySQL 8.2+)
SHOW BINARY LOG STATUS;

-- Legacy syntax (MySQL 8.0)
-- SHOW MASTER STATUS;
-- Note: File and Position values

-- On replica: configure and start
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST     = '10.0.0.1',
  SOURCE_PORT     = 3306,
  SOURCE_USER     = 'repl_user',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_LOG_FILE = 'mysql-bin.000042',
  SOURCE_LOG_POS  = 4;

START REPLICA;
```

## Setting Up GTID Replication

```sql
-- my.cnf settings on both source and replica
-- gtid_mode = ON
-- enforce_gtid_consistency = ON

-- On replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST     = '10.0.0.1',
  SOURCE_USER     = 'repl_user',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

## Start, Stop, and Reset

```sql
START REPLICA;
STOP REPLICA;

-- Stop only IO or SQL thread
STOP REPLICA IO_THREAD;
STOP REPLICA SQL_THREAD;
START REPLICA IO_THREAD;
START REPLICA SQL_THREAD;

-- Reset replica state (loses all relay logs)
RESET REPLICA ALL;
```

## Skipping a Failed Transaction (GTID)

```sql
-- Identify the failing GTID from SHOW REPLICA STATUS
STOP REPLICA SQL_THREAD;
SET GTID_NEXT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:12345';
BEGIN; COMMIT;  -- inject empty transaction
SET GTID_NEXT = 'AUTOMATIC';
START REPLICA SQL_THREAD;
```

## Skipping a Failed Transaction (Classic)

```sql
STOP REPLICA SQL_THREAD;
SET GLOBAL sql_replica_skip_counter = 1;
START REPLICA SQL_THREAD;
```

## Promoting a Replica to Source

```sql
-- On the replica to promote
STOP REPLICA;
RESET REPLICA ALL;

-- Update application connection strings to point to the new source
-- Then configure remaining replicas to use the new source
```

## Replication User Creation

```sql
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'strong_pass';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
```

## Delayed Replication

```sql
-- Apply changes 1 hour behind source
CHANGE REPLICATION SOURCE TO SOURCE_DELAY = 3600;
START REPLICA;

-- Check delay
SHOW REPLICA STATUS\G
-- SQL_Delay: 3600
```

## Filtering Replication

```sql
-- Replicate only specific databases (on replica, in my.cnf)
-- replicate_do_db   = mydb
-- replicate_ignore_db = sys

-- Or at runtime
CHANGE REPLICATION FILTER
  REPLICATE_DO_DB = (mydb),
  REPLICATE_IGNORE_TABLE = (mydb.audit_log);
```

## GTID Diagnostics

```sql
-- See executed GTIDs on this server
SELECT @@GLOBAL.gtid_executed;

-- See purged GTIDs
SELECT @@GLOBAL.gtid_purged;

-- Check GTID mode
SHOW VARIABLES LIKE 'gtid_mode';
```

## Summary

MySQL replication commands center on CHANGE REPLICATION SOURCE, START/STOP REPLICA, and SHOW REPLICA STATUS. GTID mode simplifies failover by eliminating the need to track binary log file and position. Use RESET REPLICA ALL when decommissioning a replica, delayed replication as a safeguard against accidental data loss, and replication filters to control which databases and tables get replicated.
