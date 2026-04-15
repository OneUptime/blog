# How to Use SYSTEM DROP CACHE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, System, Cache, Memory

Description: Learn how to use SYSTEM DROP CACHE commands in ClickHouse to clear DNS, mark, uncompressed, and compiled expression caches for debugging and maintenance.

---

ClickHouse maintains several in-memory caches to speed up query execution and reduce I/O. The mark cache stores MergeTree index mark files, the uncompressed cache holds decompressed data blocks, the DNS cache stores resolved hostnames, and the compiled expression cache holds JIT-compiled query functions. During development, benchmarking, and troubleshooting, you often need to clear one or more of these caches to get accurate cold-read timings or to force a refresh. This post covers each `SYSTEM DROP ... CACHE` command, when to use it, and what it affects.

## SYSTEM DROP DNS CACHE

ClickHouse caches DNS resolutions internally to avoid repeated lookups for remote data sources, dictionary sources, ZooKeeper nodes, and cluster replicas.

```sql
SYSTEM DROP DNS CACHE;
```

### When to use it

- After changing DNS records for a ClickHouse cluster node or dictionary source.
- When a remote host IP changes and ClickHouse is still connecting to the old address.
- After modifying `/etc/hosts` on the ClickHouse server.

```sql
-- Drop DNS cache, then verify connectivity to a remote dictionary source
SYSTEM DROP DNS CACHE;

SYSTEM RELOAD DICTIONARY my_remote_dictionary;
```

## SYSTEM DROP MARK CACHE

The mark cache stores `.mrk`, `.mrk2`, and `.mrk3` files (index marks) for MergeTree tables in memory. These marks allow ClickHouse to locate granules on disk without re-reading the index files.

```sql
SYSTEM DROP MARK CACHE;
```

### When to use it

- Before benchmarking to simulate cold-start I/O conditions.
- After making changes to MergeTree table structure or index granularity.
- To free memory occupied by marks for tables that are no longer actively queried.

```sql
-- Simulate a cold read benchmark
SYSTEM DROP MARK CACHE;

SELECT count(), avg(value)
FROM large_metrics
WHERE ts >= today() - INTERVAL 7 DAY;
```

The mark cache size is controlled by the `mark_cache_size` server setting (default: 5 GB).

## SYSTEM DROP UNCOMPRESSED CACHE

The uncompressed cache stores decompressed data blocks in memory. When ClickHouse reads a compressed data part from disk, it can cache the decompressed block for reuse by subsequent queries.

```sql
SYSTEM DROP UNCOMPRESSED CACHE;
```

### When to use it

- Before running read benchmarks to measure true disk I/O performance.
- To free memory when the server is under memory pressure.
- After loading a large batch of data to clear stale cached blocks.

```sql
-- Clear both mark and uncompressed cache for a clean benchmark
SYSTEM DROP MARK CACHE;
SYSTEM DROP UNCOMPRESSED CACHE;

-- Now run the query - all reads come from disk
SELECT sum(bytes_on_disk)
FROM system.parts
WHERE active AND database = 'default';
```

The uncompressed cache size is controlled by `uncompressed_cache_size` (default: 8 GB).

## SYSTEM DROP COMPILED EXPRESSION CACHE

ClickHouse can JIT-compile frequently used expressions (such as complex WHERE predicates or calculated columns) into native code. The compiled expression cache stores these compiled artifacts.

```sql
SYSTEM DROP COMPILED EXPRESSION CACHE;
```

### When to use it

- After deploying query changes that alter frequently compiled expressions.
- When debugging unexpected query behavior that might be caused by a stale compiled expression.
- To reclaim memory occupied by compiled code for expressions that are no longer used.

```sql
-- Force recompilation of all expressions
SYSTEM DROP COMPILED EXPRESSION CACHE;

-- Re-run a query to trigger fresh JIT compilation
SELECT
    event_name,
    count()                AS events,
    round(avg(duration_ms), 2) AS avg_duration
FROM events
WHERE created_at >= today()
  AND event_name IN ('page_view', 'click', 'purchase')
GROUP BY event_name
ORDER BY events DESC;
```

JIT compilation is controlled by the `compile_expressions` setting (default: `0` in versions before 25.6, `1` since 25.6).

## SYSTEM DROP QUERY CACHE

ClickHouse 23.1+ includes a query result cache (production-ready since 23.5). You can clear it with:

```sql
SYSTEM DROP QUERY CACHE;
```

This drops all cached query results, forcing subsequent queries to recompute from raw data. Use it after data updates when cached results may be stale.

## Checking Cache Sizes

Monitor cache memory usage before and after dropping:

```sql
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric IN (
    'MarkCacheBytes',
    'MarkCacheFiles',
    'UncompressedCacheBytes',
    'UncompressedCacheCells',
    'CompiledExpressionCacheBytes',
    'CompiledExpressionCacheCount',
    'QueryCacheBytes',
    'QueryCacheEntries'
)
ORDER BY metric;
```

## Dropping All Caches at Once

There is no single "drop all caches" command, but you can chain them:

```sql
SYSTEM DROP DNS CACHE;
SYSTEM DROP MARK CACHE;
SYSTEM DROP UNCOMPRESSED CACHE;
SYSTEM DROP COMPILED EXPRESSION CACHE;
```

## Summary

ClickHouse exposes targeted `SYSTEM DROP ... CACHE` commands for its DNS cache, mark cache, uncompressed data cache, and compiled expression cache. Use these commands before benchmarks to get accurate cold-read timings, after infrastructure changes to force re-resolution, or to reclaim memory under pressure. Monitor cache memory via `system.metrics` to understand the impact before and after each drop.
