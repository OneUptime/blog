# How to Use Grace Hash Join in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, Grace Hash Join, Memory, Query Optimization

Description: Learn how to use ClickHouse Grace Hash Join to safely join large tables that exceed available memory by spilling to disk in partitioned buckets.

---

Grace Hash Join is a memory-safe join algorithm in ClickHouse that handles cases where the right-side table is too large to fit in memory. It partitions both tables into buckets and processes each bucket independently, spilling to disk when memory is constrained.

## Why Grace Hash Join Exists

The standard hash join in ClickHouse requires the right-side table to fit entirely in memory. If you join a 10 billion row events table with a 50 million row users table, the users table hash map can consume tens of gigabytes. If it exceeds the memory limit, the query fails.

Grace Hash Join solves this by:
1. Partitioning both tables into N buckets based on a hash of the join key
2. Processing each bucket pair independently
3. Spilling to disk when a bucket exceeds the memory limit

## Enabling Grace Hash Join

```sql
-- Enable for a specific query
SELECT
    e.user_id,
    u.email,
    count() AS events
FROM events e
JOIN large_users u ON e.user_id = u.user_id
GROUP BY e.user_id, u.email
SETTINGS join_algorithm = 'grace_hash';
```

## Configuring Memory Limits

Grace Hash Join works within ClickHouse's memory limits:

```sql
SELECT
    e.user_id,
    u.country
FROM events e
JOIN large_users u ON e.user_id = u.user_id
SETTINGS
    join_algorithm = 'grace_hash',
    max_memory_usage = 10000000000,  -- 10 GB limit
    grace_hash_join_initial_buckets = 16;
```

## Tuning Bucket Count

The initial bucket count affects performance and memory usage:

```sql
-- Fewer buckets: fewer passes but more memory per bucket
SETTINGS grace_hash_join_initial_buckets = 8;

-- More buckets: less memory per bucket but more overhead
SETTINGS grace_hash_join_initial_buckets = 64;
```

ClickHouse automatically doubles the bucket count if a bucket still exceeds memory limits.

## Monitoring Disk Spill

Check if grace hash join is spilling to disk:

```sql
SELECT
    query_id,
    written_bytes,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE query LIKE '%grace_hash%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Comparison: hash vs. parallel_hash vs. grace_hash

| Algorithm | Memory | Speed | Use Case |
|---|---|---|---|
| hash | Right table fits in RAM | Fast | Small dimension tables |
| parallel_hash | Right table fits in RAM | Fastest | Large but in-memory right table |
| grace_hash | Bounded, spills to disk | Moderate | Right table exceeds memory |

```sql
-- Automatically choose based on memory
SETTINGS join_algorithm = 'auto';
```

With `auto`, ClickHouse starts with hash join and falls back to partial merge join if the memory limit is violated. To get the memory-safe behavior of grace hash join, set `join_algorithm = 'grace_hash'` explicitly (or include it in a comma-separated list such as `'hash,grace_hash'`).

## Summary

Grace Hash Join enables ClickHouse to safely join tables that exceed available memory by partitioning data into manageable buckets and spilling to disk when necessary. Use it when your right-side join table is too large for standard hash join by setting `join_algorithm = 'grace_hash'` explicitly.
