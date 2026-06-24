# How to Use Projections as Secondary Indexes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Secondary Index, MergeTree, Query Optimization

Description: Learn how to use ClickHouse projections as secondary indexes to accelerate queries that filter on non-primary-key columns without data duplication overhead.

---

## What are Projections

Projections in ClickHouse store an alternative sorted and aggregated view of your data within the same table parts. They act as automatic secondary indexes - when you query a column not in your primary key, ClickHouse can transparently use a projection that stores data sorted by that column.

## When to Use Projections as Secondary Indexes

- You have a table sorted by `(user_id, ts)` but also frequently query by `event_type`
- You want ClickHouse to automatically pick the best data order per query
- You need pre-aggregated rollups to speed up dashboards

## Create a Projection for Alternative Sort

```sql
CREATE TABLE events (
    user_id UInt32,
    ts DateTime,
    event_type LowCardinality(String),
    country LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
ORDER BY (user_id, ts);

-- Add projection sorted by event_type
ALTER TABLE events
ADD PROJECTION proj_event_type (
    SELECT * ORDER BY (event_type, ts)
);

-- Materialize for existing data
ALTER TABLE events MATERIALIZE PROJECTION proj_event_type;
```

## Query Using the Projection

```sql
-- This can now use proj_event_type instead of scanning all granules
SELECT sum(value)
FROM events
WHERE event_type = 'click'
  AND ts >= '2026-01-01';
```

ClickHouse automatically picks the projection if it reduces data scanned.

## Aggregating Projection

Create a projection that pre-aggregates data:

```sql
ALTER TABLE events
ADD PROJECTION proj_daily_agg (
    SELECT
        toDate(ts) AS day,
        event_type,
        country,
        sum(value) AS total,
        count() AS cnt
    GROUP BY day, event_type, country
);

ALTER TABLE events MATERIALIZE PROJECTION proj_daily_agg;
```

Now this query uses the pre-aggregated projection:

```sql
SELECT event_type, sum(value)
FROM events
WHERE toDate(ts) >= '2026-01-01'
GROUP BY event_type;
```

## Verify Projection Usage

```sql
EXPLAIN indexes = 1
SELECT sum(value) FROM events WHERE event_type = 'click';
```

Look for `Projection: proj_event_type` in the output.

## Check Projection Storage

```sql
SELECT
    projection_name,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.projection_parts
WHERE table = 'events' AND active = 1
GROUP BY projection_name;
```

## Drop a Projection

```sql
ALTER TABLE events DROP PROJECTION proj_event_type;
```

## List All Projections

```sql
SELECT
    database,
    table,
    name,
    query
FROM system.projections
WHERE database = 'default';
```

## Trade-offs

```text
Benefits:
- Automatic query routing to best data order
- Pre-aggregation eliminates runtime GROUP BY
- No application code changes needed

Costs:
- Extra storage (roughly 1x per projection)
- Slower INSERT due to maintaining projection data
- MATERIALIZE can be slow on large existing tables
```

## Summary

Projections in ClickHouse serve as secondary indexes by storing alternative sort orders and pre-aggregations within the same table. They transparently accelerate queries on non-primary-key columns. Use row projections for alternative filter columns and aggregate projections for dashboard rollups.
