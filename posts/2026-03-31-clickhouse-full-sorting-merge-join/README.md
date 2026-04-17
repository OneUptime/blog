# How to Use Full Sorting Merge Join in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, Sort Merge Join, Query Optimization, Performance

Description: Learn how to use ClickHouse Full Sorting Merge Join for memory-efficient joins on large pre-sorted tables, avoiding hash table construction overhead.

---

Full Sorting Merge Join is a join algorithm in ClickHouse that sorts both sides of the join by the join key and merges them in a streaming fashion. It is memory-efficient for large tables when both sides can be sorted and does not require building an in-memory hash table.

## How Full Sorting Merge Join Works

1. Both the left and right tables are sorted by the join key.
2. Two sorted streams are merged using a cursor-based merge algorithm.
3. Memory usage is proportional to the number of rows in a single "group" of equal join keys, not the entire table.

This makes it effective for:
- Very large right-side tables that do not fit in memory
- Joining two large tables of similar size
- Queries where both tables are already sorted by the join key

## Enabling Full Sorting Merge Join

```sql
SELECT
    e.user_id,
    u.country,
    count() AS events
FROM events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.country
SETTINGS join_algorithm = 'full_sorting_merge';
```

## When Pre-Sorted Tables Shine

If your tables are already sorted by the join key (matching the `ORDER BY` of a MergeTree table), Full Sorting Merge Join can read data in sorted order without additional sorting cost:

```sql
-- Both tables ordered by user_id
CREATE TABLE events (
    user_id UInt32,
    event_time DateTime,
    event_type String
) ENGINE = MergeTree()
ORDER BY user_id;

CREATE TABLE users (
    user_id UInt32,
    country LowCardinality(String),
    tier String
) ENGINE = MergeTree()
ORDER BY user_id;

-- Full sorting merge join benefits from existing sort order
SELECT e.user_id, u.country, count()
FROM events e
JOIN users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.country
SETTINGS join_algorithm = 'full_sorting_merge';
```

## Comparison with Other Join Algorithms

```sql
-- Hash join: fast for small right side, builds hash table in RAM
SETTINGS join_algorithm = 'hash';

-- Parallel hash join: parallel hash table construction, still in RAM
SETTINGS join_algorithm = 'parallel_hash';

-- Grace hash join: spills to disk if needed
SETTINGS join_algorithm = 'grace_hash';

-- Full sorting merge: sorts both sides, memory proportional to key group size
SETTINGS join_algorithm = 'full_sorting_merge';
```

## Enabling Automatic Algorithm Selection

ClickHouse can automatically select the best join algorithm:

```sql
SET join_algorithm = 'auto';
```

The `auto` setting tries hash join first, then falls back to partial merge join if memory limits are hit. For scenarios where you know both tables are large and sorted, explicitly setting `full_sorting_merge` may yield better performance.

## Checking Join Performance

```sql
SELECT
    query,
    query_duration_ms,
    memory_usage,
    read_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%JOIN%'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

Full Sorting Merge Join in ClickHouse provides a memory-efficient alternative to hash join for large table joins by sorting both sides and merging them in a streaming fashion. It is most effective when tables are already sorted by the join key, avoiding the need for an in-memory hash table that could exceed memory limits.
