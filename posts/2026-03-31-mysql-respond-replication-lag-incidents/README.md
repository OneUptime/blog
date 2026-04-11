# How to Respond to MySQL Replication Lag Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Incident Response, Lag, Troubleshooting

Description: Learn how to diagnose and resolve MySQL replication lag incidents by identifying the root cause, fixing stuck SQL threads, and tuning parallel replication.

---

## Detecting Replication Lag

Replication lag is measured as `Seconds_Behind_Source` in the replica status output:

```sql
SHOW REPLICA STATUS\G
```

Critical fields to check:
- `Seconds_Behind_Source` - lag in seconds (NULL means IO thread is disconnected)
- `Replica_IO_Running` - should be `Yes`
- `Replica_SQL_Running` - should be `Yes`
- `Last_SQL_Error` - error message if SQL thread stopped

## Step 1: Identify the Root Cause

### High-volume writes on primary

```sql
-- On primary: check current write throughput
SHOW GLOBAL STATUS LIKE 'Com_insert';
SHOW GLOBAL STATUS LIKE 'Com_update';
SHOW GLOBAL STATUS LIKE 'Com_delete';

-- Check binary log position advancing quickly
SHOW MASTER STATUS;
```

### Long-running query blocking the SQL thread

```sql
-- On replica: find blocking queries
SELECT * FROM information_schema.PROCESSLIST
WHERE COMMAND != 'Sleep'
ORDER BY TIME DESC;
```

### Missing indexes on replica

A query that uses an index on the primary may perform a full table scan on the replica if schema differs. Check:

```sql
-- On replica: check slow query log
SHOW VARIABLES LIKE 'slow_query_log%';
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 1;
```

## Step 2: Check for Replication Errors

If `Replica_SQL_Running = No`, there is an error:

```sql
SHOW REPLICA STATUS\G
-- Read: Last_SQL_Error
```

Common errors and fixes:

```sql
-- Duplicate key error: skip the event
SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1;
START REPLICA;

-- Table doesn't exist: re-sync the specific table
-- Use mysqldump to copy from primary:
```

```bash
mysqldump -h primary-host -u root -p orders orders_table | mysql -u root -p orders
```

## Step 3: Enable Parallel Replication

Single-threaded replication cannot keep up with multi-threaded primary writes. Enable parallel replication:

```sql
-- On replica, in my.cnf:
-- replica_parallel_workers = 8
-- replica_parallel_type = LOGICAL_CLOCK

-- Or set dynamically:
STOP REPLICA SQL_THREAD;
SET GLOBAL replica_parallel_workers = 8;
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
START REPLICA SQL_THREAD;
```

## Step 4: Monitor Lag Recovery

```bash
watch -n 5 'mysql -e "SHOW REPLICA STATUS\G" | grep Seconds_Behind_Source'
```

## Step 5: Reduce Replica Read Load

If heavy read queries are slowing the SQL thread:

```sql
-- Route heavy analytics to a separate replica
-- Reduce long-running queries on the lagging replica:
KILL QUERY <process_id>;
```

## Step 6: Verify Replica Caught Up

```sql
SHOW REPLICA STATUS\G
-- Seconds_Behind_Source should be 0 or very low

-- Confirm data is consistent
CHECKSUM TABLE orders;  -- compare on primary and replica
```

## Post-Incident Prevention

```sql
-- Monitor lag with a scheduled check
-- Alert when replication lag > 30 seconds
SELECT
  TIMESTAMPDIFF(SECOND,
    APPLYING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP,
    NOW()) AS replication_lag_seconds
FROM performance_schema.replication_applier_status_by_worker
WHERE APPLYING_TRANSACTION != '';
```

## Summary

Respond to MySQL replication lag by checking `SHOW REPLICA STATUS` for `Seconds_Behind_Source` and error messages. Fix stuck SQL threads by resolving the underlying error or skipping the problematic event. Enable parallel replication with `replica_parallel_workers` for sustained high-throughput environments. Monitor lag continuously and alert before it becomes an incident.
