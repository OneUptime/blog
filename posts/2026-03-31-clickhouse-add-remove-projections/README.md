# How to Add and Remove Projections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Projection, ALTER TABLE, Performance

Description: Learn how to add, materialize, and drop projections in ClickHouse to accelerate queries that filter or aggregate on non-primary-key columns.

---

Projections in ClickHouse are pre-aggregated or pre-sorted data stored alongside the main table. They allow the query optimizer to automatically use an alternative data layout when it would produce a faster result than scanning the primary sort order. Unlike materialized views, projections are maintained automatically on every INSERT and are always consistent with the main table data.

## What Is a Projection

A projection stores a copy of the data (or an aggregated subset) sorted by a different key or pre-grouped. When ClickHouse executes a query, it evaluates whether using a projection would read fewer rows or parts than the main table, and selects it automatically.

There are two kinds:
- **Normal projections** - store the full rows re-sorted by a different key.
- **Aggregate projections** - store pre-aggregated rows using aggregate functions.

## Adding a Normal Projection

```sql
ALTER TABLE events
    ADD PROJECTION proj_by_user (
        SELECT *
        ORDER BY user_id
    );
```

This stores the data sorted by `user_id`, making queries that filter on `user_id` much faster even though the primary key is sorted differently.

## Adding an Aggregate Projection

```sql
ALTER TABLE events
    ADD PROJECTION proj_daily_counts (
        SELECT
            toDate(event_time) AS event_date,
            event_type,
            count() AS cnt,
            uniq(user_id) AS unique_users
        GROUP BY event_date, event_type
    );
```

Use regular aggregate functions like `count()` and `uniq()` in the projection definition. ClickHouse stores the aggregation state internally and merges it transparently when the projection is read, so you do not need to write `-State` or `-Merge` combinators yourself.

## Materializing a Projection

Adding a projection only affects new data written after the `ADD PROJECTION` statement. To apply it to existing data, run `MATERIALIZE PROJECTION`:

```sql
ALTER TABLE events
    MATERIALIZE PROJECTION proj_by_user;
```

This is an asynchronous operation. Track its progress in `system.mutations`:

```sql
SELECT
    mutation_id,
    command,
    is_done,
    parts_to_do
FROM system.mutations
WHERE table = 'events'
ORDER BY create_time DESC
LIMIT 5;
```

## Verifying Projection Usage

After materialization, confirm the projection exists in `system.projection_parts`:

```sql
SELECT
    table,
    parent_name,
    name AS projection_name,
    rows,
    bytes_on_disk
FROM system.projection_parts
WHERE table = 'events';
```

To verify the query optimizer selects the projection, use `EXPLAIN`:

```sql
EXPLAIN indexes = 1
SELECT user_id, count()
FROM events
WHERE user_id = 12345
GROUP BY user_id;
```

Look for the projection name in the output under `ReadFromMergeTree`.

## Dropping a Projection

Remove a projection when it is no longer needed to reclaim disk space:

```sql
ALTER TABLE events
    DROP PROJECTION proj_by_user;
```

This schedules a mutation to remove the projection data from existing parts. The main table data is unaffected.

## Combining Projections with Partitions

Projections are stored per data part and respect partitioning. Materializing on a partitioned table processes each partition independently, and you can target a single partition:

```sql
ALTER TABLE events
    MATERIALIZE PROJECTION proj_by_user
    IN PARTITION '2024-01';
```

This is useful for backfilling projections incrementally on very large tables.

## Practical Example - Accelerating User-Level Queries

Suppose the primary key is `(event_date, event_type)` but most application queries filter by `user_id`:

```sql
CREATE TABLE events (
    event_date  Date,
    event_type  LowCardinality(String),
    user_id     UInt64,
    duration_ms UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type);

-- Add projection to optimize user-level lookups
ALTER TABLE events
    ADD PROJECTION proj_by_user (
        SELECT * ORDER BY user_id
    );

ALTER TABLE events MATERIALIZE PROJECTION proj_by_user;
```

Now this query reads far fewer rows:

```sql
SELECT event_date, count()
FROM events
WHERE user_id = 42
GROUP BY event_date
ORDER BY event_date;
```

## Summary

Projections provide an automatic, always-consistent alternative data layout for ClickHouse tables. Add them with `ALTER TABLE ADD PROJECTION`, backfill existing data with `MATERIALIZE PROJECTION`, and remove unused ones with `DROP PROJECTION`. The query optimizer selects projections transparently - no query changes are needed to benefit from them.
