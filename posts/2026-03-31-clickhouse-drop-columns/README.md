# How to Drop Columns from a ClickHouse Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Schema Migration

Description: Learn how to drop columns from a ClickHouse table using ALTER TABLE DROP COLUMN and CLEAR COLUMN, with notes on data deletion and cluster usage.

---

Dropping a column from a ClickHouse MergeTree table removes the column from the schema and deletes the underlying column files from each data part. Because ClickHouse stores each column in separate files on disk, a `DROP COLUMN` typically completes almost instantly - it is a file delete, not a rewrite. Understanding this behavior is still important before running destructive DDL in production.

## Basic DROP COLUMN Syntax

```sql
ALTER TABLE events
    DROP COLUMN browser;
```

After this statement executes, the column is gone from the schema immediately and the corresponding column files are removed from each data part. Queries referencing `browser` will fail.

## Dropping Multiple Columns

Multiple columns can be dropped in a single statement:

```sql
ALTER TABLE events
    DROP COLUMN browser,
    DROP COLUMN os,
    DROP COLUMN device_type;
```

Batching drops into one statement is more efficient because ClickHouse applies all the changes to the table metadata in a single operation.

## CLEAR COLUMN - Remove Data Without Dropping

`CLEAR COLUMN` resets all values in a column to the column's default without removing the column itself. This is useful when you want to reclaim disk space but keep the schema intact. The `IN PARTITION` clause is required - you must specify which partition to clear:

```sql
-- Reset all values to the column default (empty string for String)
ALTER TABLE events
    CLEAR COLUMN browser IN PARTITION '2024-01';
```

To clear the column across every partition, iterate over the partitions returned from `system.parts`:

```sql
-- List partitions for the table
SELECT DISTINCT partition
FROM system.parts
WHERE table = 'events' AND active;
```

Then issue `CLEAR COLUMN ... IN PARTITION` for each one.

## Checking Mutation Progress

`CLEAR COLUMN` runs as a background mutation that rewrites affected parts. `DROP COLUMN` is usually near-instant because it only deletes column files, but it still produces an entry in `system.mutations` that you can inspect. Monitor progress in `system.mutations`:

```sql
SELECT
    table,
    mutation_id,
    command,
    is_done,
    parts_to_do,
    latest_fail_reason
FROM system.mutations
WHERE database = 'default'
  AND table = 'events'
ORDER BY create_time DESC
LIMIT 10;
```

A mutation is complete when `is_done = 1` and `parts_to_do = 0`.

## Complete Example

```sql
-- Create a table with columns we intend to remove later
CREATE TABLE user_events
(
    event_id    UUID DEFAULT generateUUIDv4(),
    user_id     UInt64,
    event_type  LowCardinality(String),
    legacy_flag UInt8,
    deprecated  String,
    created_at  DateTime
)
ENGINE = MergeTree
ORDER BY (user_id, created_at);

-- Insert some sample data
INSERT INTO user_events (user_id, event_type, legacy_flag, deprecated, created_at)
VALUES (1, 'click', 0, 'old_value', now());

-- Remove deprecated columns
ALTER TABLE user_events
    DROP COLUMN legacy_flag,
    DROP COLUMN deprecated;

-- Confirm new schema
DESCRIBE TABLE user_events;

-- Check mutation progress
SELECT mutation_id, command, is_done, parts_to_do
FROM system.mutations
WHERE table = 'user_events';
```

## ON CLUSTER for Distributed Setups

In a cluster, use `ON CLUSTER` so the DDL is applied on every shard and replica:

```sql
ALTER TABLE user_events ON CLUSTER '{cluster}'
    DROP COLUMN legacy_flag;
```

Without `ON CLUSTER`, the column is dropped only on the node that received the statement. Queries routed to other nodes will still return the old column, causing inconsistencies.

## Important Caveats

- You cannot drop a column that is part of the `ORDER BY`, `PARTITION BY`, or `PRIMARY KEY` expression.
- You cannot drop a column referenced by a materialized column or a materialized view without first removing those dependencies.
- `DROP COLUMN` on a ReplacingMergeTree version column or a CollapsingMergeTree sign column is also blocked.

Check for blocking dependencies before dropping:

```sql
-- Find materialized views that reference this table
SELECT name, engine
FROM system.tables
WHERE engine LIKE '%MaterializedView%'
  AND create_table_query LIKE '%user_events%';
```

## Summary

`ALTER TABLE DROP COLUMN` removes a column from the schema immediately but schedules the actual data removal as a background mutation. Use `CLEAR COLUMN` when you want to reclaim space without altering the schema. Always use `ON CLUSTER` in distributed environments and verify that the column is not referenced by ordering keys, materialized columns, or dependent views before dropping.
