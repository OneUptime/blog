# How to Modify Column Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Type Conversion, Schema Migration

Description: Learn how to change column data types in ClickHouse using ALTER TABLE MODIFY COLUMN, understand type compatibility rules, and handle materialized expressions safely.

---

Changing a column's data type in ClickHouse issues a background mutation that rewrites every data part containing that column. Unlike adding or renaming columns, type modifications are not purely metadata operations - they can be slow and resource-intensive on large tables. Understanding type compatibility and planning the migration carefully will help you avoid downtime and data loss.

## Basic MODIFY COLUMN Syntax

```sql
ALTER TABLE events
    MODIFY COLUMN status_code UInt16;
```

This rewrites all parts to store `status_code` as `UInt16`. The mutation runs in the background; queries continue to work during the rewrite.

## Type Compatibility Rules

ClickHouse allows type changes only when a safe conversion is possible. Common compatible conversions:

| From | To | Safe? |
|------|----|-------|
| `UInt8` | `UInt16`, `UInt32`, `UInt64` | Yes - widening |
| `Int32` | `Int64` | Yes - widening |
| `String` | `FixedString(N)` | Only if all values fit |
| `String` | `LowCardinality(String)` | Yes |
| `DateTime` | `DateTime64(3)` | Yes |
| `UInt64` | `UInt8` | No - may overflow |
| `Float64` | `Int64` | No - loss of precision |

For unsafe conversions, cast to an intermediate type or recreate the table.

## Changing Type and Default in One Statement

You can update the type and its default expression simultaneously:

```sql
ALTER TABLE events
    MODIFY COLUMN environment LowCardinality(String) DEFAULT 'production';
```

## Removing a MATERIALIZED Expression

To convert a materialized column back to a regular stored column, use `REMOVE MATERIALIZED`:

```sql
-- Column is currently MATERIALIZED toDate(created_at)
ALTER TABLE events
    MODIFY COLUMN event_date Date REMOVE MATERIALIZED;
```

After this, `event_date` must be supplied at insert time. Existing stored values are preserved.

Similarly, `REMOVE ALIAS` converts an alias column to a regular column:

```sql
ALTER TABLE events
    MODIFY COLUMN full_url String REMOVE ALIAS;
```

## Changing to Nullable and Back

Wrapping a type in `Nullable` allows NULL values at the cost of slightly more storage and slower queries:

```sql
-- Allow NULLs in response_time_ms
ALTER TABLE events
    MODIFY COLUMN response_time_ms Nullable(UInt32);

-- Revert to non-nullable
-- IMPORTANT: Ensure no NULL values exist before removing Nullable,
-- otherwise reading from the column may cause errors.
-- Replace NULLs first:
ALTER TABLE events
    UPDATE response_time_ms = 0 WHERE response_time_ms IS NULL;

-- Then remove Nullable once the mutation above completes:
ALTER TABLE events
    MODIFY COLUMN response_time_ms UInt32;
```

## Complete Migration Example

```sql
-- Original schema
CREATE TABLE metrics
(
    service     String,
    metric_name String,
    value       Float64,
    tags        String,
    recorded_at DateTime
)
ENGINE = MergeTree
ORDER BY (service, recorded_at);

-- Migration plan:
-- 1. Improve cardinality for frequently filtered columns
-- 2. Upgrade DateTime to DateTime64 for sub-second precision
-- 3. Promote tags to a more efficient type

-- Step 1: Widen value precision is already Float64; narrow service to LowCardinality
ALTER TABLE metrics
    MODIFY COLUMN service LowCardinality(String);

-- Step 2: Upgrade timestamp precision
ALTER TABLE metrics
    MODIFY COLUMN recorded_at DateTime64(3);

-- Step 3: Change metric_name to LowCardinality
ALTER TABLE metrics
    MODIFY COLUMN metric_name LowCardinality(String);

-- Monitor mutations
SELECT mutation_id, command, is_done, parts_to_do
FROM system.mutations
WHERE table = 'metrics'
ORDER BY create_time DESC;
```

## Monitoring the Mutation

Type modifications are implemented as mutations. Track progress with:

```sql
SELECT
    mutation_id,
    command,
    is_done,
    parts_to_do,
    parts_to_do_names,
    latest_fail_reason
FROM system.mutations
WHERE database = 'default'
  AND table = 'metrics'
  AND NOT is_done
ORDER BY create_time DESC;
```

If a mutation is stuck (e.g., due to disk pressure), kill it and investigate:

```sql
KILL MUTATION WHERE database = 'default' AND table = 'metrics' AND mutation_id = 'mutation_123.txt';
```

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE metrics ON CLUSTER '{cluster}'
    MODIFY COLUMN service LowCardinality(String);
```

The mutation runs independently on each node. Monitor `system.mutations` on each shard to confirm completion across the cluster.

## Summary

`ALTER TABLE MODIFY COLUMN` in ClickHouse triggers a background mutation to rewrite data parts. Only compatible type widening conversions are allowed without additional workarounds. Use `REMOVE MATERIALIZED` or `REMOVE ALIAS` to convert computed columns back to regular stored columns. Always monitor `system.mutations` to track progress and detect failures, and use `ON CLUSTER` in distributed deployments.
