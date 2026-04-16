# How to Set join_algorithm in ClickHouse for Optimal Joins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, join_algorithm, Joins, Performance, SQL

Description: Learn how to configure the join_algorithm setting in ClickHouse to choose between hash join, merge join, partial merge, and other strategies for optimal query performance.

---

## Overview

ClickHouse supports multiple join algorithms, each with different performance characteristics depending on table sizes, data ordering, and available memory. The `join_algorithm` setting selects which algorithm to use. Choosing the right algorithm can dramatically reduce query latency and memory usage.

## Available Join Algorithms

```sql
SELECT getSetting('join_algorithm') AS default_algorithm
-- 'direct,parallel_hash,hash' on recent versions (tried in that order)
```

Available values:
- `hash` - in-memory hash join (uploads the right side into RAM)
- `parallel_hash` - variant of hash that builds several hashtables concurrently
- `partial_merge` - sort-merge variant where only the right table is fully sorted
- `prefer_partial_merge` - tries `partial_merge` first, otherwise uses `hash` (deprecated, same as `partial_merge,hash`)
- `full_sorting_merge` - sort-merge with full sorting of both joined tables
- `grace_hash` - Grace Hash join (spills buckets to disk to stay within memory limits)
- `direct` - nested-loop-style lookup into the right table (Dictionary, EmbeddedRocksDB, MergeTree)
- `auto` - starts with hash join and switches on the fly if the memory limit is violated

## Hash Join - Default

Hash join builds a hash table from the right table in memory, then probes it for each row of the left table. Best when the right table fits in memory.

```sql
SELECT a.user_id, a.event, b.name
FROM events a
JOIN users b ON a.user_id = b.user_id
SETTINGS join_algorithm = 'hash';
```

Control memory for hash join:

```sql
SETTINGS
    join_algorithm = 'hash',
    max_bytes_in_join = 1073741824;  -- 1 GiB
```

## Partial Merge Join

Partial merge join sorts and merges data externally, suitable for right tables that exceed memory:

```sql
SELECT a.order_id, b.product_name
FROM orders a
JOIN large_product_catalog b ON a.product_id = b.product_id
SETTINGS join_algorithm = 'partial_merge';
```

Slower than hash join but handles arbitrarily large joins without OOM errors.

## Parallel Hash Join

Uses multiple threads to build the hash table - faster for large right tables when memory allows:

```sql
SELECT a.session_id, b.page_path
FROM sessions a
JOIN pages b ON a.page_id = b.page_id
SETTINGS
    join_algorithm = 'parallel_hash',
    max_threads     = 16;
```

## Grace Hash Join

Grace Hash join partitions both sides to disk when the right table is too large for memory, then processes each partition pair:

```sql
SELECT a.event_id, b.campaign_name
FROM events a
JOIN large_campaigns b ON a.campaign_id = b.campaign_id
SETTINGS join_algorithm = 'grace_hash';
```

## Full Sorting Merge Join

Requires both sides of the join to be sorted on the join key. Most efficient when data is already sorted in storage:

```sql
SELECT a.user_id, b.profile
FROM sorted_events a
JOIN sorted_users b ON a.user_id = b.user_id
SETTINGS join_algorithm = 'full_sorting_merge';
```

## Auto Selection

`auto` lets ClickHouse pick the algorithm at runtime based on memory pressure:

```sql
SET join_algorithm = 'auto';
```

ClickHouse starts with hash join and switches on the fly to partial merge join if the memory limit (for example `max_bytes_in_join`) is violated.

## Prefer Partial Merge

`prefer_partial_merge` always tries `partial_merge` first and falls back to `hash` when partial merge is not supported for the query. It is equivalent to `partial_merge,hash` and is marked deprecated in current ClickHouse releases:

```sql
SET join_algorithm = 'prefer_partial_merge';
```

## Checking Available Memory for Joins

```sql
SELECT
    query_id,
    peak_memory_usage,
    query
FROM system.query_log
WHERE query LIKE '%JOIN%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10
```

## Decision Guide

| Right Table Size | Recommended Algorithm |
|-----------------|----------------------|
| Small (< 1 GB)  | hash |
| Medium (1-10 GB) | parallel_hash or prefer_partial_merge |
| Large (> 10 GB) | grace_hash or partial_merge |
| Both sides sorted | full_sorting_merge |
| Unknown / mixed | auto |

## Memory Limits

```sql
SETTINGS
    join_algorithm = 'hash',
    max_bytes_in_join = 2147483648,  -- 2 GiB
    join_overflow_mode = 'throw';    -- or 'break' to return partial results
```

## Summary

ClickHouse's `join_algorithm` setting controls how JOIN operations are executed. Use `hash` for small right tables in memory, `parallel_hash` for faster large in-memory joins, `grace_hash` or `partial_merge` for right tables exceeding available RAM, and `auto` or `prefer_partial_merge` for workloads with variable table sizes. Always set `max_bytes_in_join` to prevent OOM errors on unexpected large inputs.
