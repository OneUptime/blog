# How to Use Normal (Reorder) Projections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, MergeTree, Query Optimization, Index

Description: Learn how to use normal (reorder) projections in ClickHouse to accelerate range scans on columns outside the primary key order.

---

## What Are Normal Projections?

Normal projections - also called reorder projections - store a copy of table data sorted by a different column order. When a query filters on a column that is not the primary sort key, ClickHouse can use a normal projection to perform a targeted range scan instead of a full table scan.

## The Problem They Solve

If your table is sorted by `timestamp` but you frequently query by `user_id`:

```sql
-- Without projection: scans all granules to find user_id = '42'
SELECT * FROM events WHERE user_id = '42' AND timestamp > now() - INTERVAL 7 DAY;
```

ClickHouse reads every granule because `user_id` is not the primary key - it has no index to skip granules.

## Creating a Normal Projection

```sql
ALTER TABLE events
    ADD PROJECTION by_user_id (
        SELECT * ORDER BY user_id, timestamp
    );

ALTER TABLE events MATERIALIZE PROJECTION by_user_id;
```

Now queries filtering on `user_id` will scan only the relevant granules in the projection's sort order.

## Selecting Specific Columns

You don't need to include all columns. This reduces projection storage:

```sql
ALTER TABLE http_logs
    ADD PROJECTION by_status_slim (
        SELECT timestamp, status_code, url, response_time_ms
        ORDER BY status_code, timestamp
    );
ALTER TABLE http_logs MATERIALIZE PROJECTION by_status_slim;
```

Queries that only reference these columns and filter by `status_code` will use this projection.

## Compound Sort Keys in Projections

For queries that filter on two columns:

```sql
ALTER TABLE orders
    ADD PROJECTION by_region_customer (
        SELECT * ORDER BY region, customer_id, created_at
    );
ALTER TABLE orders MATERIALIZE PROJECTION by_region_customer;
```

Queries like `WHERE region = 'us-east-1' AND customer_id = 'c-100'` will use this projection for efficient range scanning.

## Verifying Projection Selection

```sql
EXPLAIN indexes = 1
SELECT *
FROM events
WHERE user_id = '42'
  AND timestamp > now() - INTERVAL 7 DAY;
```

Look for `Projection: by_user_id` and reduced `Marks` count compared to the base table scan.

## Normal vs Aggregate Projections

| Projection Type | Use When |
|---|---|
| Normal (reorder) | Queries SELECT raw rows, filter on non-PK columns |
| Aggregate | Queries always GROUP BY and aggregate |

## Limitations

- Data is stored twice (base + projection), increasing write amplification and storage
- ALIAS columns cannot be used in a projection's ORDER BY clause (use MATERIALIZED columns or inline expressions instead)
- Projections cannot reference other tables - they only operate on the parent table's columns
- Projections are not supported in SELECT statements with the FINAL modifier
- Projections are only supported for MergeTree family engines

## Checking Materialization Completeness

```sql
SELECT
    name,
    parts_to_do,
    is_done
FROM system.mutations
WHERE command LIKE '%MATERIALIZE PROJECTION by_user_id%'
  AND table = 'events';
```

Wait until `is_done = 1` before relying on the projection in production.

## Summary

Normal (reorder) projections are ClickHouse's answer to secondary indexes for range scans. By storing data in an alternative sort order within the same table, they let ClickHouse skip irrelevant granules when filtering on non-primary columns - delivering significant query speedups with no changes to your query code.
