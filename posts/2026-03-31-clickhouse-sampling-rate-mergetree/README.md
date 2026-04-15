# How to Configure Sampling Rate in MergeTree Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Sampling, SAMPLE BY, Table Design

Description: Learn how to configure the SAMPLE BY clause in ClickHouse MergeTree tables to enable consistent sampling and approximate query acceleration.

---

For the `SAMPLE` clause to work on a ClickHouse query, the underlying MergeTree table must declare a `SAMPLE BY` expression. This post covers how to configure `SAMPLE BY` correctly during table design and how it affects query behavior.

## How SAMPLE BY Works

`SAMPLE BY` defines the column (or expression) used to assign each row to a deterministic subset. The expression must evaluate to an unsigned integer, and ClickHouse uses its value to divide rows into ranges. When you issue `SAMPLE 0.1`, ClickHouse reads the portion covering 10% of the value range. For even sampling, the expression values should be uniformly distributed — which is why wrapping keys in a hash function like `intHash32` is recommended.

## Basic SAMPLE BY Definition

```sql
CREATE TABLE page_views
(
    user_id    UInt64,
    page       String,
    event_time DateTime,
    duration_ms UInt32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time)
SAMPLE BY user_id;
```

`user_id` is a good sampling key because it ensures all events for a given user are either all included or all excluded from the sample - preserving user-level metrics.

## SAMPLE BY Must Be in ORDER BY

The `SAMPLE BY` column must be part of the `ORDER BY` (primary key). This ensures sorted storage enables efficient sampling:

```sql
-- Correct: user_id appears in ORDER BY
ORDER BY (user_id, event_time)
SAMPLE BY user_id

-- Incorrect: event_time is not in ORDER BY
ORDER BY user_id
SAMPLE BY event_time  -- will fail
```

## Using intHash32 for Even Distribution

For evenly distributed sampling, wrap the key in a hash function:

```sql
ORDER BY (intHash32(user_id), user_id, event_time)
SAMPLE BY intHash32(user_id);
```

This improves sampling accuracy when user IDs are not uniformly distributed.

## Verifying SAMPLE BY Configuration

```sql
SELECT name, sampling_key
FROM system.tables
WHERE database = 'default' AND name = 'page_views';
```

## Running Sampled Queries

```sql
-- 10% sample of today's page views
SELECT
    page,
    count() * 10 AS approx_views
FROM page_views
SAMPLE 0.1
WHERE toDate(event_time) = today()
GROUP BY page
ORDER BY approx_views DESC
LIMIT 20;
```

## Consistency Across Joins

When joining two sampled tables, use the same sampling key and fraction so matching rows appear in both samples:

```sql
SELECT
    e.user_id,
    e.event_name,
    u.plan
FROM events AS e SAMPLE 0.1
JOIN users AS u SAMPLE 0.1 USING (user_id)
WHERE toDate(e.event_time) = today();
```

Both tables must use `user_id` as their `SAMPLE BY` for consistent co-sampling.

## Adding SAMPLE BY to Existing Tables

You can add or modify `SAMPLE BY` on an existing MergeTree table using `ALTER TABLE`, as long as the new expression is contained in the primary key:

```sql
ALTER TABLE page_views MODIFY SAMPLE BY user_id;
```

To remove sampling:

```sql
ALTER TABLE page_views REMOVE SAMPLE BY;
```

These operations are lightweight metadata changes and work with all MergeTree family engines, including replicated tables.

## Summary

Configuring `SAMPLE BY` during table creation unlocks fast approximate queries on any MergeTree table. You can also add it later via `ALTER TABLE ... MODIFY SAMPLE BY`. Choose a key that ensures natural cohesion (such as `user_id`) and wrap it in `intHash32` for even distribution. With `SAMPLE BY` in place, dashboards can use `SAMPLE 0.1` for significant query speedups on large datasets.
