# ClickHouse JOIN Algorithms Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, Hash Join, Merge Join, Performance, Query Optimization

Description: A comparison of ClickHouse join algorithm options - hash, parallel_hash, partial_merge, grace_hash, and auto - with memory tradeoffs and usage guidance.

---

## Why JOIN Algorithm Choice Matters

ClickHouse does not automatically pick the optimal join algorithm for all cases. Understanding the tradeoffs lets you tune for memory, throughput, and latency based on the size of your tables.

## Algorithms Overview

```text
Algorithm      | Memory Model            | Good For                        | Limitation
---------------|-------------------------|---------------------------------|---------------------------
hash           | Full right-table in RAM | Small-to-medium right tables    | OOM on large right tables
parallel_hash  | Partitioned hash maps   | Multi-core, medium right tables | Still requires RAM
partial_merge  | Sorted chunks, spill    | Large right tables              | Slower than hash
grace_hash     | Partitioned, can spill  | Large right tables, low memory  | Slower than hash for small data
auto           | Adaptive                | General purpose                 | Unpredictable in some cases
```

## hash - Default Algorithm

```sql
SET join_algorithm = 'hash';

SELECT e.user_id, u.country
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id
WHERE e.event_time >= today();
```

Right-side table (`users`) is fully loaded into a single hash map in memory. Fast for small right tables but fails with OOM for tables larger than available memory.

## parallel_hash - Multi-Threaded Hashing

```sql
SET join_algorithm = 'parallel_hash';

SELECT e.user_id, u.country
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id;
```

Partitions the hash table across multiple threads. Better CPU utilization on multi-core servers. Memory footprint is similar to `hash` but build time is faster.

## partial_merge - Low-Memory Large Joins

```sql
SET join_algorithm = 'partial_merge';
SET default_max_bytes_in_join = 5000000000;  -- 5GB memory budget

SELECT e.user_id, u.country
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id;
```

Sorts both sides and merges in chunks. Can handle right tables larger than RAM by spilling to disk. Much slower than hash for small tables.

## grace_hash - Best for Large Right Tables

```sql
SET join_algorithm = 'grace_hash';
SET grace_hash_join_initial_buckets = 16;

SELECT o.order_id, c.email
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id;
```

Partitions both sides by join key hash, processes bucket pairs sequentially. Spills gracefully to disk when memory is limited. Good balance between memory and speed for large joins.

## auto - Adaptive Selection

```sql
SET join_algorithm = 'auto';

SELECT e.user_id, u.country
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id;
```

ClickHouse starts with hash join and switches to `partial_merge` if memory limits are hit. Good default for interactive workloads.

## Memory Monitoring

```sql
SELECT
  query_id,
  formatReadableSize(memory_usage) AS memory_used,
  query
FROM system.processes
WHERE query LIKE '%JOIN%';
```

## Summary

Use `hash` for small right-side tables under a few GB. Use `parallel_hash` to speed up hash join on multi-core servers. Choose `grace_hash` when right-side tables are large and memory is limited. Use `partial_merge` when you need a predictable low-memory footprint and can accept slower query execution. Set `join_algorithm = 'auto'` as the default for production environments where table sizes vary.
