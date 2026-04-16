# How to Clear Column Data in ClickHouse Without Dropping the Column

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DDL, ALTER TABLE, Data Management, Column Operations

Description: Learn how to clear or reset column data in ClickHouse using ALTER TABLE CLEAR COLUMN and UPDATE mutations without removing the column from the schema.

---

## Why Clear Column Data

Sometimes you need to reset column data without dropping the column entirely:
- A column was populated with incorrect values and needs to be reprocessed
- Sensitive data needs to be removed from a column while keeping the schema
- A calculated column needs to be recalculated after a bug fix
- GDPR/compliance requirements to clear user data from specific columns

ClickHouse provides two main mechanisms: `ALTER TABLE ... CLEAR COLUMN` and mutations via `UPDATE`.

## Method 1: CLEAR COLUMN IN PARTITION

The most efficient way to clear a column's data for specific partitions:

```sql
-- Clear a column in a specific partition (resets to type default)
ALTER TABLE user_events
    CLEAR COLUMN email IN PARTITION '202401';

-- Clear in multiple partitions
ALTER TABLE user_events
    CLEAR COLUMN email IN PARTITION '202401',
    CLEAR COLUMN email IN PARTITION '202402';

-- For tables without a partition key (PARTITION BY tuple()),
-- the single implicit partition has ID 'all':
ALTER TABLE user_events
    CLEAR COLUMN email IN PARTITION ID 'all';

-- To clear a column across ALL partitions of a partitioned table,
-- iterate through the partitions or use an UPDATE mutation:
ALTER TABLE user_events
    UPDATE email = '' WHERE 1 = 1;
```

After `CLEAR COLUMN`, the column still exists but contains default values (`0`, `''`, `1970-01-01`, etc.) for all rows in that partition.

## Understanding Partitions

```sql
-- Find partitions for your table
SELECT DISTINCT partition
FROM system.parts
WHERE database = currentDatabase()
  AND table = 'user_events'
  AND active = 1
ORDER BY partition;

-- Partition naming convention
-- toYYYYMM(date) -> '202401', '202402'
-- toYYYYMMDD(date) -> '20240101'
-- tuple() -> 'all' (no partition key)
```

## Method 2: UPDATE Mutation (Set to Default Value)

If you need more control over which rows to clear:

```sql
-- Clear specific rows by setting to default/empty value
ALTER TABLE user_events
    UPDATE email = '' WHERE user_id IN (101, 102, 103);

-- Clear all rows
ALTER TABLE user_events
    UPDATE sensitive_field = '' WHERE 1 = 1;

-- Clear with time-based filter
ALTER TABLE user_events
    UPDATE phone_number = ''
    WHERE event_date < toDate('2024-01-01');
```

## Monitoring Mutation Progress

Both `CLEAR COLUMN` and `UPDATE` create background mutations. Track them:

```sql
-- Check active mutations
SELECT
    command,
    create_time,
    is_done,
    latest_failed_part,
    parts_to_do,
    parts_to_do_names
FROM system.mutations
WHERE table = 'user_events'
  AND is_done = 0;

-- Check completed mutations
SELECT command, create_time, is_done
FROM system.mutations
WHERE table = 'user_events'
ORDER BY create_time DESC
LIMIT 10;
```

## Clearing a Nullable Column

For `Nullable` columns, clearing to NULL (rather than empty default):

```sql
CREATE TABLE user_data (
    user_id UInt64,
    email Nullable(String),
    bio Nullable(String),
    phone Nullable(String)
) ENGINE = MergeTree()
ORDER BY user_id;

-- Clear to NULL
ALTER TABLE user_data
    UPDATE email = NULL, phone = NULL
    WHERE user_id IN (
        SELECT user_id FROM deleted_users
    );

-- CLEAR COLUMN also resets Nullable columns to NULL
ALTER TABLE user_data
    CLEAR COLUMN bio IN PARTITION 'all';
```

## Clearing Columns in Replicated Tables

```sql
-- In a replicated cluster, use ON CLUSTER
ALTER TABLE user_events ON CLUSTER my_cluster
    CLEAR COLUMN email IN PARTITION '202401';

-- Or use ALTER TABLE ... ON CLUSTER without CLEAR:
ALTER TABLE user_events ON CLUSTER my_cluster
    UPDATE sensitive_pii = '' WHERE 1 = 1;
```

## Practical Example: GDPR Data Erasure

```sql
-- Table with PII
CREATE TABLE user_activity (
    activity_id UInt64,
    user_id UInt64,
    event_type LowCardinality(String),
    email Nullable(String),
    ip_address Nullable(String),
    user_name Nullable(String),
    activity_time DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(activity_time)
ORDER BY (activity_time, user_id);

-- GDPR erasure: clear PII for a specific user
ALTER TABLE user_activity
    UPDATE
        email = NULL,
        ip_address = NULL,
        user_name = NULL
    WHERE user_id = 42;

-- Verify the erasure
SELECT user_id, email, ip_address, user_name
FROM user_activity
WHERE user_id = 42
LIMIT 5;
-- All PII columns should be NULL
```

## Difference Between CLEAR COLUMN and DROP COLUMN

```sql
-- CLEAR COLUMN: removes data but keeps schema
ALTER TABLE my_table CLEAR COLUMN legacy_field IN PARTITION 'all';
-- Column still exists with default values

-- DROP COLUMN: removes the column entirely
ALTER TABLE my_table DROP COLUMN legacy_field;
-- Column and all data gone from schema

-- To check the column still exists after CLEAR
DESCRIBE TABLE my_table;
```

## Performance Considerations

```sql
-- CLEAR COLUMN on partition is very fast (metadata only change)
-- UPDATE mutation rewrites all affected parts - can be slow

-- Check how many parts will be affected before running UPDATE
SELECT count() AS parts_affected
FROM system.parts
WHERE database = currentDatabase()
  AND table = 'user_activity'
  AND active = 1;

-- Mutations settings
SET mutations_sync = 1;  -- Wait for mutation to complete (for testing)
-- Default = 0 (async)
```

## Summary

ClickHouse provides two ways to clear column data without dropping the column: `ALTER TABLE ... CLEAR COLUMN IN PARTITION` which efficiently resets an entire partition's column to type defaults, and `UPDATE` mutations which allow targeted clearing based on WHERE conditions. Use `CLEAR COLUMN` for partition-wide resets and `UPDATE` for selective erasure such as GDPR compliance. Both operations run as background mutations and can be monitored via `system.mutations`.
