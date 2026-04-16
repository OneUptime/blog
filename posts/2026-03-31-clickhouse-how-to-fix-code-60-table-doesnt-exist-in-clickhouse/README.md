# How to Fix 'Code: 60 Table doesn't exist' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Debugging, Database Errors, Troubleshooting

Description: Learn how to diagnose and fix the ClickHouse 'Code: 60 Table doesn't exist' error, including common causes and step-by-step solutions.

---

## Understanding the Error

The `Code: 60` error in ClickHouse indicates that the server cannot find the table you are trying to query or modify. The full error message typically looks like:

```text
DB::Exception: Table <database>.<table> doesn't exist. (UNKNOWN_TABLE)
```

This error can occur in several scenarios: querying the wrong database, using stale connections, or working with replicated tables that have fallen out of sync.

## Common Causes

### Wrong Database Context

The most frequent cause is querying a table in the wrong database. ClickHouse uses a `default` database unless specified otherwise.

```sql
-- This fails if 'events' exists in 'analytics', not 'default'
SELECT * FROM events LIMIT 10;

-- This works
SELECT * FROM analytics.events LIMIT 10;
```

### Table Was Dropped or Renamed

Check whether the table actually exists:

```sql
-- List all tables in the target database
SHOW TABLES FROM analytics;

-- Check if a specific table exists
SELECT name, engine, create_table_query
FROM system.tables
WHERE database = 'analytics' AND name = 'events';
```

### Replicated Table Not Attached

On replicated clusters, a table may exist in ZooKeeper but not be attached on a specific node:

```sql
-- Check table status on all replicas
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly
FROM system.replicas
WHERE table = 'events';
```

## Step-by-Step Diagnosis

### Step 1 - Verify Database and Table Names

```sql
-- Show all databases
SHOW DATABASES;

-- Check exact spelling and case
SELECT database, name, engine
FROM system.tables
WHERE name ILIKE '%event%';
```

### Step 2 - Check for Detached Tables

ClickHouse can detach tables without dropping them. Detached tables remain on disk but are unavailable for queries:

```sql
-- List detached tables
SELECT database, table, metadata_path, is_permanently
FROM system.detached_tables
WHERE table = 'events';

-- Re-attach the table if it was detached
ATTACH TABLE analytics.events;
```

### Step 3 - Inspect Distributed Tables

For distributed setups, the underlying local table might be missing:

```sql
-- Check if the distributed table points to a valid local table
SELECT name, engine, engine_full
FROM system.tables
WHERE name = 'events_distributed';

-- Verify the local shard table exists
SELECT name FROM system.tables
WHERE database = 'analytics' AND name = 'events_local';
```

### Step 4 - Restore from ZooKeeper Metadata

If a replicated table was accidentally dropped on one node but ZooKeeper still holds the metadata:

```bash
# Connect to the affected node and re-create the table
clickhouse-client --query "
CREATE TABLE analytics.events AS analytics_replica.events
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY (event_time, user_id);
"
```

## Prevention Strategies

### Use Fully Qualified Table Names

Always reference tables with their database prefix in production scripts:

```sql
-- Preferred pattern
SELECT count() FROM analytics.events WHERE event_date = today();
```

### Monitor Table Existence in Health Checks

```bash
#!/bin/bash
TABLE_EXISTS=$(clickhouse-client --query "
  SELECT count() FROM system.tables
  WHERE database = 'analytics' AND name = 'events'
")

if [ "$TABLE_EXISTS" -eq "0" ]; then
  echo "ALERT: Table analytics.events is missing!"
  exit 1
fi
echo "Table check passed."
```

### Track DDL Changes with Query Log

```sql
-- Audit recent DROP and RENAME operations
SELECT
    event_time,
    user,
    query_kind,
    query
FROM system.query_log
WHERE query_kind IN ('Drop', 'Rename')
  AND event_time > now() - INTERVAL 7 DAY
ORDER BY event_time DESC;
```

## Summary

The `Code: 60 Table doesn't exist` error in ClickHouse is almost always caused by a missing database prefix, a detached or dropped table, or a replication gap on distributed nodes. Use `system.tables`, `system.replicas`, and `system.detached_tables` to diagnose the root cause, and re-attach or recreate the table as needed. Always use fully qualified table names in production code to avoid silent routing to the wrong database.
