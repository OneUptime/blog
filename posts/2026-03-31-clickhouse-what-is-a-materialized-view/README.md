# What Is a Materialized View and How It Works in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Incremental Aggregation, AggregatingMergeTree, Real-Time Analytics

Description: Learn what materialized views are in ClickHouse, how they update incrementally on insert, and how to use them for real-time pre-aggregation.

---

A materialized view in ClickHouse is a trigger that runs a SELECT query against newly inserted data and writes the results to a separate target table. Unlike views in traditional databases, ClickHouse materialized views do not recompute results on read - they maintain a pre-aggregated result set that is updated incrementally as data arrives.

## How Materialized Views Work

When you insert data into the source table, ClickHouse:
1. Inserts the data into the source table as normal
2. Passes the same batch to all attached materialized views
3. Each view runs its SELECT query against only the new batch
4. The results are inserted into the view's target table

```sql
-- Source table
CREATE TABLE raw_events (
  user_id  UInt32,
  region   LowCardinality(String),
  revenue  Float64,
  ts       DateTime
) ENGINE = MergeTree() ORDER BY ts;

-- Target table using AggregatingMergeTree
CREATE TABLE hourly_revenue (
  hour      DateTime,
  region    LowCardinality(String),
  revenue   AggregateFunction(sum, Float64)
) ENGINE = AggregatingMergeTree()
ORDER BY (hour, region);

-- Materialized view connecting them
CREATE MATERIALIZED VIEW hourly_revenue_mv TO hourly_revenue AS
SELECT
  toStartOfHour(ts) AS hour,
  region,
  sumState(revenue) AS revenue
FROM raw_events
GROUP BY hour, region;
```

## Querying the Materialized View

The target table stores aggregate states. Use merge functions to produce final values:

```sql
SELECT hour, region, sumMerge(revenue) AS total_revenue
FROM hourly_revenue
GROUP BY hour, region
ORDER BY hour DESC;
```

This query is fast because it reads from the pre-aggregated target table, not the raw billions-of-rows source table.

## The TO Clause vs. Implicit Inner Table

Without the `TO hourly_revenue` clause, ClickHouse creates a hidden inner table (named `.inner_id.<UUID>` in current versions). Prefer the explicit `TO` clause so you can:
- Drop the view without losing data
- Add custom TTL or partitioning to the target table
- Query the target table directly

## Backfilling Historical Data

Materialized views only process new inserts. After creating a view, backfill history manually:

```sql
INSERT INTO hourly_revenue
SELECT toStartOfHour(ts) AS hour, region, sumState(revenue) AS revenue
FROM raw_events
GROUP BY hour, region;
```

## Limitations

- Materialized views see only the INSERT batch, not the full table state. Joins and subqueries on the source table in the view definition can produce unexpected results for incremental inserts.
- Deletes and updates to the source table do not propagate to the view.
- There is no atomic guarantee between source insert and view update.

## Summary

ClickHouse materialized views are insert triggers that pre-aggregate data into a target table incrementally. They eliminate expensive real-time aggregations by maintaining running aggregate states using `AggregatingMergeTree` and aggregate state functions. They are the standard approach for building real-time dashboards on top of high-volume event streams.
