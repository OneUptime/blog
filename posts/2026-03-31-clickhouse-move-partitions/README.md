# How to Move Partitions Between Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Partition, Data Management

Description: Learn how to move and replace partitions between ClickHouse tables using MOVE PARTITION TO TABLE and REPLACE PARTITION for fast, zero-copy data transfers.

---

ClickHouse can move entire partitions between tables using lightweight, metadata-level operations that avoid re-reading and re-writing raw data. This makes partition moves much faster than `INSERT INTO ... SELECT` for large datasets. Two main commands handle this: `MOVE PARTITION TO TABLE` (moves and removes the source partition) and `REPLACE PARTITION FROM` (replaces the destination partition with the source, leaving the source intact). Both require compatible table schemas.

## Schema Compatibility Requirements

For partition operations between tables, both tables must have:

- The same table structure (column names and types).
- The same `PARTITION BY` expression.
- The same `ORDER BY` (sorting key) and `PRIMARY KEY`.
- The same storage policy.
- The destination table must include all indices and projections that exist in the source table.

Both tables must use MergeTree family engines. For `MOVE PARTITION`, both tables must also be in the same engine family (both replicated or both non-replicated).

## MOVE PARTITION TO TABLE

`MOVE PARTITION TO TABLE` atomically detaches the partition from the source table and attaches it to the destination. The source partition is deleted.

```sql
ALTER TABLE source_table
    MOVE PARTITION '2024-01' TO TABLE destination_table;
```

After this command, `source_table` no longer contains data for partition `'2024-01'` and `destination_table` has it.

## REPLACE PARTITION FROM

`REPLACE PARTITION FROM` copies data from a partition in a source table into the destination table, replacing any existing data in that partition. The source is not modified.

```sql
ALTER TABLE destination_table
    REPLACE PARTITION '2024-01' FROM source_table;
```

This is useful for refreshing a partition from a staging table.

## Partition Expressions

The partition value must match the value produced by `PARTITION BY`. For a monthly partition (`toYYYYMM(created_at)` or `toStartOfMonth(created_at)`), use the numeric or string form that ClickHouse generates:

```sql
-- For PARTITION BY toYYYYMM(created_at)
ALTER TABLE raw_events MOVE PARTITION 202401 TO TABLE archive_events;

-- For PARTITION BY toDate(created_at)
ALTER TABLE raw_events MOVE PARTITION '2024-01-01' TO TABLE archive_events;

-- For PARTITION BY tuple() (no partition key - entire table is one partition)
ALTER TABLE staging_events MOVE PARTITION tuple() TO TABLE events;
```

Check existing partition IDs:

```sql
SELECT DISTINCT partition, partition_id
FROM system.parts
WHERE database = 'default'
  AND table = 'raw_events'
  AND active
ORDER BY partition;
```

## Complete Example: Monthly Archival Pipeline

```sql
-- Hot table for recent data
CREATE TABLE events
(
    event_id   UUID DEFAULT generateUUIDv4(),
    user_id    UInt64,
    event_type LowCardinality(String),
    created_at DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);

-- Cold archive table with same schema
CREATE TABLE events_archive
(
    event_id   UUID DEFAULT generateUUIDv4(),
    user_id    UInt64,
    event_type LowCardinality(String),
    created_at DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at)
SETTINGS storage_policy = 'cold_storage';

-- Move January 2024 partition to archive
ALTER TABLE events
    MOVE PARTITION 202401 TO TABLE events_archive;

-- Verify partition is gone from hot table
SELECT partition, sum(rows) AS rows
FROM system.parts
WHERE database = 'default'
  AND table = 'events'
  AND active
GROUP BY partition
ORDER BY partition;

-- Verify partition arrived in archive
SELECT partition, sum(rows) AS rows
FROM system.parts
WHERE database = 'default'
  AND table = 'events_archive'
  AND active
GROUP BY partition;
```

## Complete Example: Staging-to-Production Refresh

```sql
-- Staging table receives transformed data
CREATE TABLE events_staging
(
    event_id   UUID DEFAULT generateUUIDv4(),
    user_id    UInt64,
    event_type LowCardinality(String),
    created_at DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);

-- Load and transform data into staging
INSERT INTO events_staging
SELECT * FROM raw_events WHERE toYYYYMM(created_at) = 202402;

-- Atomically replace production partition with staging data
ALTER TABLE events
    REPLACE PARTITION 202402 FROM events_staging;
```

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE events ON CLUSTER '{cluster}'
    MOVE PARTITION 202401 TO TABLE events_archive;
```

Both tables must exist and have compatible schemas on all nodes before executing the command.

## Summary

`MOVE PARTITION TO TABLE` and `REPLACE PARTITION FROM` enable fast, atomic partition transfers between ClickHouse tables without re-reading and re-writing raw data. Both require identical table structures, partition keys, sorting keys, primary keys, and storage policies. Use `MOVE PARTITION` for archival pipelines where data should leave the source table, and `REPLACE PARTITION` for staging-to-production refresh patterns. Always verify partition IDs via `system.parts` before executing.
