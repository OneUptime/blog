# What Is a Projection and How It Works in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, MergeTree, Query Optimization, Secondary Sort

Description: Learn what projections are in ClickHouse, how they store pre-sorted and pre-aggregated data inside parts, and when to use them instead of materialized views.

---

Projections are embedded alternate data layouts within a MergeTree table. Unlike materialized views, projections live inside the same table parts and are maintained automatically - you do not manage a separate table or view.

## What Is a Projection?

A projection stores a secondary copy of the data (or aggregated data) sorted by a different key than the primary sort key. When ClickHouse executes a query, it automatically chooses the projection if it would be more efficient than scanning the main table.

```sql
CREATE TABLE events (
  id       UInt64,
  ts       DateTime,
  region   LowCardinality(String),
  revenue  Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, id);  -- primary sort: time first

-- Add a projection sorted by region for region-based queries
ALTER TABLE events
ADD PROJECTION proj_by_region
(SELECT * ORDER BY region, ts);
```

## Normal (Sort) Projections

A normal projection re-sorts all columns by a different key. Queries filtered by `region` will use this projection automatically.

```sql
-- This query benefits from proj_by_region
SELECT sum(revenue) FROM events WHERE region = 'US';
```

Without the projection, ClickHouse scans all granules to find `region = 'US'`. With the projection, it uses a layout where rows are sorted by region and reads only the relevant granules.

## Aggregate Projections

An aggregate projection stores pre-aggregated data, similar to a materialized view but embedded in the table.

```sql
ALTER TABLE events
ADD PROJECTION proj_hourly_revenue
(
  SELECT toStartOfHour(ts) AS hour, region, sum(revenue) AS total_revenue
  GROUP BY hour, region
);
```

Queries that match this aggregation pattern use the projection automatically:

```sql
-- ClickHouse uses proj_hourly_revenue automatically
SELECT toStartOfHour(ts), region, sum(revenue)
FROM events
GROUP BY toStartOfHour(ts), region;
```

## Materializing a Projection

After adding a projection, you must materialize it to build the projection data for existing parts:

```sql
ALTER TABLE events MATERIALIZE PROJECTION proj_by_region;
```

New data is automatically included in projections as it is inserted.

## Projections vs. Materialized Views

| Feature | Projection | Materialized View |
|---|---|---|
| Storage location | Inside the table parts | Separate target table |
| Schema sync | Automatic | Manual |
| TTL/partitioning | Inherited from main table | Configurable separately |
| Query rewriting | Automatic | Not applicable |
| Backfill | MATERIALIZE command | Manual INSERT |

Use projections when you want automatic query rewriting without managing a separate table. Use materialized views when you need different partitioning, TTL, or the ability to drop historical data independently.

## Checking Projection Usage

```sql
-- See projections defined on a table
SELECT name, query
FROM system.projections
WHERE table = 'events';
```

## Summary

Projections provide embedded alternate sort orders and pre-aggregations inside MergeTree parts. ClickHouse automatically selects the best projection for each query. They simplify multi-access-pattern schemas by avoiding separate target tables, at the cost of increased storage for each projection copy of the data.
