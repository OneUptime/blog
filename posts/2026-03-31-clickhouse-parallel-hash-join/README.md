# How to Use Parallel Hash Join in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, Parallel Hash Join, Query Optimization, Performance

Description: Learn how to enable and tune ClickHouse Parallel Hash Join for faster multi-threaded JOIN operations on large tables.

---

ClickHouse offers multiple join algorithms. Parallel Hash Join is an optimized variant that builds the hash table for the right-side table in parallel across multiple threads, significantly improving join performance when both tables are large.

## Join Algorithms in ClickHouse

ClickHouse supports several join algorithms:
- `default` - auto-selects `direct` or `hash` based on join type and table engine
- `auto` - tries `hash` first, falls back to `partial_merge` if memory is exceeded
- `hash` - classic single-threaded hash join
- `parallel_hash` - multi-threaded hash table construction
- `partial_merge` - sort-merge with partial materialization of the right table
- `grace_hash` - memory-safe hash join with partitioned spilling
- `full_sorting_merge` - sort-merge join for ordered data
- `direct` - O(1) lookup using dictionaries

## Enabling Parallel Hash Join

```sql
-- Enable for a specific query
SELECT
    e.user_id,
    u.country,
    count() AS events
FROM events e
JOIN users u ON e.user_id = u.user_id
WHERE e.event_time >= now() - INTERVAL 7 DAY
GROUP BY e.user_id, u.country
SETTINGS join_algorithm = 'parallel_hash';
```

Set it as the session default:

```sql
SET join_algorithm = 'parallel_hash';
```

Or configure it globally in `users.xml`:

```xml
<profiles>
  <default>
    <join_algorithm>parallel_hash</join_algorithm>
  </default>
</profiles>
```

## How Parallel Hash Join Works

In standard hash join, one thread builds the entire hash table from the right-side table, then all threads probe it in parallel.

In parallel hash join, the data is split into buckets — one per thread, as determined by `max_threads` — and each thread builds its own hash table for its bucket simultaneously. This reduces the time to build the hash table proportionally to the number of threads.

## Controlling Parallelism

```sql
-- Set number of hash table buckets (power of 2)
SELECT
    e.user_id,
    u.name
FROM events e
JOIN users u ON e.user_id = u.user_id
SETTINGS
    join_algorithm = 'parallel_hash',
    max_threads = 16;
```

## Monitoring Join Memory Usage

```sql
-- Check memory used by recent joins
SELECT
    query,
    memory_usage,
    query_duration_ms
FROM system.query_log
WHERE query LIKE '%JOIN%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## When to Use Parallel Hash Join

Use parallel hash join when:
- The right-side table fits in memory
- You have many CPU cores available
- The join is CPU-bound rather than I/O-bound

Use `grace_hash` instead when:
- The right-side table may not fit in memory
- You are joining two very large tables

## Benchmark Example

```sql
-- Compare algorithms
SELECT count()
FROM large_events e
JOIN large_users u ON e.user_id = u.user_id
SETTINGS join_algorithm = 'hash', max_threads = 1;

SELECT count()
FROM large_events e
JOIN large_users u ON e.user_id = u.user_id
SETTINGS join_algorithm = 'parallel_hash', max_threads = 16;
```

Parallel hash join typically shows 4-8x speedup on multi-core servers compared to the single-threaded hash join.

## Summary

Parallel Hash Join in ClickHouse improves JOIN performance by building hash tables in parallel across multiple threads. Enable it with `join_algorithm = 'parallel_hash'` for queries where the right-side table fits in memory and you want to fully utilize available CPU cores.
