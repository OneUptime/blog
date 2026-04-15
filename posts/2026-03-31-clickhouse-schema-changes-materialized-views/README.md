# How to Handle Schema Changes in Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Schema Change, Migration, ALTER TABLE

Description: Learn how to safely apply schema changes to ClickHouse tables that have materialized views, including adding columns, changing types, and rebuilding views.

---

## Why Schema Changes are Tricky

Materialized views in ClickHouse are tightly coupled to their source and target table schemas. Adding a new column, changing a type, or renaming a column requires careful coordination to avoid breaking the view or losing data.

## Adding a Column to the Source Table

Adding columns to the source table is safe and non-breaking:

```sql
ALTER TABLE raw_events ADD COLUMN new_field String DEFAULT '';
```

The materialized view will not automatically pick up the new column. You must update the view definition separately.

## Adding a Column to the Target Table

```sql
ALTER TABLE events_hourly ADD COLUMN new_agg Float64 DEFAULT 0;
```

After adding the column, drop and recreate the view to include the new field:

```sql
DROP VIEW mv_events_hourly;

CREATE MATERIALIZED VIEW mv_events_hourly
TO events_hourly
AS SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt,
    avg(new_field) AS new_agg
FROM raw_events
GROUP BY hour, event_type;
```

## Safe View Replacement Workflow

1. Add the new column to the target table with a DEFAULT value
2. Drop the old view
3. Recreate the view with the updated SELECT
4. Backfill the new column for historical rows if needed

```sql
-- Step 1: Add column
ALTER TABLE events_hourly ADD COLUMN p99_latency Float64 DEFAULT 0;

-- Step 2: Drop old view
DROP VIEW mv_events_hourly;

-- Step 3: Recreate with new column
CREATE MATERIALIZED VIEW mv_events_hourly
TO events_hourly
AS SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt,
    quantile(0.99)(latency_ms) AS p99_latency
FROM raw_events
GROUP BY hour, event_type;

-- Step 4: Backfill historical data
INSERT INTO events_hourly
SELECT
    toStartOfHour(event_time), event_type,
    count(), quantile(0.99)(latency_ms)
FROM raw_events
WHERE event_time < now() - INTERVAL 1 HOUR
GROUP BY 1, 2;
```

## Changing Column Types

Changing a column type on the source table:

```sql
ALTER TABLE raw_events MODIFY COLUMN user_id UInt64;
```

After changing the type, verify the view SELECT still produces compatible output types.

## Renaming Columns

Column renames require dropping and recreating views that reference the old name:

```sql
-- First drop the view so renames don't break incoming inserts
DROP VIEW mv_events_hourly;

-- Rename in both source and target
ALTER TABLE raw_events RENAME COLUMN old_name TO new_name;
ALTER TABLE events_hourly RENAME COLUMN old_agg TO new_agg;

-- Recreate the view referencing new names
CREATE MATERIALIZED VIEW mv_events_hourly TO events_hourly AS SELECT ...;
```

## Using Version Column for In-Place Updates

If you use `ReplacingMergeTree` as the target, you can update old rows after schema changes:

```sql
CREATE TABLE events_hourly (
    hour DateTime,
    event_type LowCardinality(String),
    cnt UInt64,
    version DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(version)
ORDER BY (hour, event_type);
```

Re-insert recomputed rows and `OPTIMIZE TABLE FINAL` to apply replacements.

## Summary

Handling schema changes in ClickHouse materialized views requires a deliberate sequence: add columns with defaults, drop and recreate views, then backfill historical data. Never modify the view SELECT in place - always drop and recreate to ensure the view definition is consistent with the target schema.
