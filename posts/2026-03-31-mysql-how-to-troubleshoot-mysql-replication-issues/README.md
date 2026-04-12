# How to Troubleshoot MySQL Replication Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Troubleshooting, Database Administration, High Availability

Description: A step-by-step guide to diagnosing and fixing common MySQL replication problems including lag, errors, and broken replica threads.

---

## Checking Replication Status

Always start by checking the replica status on the replica server:

```sql
SHOW REPLICA STATUS\G
```

Key fields to examine:
- `Replica_IO_Running` - should be `Yes`
- `Replica_SQL_Running` - should be `Yes`
- `Seconds_Behind_Source` - lag in seconds (should be 0 or close to 0)
- `Last_IO_Error` - error from the IO thread
- `Last_SQL_Error` - error from the SQL thread

## Problem 1 - Replica IO Thread Stopped

If `Replica_IO_Running = No`, the replica cannot connect to the source.

```sql
SHOW REPLICA STATUS\G
-- Look at Last_IO_Error
```

### Common Causes and Fixes

**Wrong credentials:**

```sql
-- Check replication user on source
SELECT user, host FROM mysql.user WHERE user = 'repl_user';

-- Update credentials on replica
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'NewReplPass!1';
START REPLICA;
```

**Network connectivity:**

```bash
# From replica, test connection to source
mysql -h source_host -u repl_user -p --port=3306
telnet source_host 3306
```

**Source binary logging disabled:**

```sql
-- On source
SHOW VARIABLES LIKE 'log_bin';
-- Must be ON
```

## Problem 2 - Replica SQL Thread Stopped

If `Replica_SQL_Running = No`, there is an error applying events.

```sql
SHOW REPLICA STATUS\G
-- Check Last_SQL_Error and Last_SQL_Errno
```

### Common Error: Duplicate Key (Error 1062)

```text
Last_SQL_Error: Could not execute Write_rows event on table myapp.orders;
Duplicate entry '42' for key 'PRIMARY'
```

**Option 1 - Skip the failing event (use with caution):**

```sql
STOP REPLICA;
SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1;
START REPLICA;
```

**Option 2 - Delete the duplicate row:**

```sql
-- On the replica (with replica_read_only temporarily disabled)
SET GLOBAL read_only = OFF;
DELETE FROM myapp.orders WHERE id = 42;
SET GLOBAL read_only = ON;
START REPLICA;
```

### Common Error: Row Not Found (Error 1032)

```text
Last_SQL_Error: Could not execute Delete_rows event; Can't find record in 'orders'
```

The row being deleted does not exist on the replica:

```sql
STOP REPLICA;
-- Insert the missing row manually, or skip the event
SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1;
START REPLICA;
```

For GTID replication, use an empty transaction instead of skip counter:

```sql
STOP REPLICA;
-- Get the failing GTID from Last_SQL_Error
SET GTID_NEXT = 'source_uuid:transaction_id';
BEGIN; COMMIT;
SET GTID_NEXT = 'AUTOMATIC';
START REPLICA;
```

## Problem 3 - Replication Lag

High `Seconds_Behind_Source` indicates the replica is falling behind.

### Diagnose

```sql
-- Check for long-running SQL thread events
SHOW PROCESSLIST;

-- Check replication applier worker stats
SELECT * FROM performance_schema.replication_applier_status_by_worker;
```

### Enable Parallel Replication

```sql
-- On the replica
STOP REPLICA;
SET GLOBAL replica_parallel_workers = 8;
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
START REPLICA;
```

Persist in `my.cnf`:

```text
[mysqld]
replica_parallel_workers = 8
replica_parallel_type = LOGICAL_CLOCK
```

### Check Source Binary Log Position

```sql
-- On source
SHOW BINARY LOG STATUS;

-- On replica
SHOW REPLICA STATUS\G
-- Compare Relay_Source_Log_File and Exec_Source_Log_Pos
-- with the source's File and Position
```

## Problem 4 - GTID Replication Errors

Check the GTID sets:

```sql
-- On source
SELECT @@GLOBAL.gtid_executed;

-- On replica
SELECT @@GLOBAL.gtid_executed;

-- View the errant transactions (transactions on replica not on source)
SELECT GTID_SUBTRACT(@@GLOBAL.gtid_executed, (SELECT received_transaction_set
  FROM performance_schema.replication_connection_status)) AS errant_gtids;
```

## Rebuilding a Broken Replica

When errors are too many to fix individually, rebuild with `mysqldump` or the CLONE plugin:

```bash
# On source, create a consistent backup
mysqldump --all-databases --source-data=2 --single-transaction \
  -u root -p > /backup/source_backup.sql
```

```bash
# On replica, restore
mysql -u root -p < /backup/source_backup.sql
```

```sql
-- The --source-data=2 adds CHANGE REPLICATION SOURCE TO in comments
-- Extract and run it on the replica
CHANGE REPLICATION SOURCE TO SOURCE_HOST='source_host', SOURCE_USER='repl_user',
  SOURCE_PASSWORD='ReplPass!1', SOURCE_LOG_FILE='mysql-bin.000042', SOURCE_LOG_POS=1234;
START REPLICA;
```

## Summary

MySQL replication troubleshooting starts with `SHOW REPLICA STATUS\G` to identify whether the IO or SQL thread is stopped, and what the specific error is. For IO thread issues, verify network connectivity and credentials. For SQL thread errors like duplicate keys or missing rows, fix the data discrepancy or skip isolated events carefully. For chronic lag, enable parallel replication workers. For heavily broken replicas, a full rebuild with mysqldump or CLONE is often faster than fixing individual errors.
