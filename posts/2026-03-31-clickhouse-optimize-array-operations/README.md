# How to Optimize Array Operations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array, Performance, ARRAY JOIN, arrayJoin, Query Optimization

Description: Learn how to optimize ClickHouse array operations including ARRAY JOIN, array aggregations, and filtering to reduce memory and improve query speed.

---

ClickHouse's Array type enables powerful nested data structures but can become a performance bottleneck when used carelessly. Understanding how array operations work internally helps you write efficient queries.

## The Cost of Array Operations

Arrays in ClickHouse are stored as sequences of values. Common operations and their costs:

- `has(arr, val)` - O(n) linear scan per row
- `arrayJoin(arr)` - expands each array element to a row (multiplies row count)
- `length(arr)` - O(1), stored as metadata
- `arraySort(arr)` - O(n log n) per array

## Using hasAny Instead of IN + arrayJoin

For checking if any element of an array matches a set:

```sql
-- Slow: expands array then filters
SELECT event_id
FROM events
WHERE arrayJoin(tags) IN ('promo', 'sale', 'discount');

-- Fast: single pass with hasAny
SELECT event_id
FROM events
WHERE hasAny(tags, ['promo', 'sale', 'discount']);
```

## Choosing Between has and indexOf

```sql
-- Check membership
SELECT count() FROM events WHERE has(tags, 'purchase');

-- Find position (returns 0 if not found)
SELECT indexOf(tags, 'purchase') AS position FROM events WHERE position > 0;
```

## Using arrayExists for Complex Conditions

Filter arrays with a lambda function instead of expanding:

```sql
-- Slow: expands array to filter
SELECT user_id
FROM users
WHERE arrayJoin(purchase_amounts) > 100;

-- Fast: uses lambda, no row explosion
SELECT user_id
FROM users
WHERE arrayExists(x -> x > 100, purchase_amounts);
```

## Efficient Array Aggregation

To count array elements across rows, expand with `arrayJoin` in a subquery and aggregate:

```sql
-- Standard approach: expand in subquery then aggregate
SELECT tag, count() AS events
FROM (
    SELECT arrayJoin(tags) AS tag
    FROM events
)
GROUP BY tag
ORDER BY events DESC;
```

Avoid nesting `arrayJoin` inside aggregate functions like `groupArray` in a single query level, as this forces all array elements into memory before re-expanding them. For frequent aggregations, pre-compute results with materialized views (see the next section).

## ARRAY JOIN Performance

`ARRAY JOIN` is expensive because it multiplies the number of rows. Use it only when you need individual array elements:

```sql
-- Add index alongside element for position tracking
SELECT user_id, tag, tag_position
FROM events
ARRAY JOIN tags AS tag, arrayEnumerate(tags) AS tag_position;
```

For filtering, use array functions instead of ARRAY JOIN + WHERE:

```sql
-- Slow
SELECT user_id FROM events
ARRAY JOIN tags AS t
WHERE t = 'promo';

-- Fast
SELECT user_id FROM events
WHERE has(tags, 'promo');
```

## Pre-Computing Array Aggregations

For arrays that are queried repeatedly, store aggregated results:

```sql
CREATE TABLE user_tag_counts (
    user_id UInt64,
    tag String,
    event_count UInt64
) ENGINE = SummingMergeTree(event_count)
ORDER BY (user_id, tag);

CREATE MATERIALIZED VIEW user_tag_counts_mv
TO user_tag_counts
AS SELECT
    user_id,
    arrayJoin(tags) AS tag,
    count() AS event_count
FROM events
GROUP BY user_id, tag;
```

## Checking Array Operation Cost

```sql
SELECT
    query_duration_ms,
    read_rows,
    ProfileEvents['FunctionExecute'] AS function_calls,
    memory_usage
FROM system.query_log
WHERE (query LIKE '%arrayJoin%' OR query LIKE '%has(%')
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

Optimize ClickHouse array operations by preferring `has`, `hasAny`, and `arrayExists` over `ARRAY JOIN + filter`, using lambda functions to avoid row expansion, materializing frequent array aggregations in pre-aggregated tables, and reserving `ARRAY JOIN` for cases where individual element access is genuinely required.
