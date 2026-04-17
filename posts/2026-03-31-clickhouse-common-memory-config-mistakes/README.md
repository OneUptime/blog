# Common ClickHouse Memory Configuration Mistakes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Configuration, Performance, MergeTree

Description: Learn the most common ClickHouse memory configuration mistakes that cause OOM kills, slow queries, and unexpected evictions in production.

---

ClickHouse is designed to use memory aggressively for performance, but misconfigured memory settings lead to OOM kills, query failures, and degraded throughput. Here are the mistakes that appear most often in production environments.

## Mistake 1: Not Setting max_server_memory_usage

By default ClickHouse caps its memory at 90% of server RAM (via `max_server_memory_usage_to_ram_ratio` = 0.9). On shared hosts that headroom is too small and leads to OOM kills.

```xml
<!-- config.xml -->
<max_server_memory_usage>32000000000</max_server_memory_usage>
<!-- or use a ratio -->
<max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
```

Set this to 80% of available RAM to leave room for the OS, ZooKeeper client, and other processes.

## Mistake 2: Setting max_memory_usage Too High Per Query

Allowing individual queries to claim most server memory causes one runaway query to evict all caches.

```sql
-- Check current per-query limit
SELECT name, value FROM system.settings WHERE name = 'max_memory_usage';

-- Set a safe limit per query (10 GB)
SET max_memory_usage = 10000000000;
```

Define a default profile in `users.xml` so all users inherit a safe limit without needing to set it manually.

## Mistake 3: Disabling or Under-sizing the Mark Cache

The mark cache holds index granule offsets. Evicting it forces ClickHouse to re-read mark files from disk on every query.

```xml
<!-- config.xml: default is 5 GB, increase for large datasets -->
<mark_cache_size>10737418240</mark_cache_size>
```

Monitor evictions with:

```sql
SELECT event, value FROM system.events WHERE event LIKE '%MarkCache%';
```

## Mistake 4: Ignoring Memory Overcommit for Aggregations

Large `GROUP BY` queries spill to disk when they exceed `max_bytes_before_external_group_by`. If this is not set, ClickHouse uses unbounded memory.

```sql
SET max_bytes_before_external_group_by = 5000000000;
SET max_memory_usage = 10000000000;
```

The spill-to-disk threshold should be half of `max_memory_usage` so ClickHouse has room to merge the spilled data.

## Mistake 5: Not Tuning background_pool_size Relative to Memory

Each background merge thread uses memory. With many concurrent merges on a small server, memory pressure spikes.

```xml
<!-- config.xml -->
<background_pool_size>4</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

Reduce `background_pool_size` on memory-constrained nodes.

## Mistake 6: Allocating Too Much to Uncompressed Cache

The uncompressed cache stores decompressed column data. On high-throughput workloads it evicts quickly and wastes memory that would be better spent on the OS page cache.

```xml
<!-- Disable or minimize uncompressed cache for analytics workloads -->
<uncompressed_cache_size>0</uncompressed_cache_size>
```

Only enable the uncompressed cache for OLTP-style point lookups.

## Summary

ClickHouse memory tuning requires setting `max_server_memory_usage`, per-query limits, and appropriate cache sizes. The biggest risks are uncapped server memory, uncontrolled aggregation memory, and an undersized mark cache. Monitor `system.events` and `system.asynchronous_metrics` to catch memory pressure before it causes OOM kills.
