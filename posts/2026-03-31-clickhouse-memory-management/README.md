# How ClickHouse Memory Management Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory Management, Query, Configuration, Internal

Description: Understand how ClickHouse tracks and limits memory usage per query and server-wide, how to diagnose memory errors, and how to tune memory settings.

---

## Memory Tracking Architecture

ClickHouse tracks memory allocations through its internal `MemoryTracker` class. Every allocation is attributed to a memory tracker - either a query-level tracker, a user-level tracker, or the global server-level tracker. This hierarchical tracking lets ClickHouse enforce per-query and per-user limits without relying on OS-level memory controls.

## Per-Query Memory Limits

```sql
-- Limit a single query to 4 GB
SET max_memory_usage = 4294967296;

-- Run the query
SELECT user_id, count() FROM events GROUP BY user_id;
```

If the query exceeds the limit, ClickHouse throws:

```text
Memory limit (for query) exceeded: would use 4.30 GiB (attempt to allocate chunk of 1073741824 bytes), maximum: 4.00 GiB.
```

## Per-User and Server-Wide Memory Limits

Set a per-user limit in `users.xml` or via SQL:

```sql
ALTER USER default SETTINGS max_memory_usage = 8589934592;  -- 8 GB per query for the default user
```

The server-level cap is controlled by:

```xml
<max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
```

This prevents ClickHouse from consuming more than 90% of total RAM.

## Where Memory Goes

The main consumers in a typical analytical query:

- Hash tables for GROUP BY aggregation
- Sorting buffers for ORDER BY
- Join build-side hash tables
- Compressed and uncompressed block caches
- Mark cache (primary index entries)

```sql
-- Check current memory usage breakdown
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
ORDER BY value DESC;
```

## External Aggregation and Sorting

When a GROUP BY or ORDER BY query exceeds its memory limit, ClickHouse can spill to disk:

```sql
SET max_bytes_before_external_group_by = 2147483648;  -- 2 GB
SET max_bytes_before_external_sort = 2147483648;       -- 2 GB
```

The temporary directory for spill files is configured server-wide via `tmp_path` in `config.xml` (defaults to `/var/lib/clickhouse/tmp/`).

With external aggregation, ClickHouse writes partial hash table buckets to disk and merges them in a second pass. This is slower but prevents OOM errors.

## Caches and Their Memory

ClickHouse maintains several in-memory caches:

```sql
-- See cache-related metrics
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%Cache%'
ORDER BY value DESC;
```

The uncompressed block cache (`uncompressed_cache_size`) caches decompressed column blocks. The mark cache (`mark_cache_size`) holds primary index marks. Both can be tuned in `config.xml`.

## Diagnosing Memory Issues

```sql
-- Find queries using the most memory right now
SELECT query_id, user, memory_usage, query
FROM system.processes
ORDER BY memory_usage DESC
LIMIT 10;
```

## Summary

ClickHouse uses a hierarchical memory tracker to enforce per-query, per-user, and server-wide memory limits. Hash tables for aggregation and sort buffers are the main consumers. External aggregation and sorting let queries spill to disk when limits are tight, preventing OOM crashes at the cost of slower execution.
