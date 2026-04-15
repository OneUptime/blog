# How to Optimize ClickHouse Queries with Projection Hints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Query Optimization, MergeTree, Performance

Description: Learn how ClickHouse projections work as pre-computed query views within a table, and how to use them to accelerate common aggregation and filter patterns.

---

ClickHouse projections are pre-computed data layouts stored alongside the main table data. Unlike materialized views, projections are part of the table itself, automatically maintained on INSERT, and transparently used by the query optimizer.

## What is a Projection

A projection stores data sorted by a different key or with pre-aggregated values. When a query matches the projection's pattern, ClickHouse reads the projection instead of the main table.

## Adding an Aggregate Projection

```sql
ALTER TABLE events
ADD PROJECTION proj_user_daily (
    SELECT
        user_id,
        toDate(ts) AS date,
        count() AS event_count,
        sum(value) AS total_value
    GROUP BY user_id, date
);

-- Materialize the projection for existing data
ALTER TABLE events MATERIALIZE PROJECTION proj_user_daily;
```

## Adding a Sort Order Projection

Pre-sort data by a different key for queries that filter by non-primary columns:

```sql
ALTER TABLE events
ADD PROJECTION proj_by_event_type (
    SELECT * ORDER BY event_type, ts
);

ALTER TABLE events MATERIALIZE PROJECTION proj_by_event_type;
```

## Query That Uses the Projection

```sql
-- ClickHouse transparently uses proj_user_daily instead of scanning all rows
SELECT user_id, count() AS event_count
FROM events
WHERE toDate(ts) >= today() - 30
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 100;
```

## Verifying Projection Usage

```sql
EXPLAIN indexes = 1
SELECT user_id, count()
FROM events
WHERE toDate(ts) >= today() - 7
GROUP BY user_id;
```

Look for the projection name in the output.

## Checking Projection Materialization Status

```sql
SELECT
    table, name, type, sorting_key, query
FROM system.projections
WHERE table = 'events';
```

## Dropping a Projection

```sql
ALTER TABLE events DROP PROJECTION proj_user_daily;
```

## Projection vs Materialized View

| Feature | Projection | Materialized View |
|---|---|---|
| Storage | Same table | Separate table |
| Maintenance | Automatic | Automatic |
| Query transparency | Auto-selected | Must query directly |
| Replication | With table | Separately |

## When to Use Projections

- Frequent aggregations on the same columns
- Queries filtering by non-primary-key columns
- Dashboard queries with known patterns

## Summary

ClickHouse projections transparently accelerate matching queries by pre-computing aggregations or pre-sorting data by alternative keys. They are easier to manage than materialized views for read optimization and require no query changes once created.
