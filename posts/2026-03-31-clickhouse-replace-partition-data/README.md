# How to Replace Partition Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Partition, Replace

Description: Learn how to atomically replace partition data in ClickHouse using ALTER TABLE REPLACE PARTITION FROM for zero-downtime data reloading patterns.

---

Replacing an entire partition atomically is one of the most powerful data management patterns in ClickHouse. `ALTER TABLE ... REPLACE PARTITION FROM` lets you swap a partition from a staging table into the production table in a single atomic operation - no data loss, no window of partial visibility, and no need to delete and re-insert rows. This is the standard approach for full partition reloads and data correction workflows.

## Syntax

```sql
ALTER TABLE destination_table
    REPLACE PARTITION partition_expr
    FROM source_table;
```

`partition_expr` identifies which partition in the destination to replace. The source and destination tables must have identical schemas.

## How It Works

The operation:
1. Reads the partition identified by `partition_expr` from `source_table`.
2. Atomically detaches the existing partition from `destination_table`.
3. Attaches the source partition to `destination_table` in its place.

The swap is atomic from the perspective of concurrent readers - at no point is the partition partially replaced. The old partition data is discarded after the swap.

## Basic Example

Load corrected data into a staging table and swap it into production:

```sql
-- Step 1: prepare staging table with the same schema
CREATE TABLE events_staging AS events;

-- Step 2: load corrected data into staging
INSERT INTO events_staging
SELECT * FROM corrected_data_source
WHERE toYYYYMM(event_time) = 202403;

-- Step 3: atomically replace the partition in production
ALTER TABLE events
    REPLACE PARTITION 202403
    FROM events_staging;

-- Step 4: clean up staging
TRUNCATE TABLE events_staging;
```

## Schema Compatibility Requirements

The source and destination tables must have:
- The same column names, types, and order.
- The same partition key expression.
- Compatible MergeTree engine family (both must be MergeTree variants).

The same `ORDER BY` key and primary key.

```sql
-- Verify schemas match before replacing
SELECT name, type
FROM system.columns
WHERE table = 'events' AND database = 'default'
ORDER BY position;

SELECT name, type
FROM system.columns
WHERE table = 'events_staging' AND database = 'default'
ORDER BY position;
```

## Full Partition Reload Pattern

This pattern is common for correcting historical data or re-running ETL for a time window:

```sql
-- Create staging table
CREATE TABLE events_staging AS events;

-- Load fresh data
INSERT INTO events_staging
SELECT
    event_time,
    event_type,
    user_id,
    duration_ms
FROM raw_source
WHERE event_time >= '2024-03-01' AND event_time < '2024-04-01';

-- Swap partition atomically
ALTER TABLE events
    REPLACE PARTITION 202403
    FROM events_staging;

-- Confirm row counts
SELECT count() FROM events WHERE toYYYYMM(event_time) = 202403;

-- Cleanup
DROP TABLE events_staging;
```

## Replacing a Partition from Another Database

The source table can reside in a different database as long as it is on the same server:

```sql
ALTER TABLE default.events
    REPLACE PARTITION 202403
    FROM staging_db.events_staging;
```

## Checking Partition Contents Before and After

```sql
-- Before: check what exists in production
SELECT
    partition,
    rows,
    bytes_on_disk
FROM system.parts
WHERE table = 'events' AND active = 1 AND partition = '202403';

-- After replacement: confirm the new data is in place
SELECT count(), min(event_time), max(event_time)
FROM events
WHERE toYYYYMM(event_time) = 202403;
```

## Difference from DROP PARTITION + INSERT

`REPLACE PARTITION FROM` is superior to a drop-then-insert approach because:

- The replacement is atomic - queries always see either the old or the new partition, never an empty state.
- It avoids the window during which the partition is missing entirely.
- It is faster than INSERT for large partitions because it operates at the file system level rather than writing individual rows.

```sql
-- Avoid this pattern - creates a visibility gap
ALTER TABLE events DROP PARTITION 202403;
INSERT INTO events SELECT * FROM events_staging WHERE toYYYYMM(event_time) = 202403;

-- Prefer this - atomic swap
ALTER TABLE events REPLACE PARTITION 202403 FROM events_staging;
```

## Summary

`ALTER TABLE REPLACE PARTITION FROM` atomically swaps a partition from a source table into a destination table, making it the safest and fastest way to reload or correct partition-level data in ClickHouse. Ensure the source and destination schemas match, use a staging table as the source, and prefer this over drop-and-reinsert patterns to eliminate visibility gaps during data corrections.
