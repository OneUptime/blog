# How to Configure ClickHouse Cache Sizes for Optimal Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cache, Performance, Configuration, Mark Cache, Uncompressed Cache

Description: Configure ClickHouse mark cache, uncompressed cache, and query result cache sizes to maximize cache hit rates and query speed.

---

ClickHouse uses several caches to reduce disk I/O and speed up repeated queries. Correctly sizing these caches can dramatically improve performance, especially for analytical workloads with repeated access patterns.

## Mark Cache

The mark cache stores index marks - pointers used to locate data ranges on disk. This is one of the most impactful caches for query performance.

```xml
<!-- config.xml -->
<mark_cache_size>5368709120</mark_cache_size>
```

The value is in bytes. 5 GB is a common starting point for servers with 64+ GB RAM. Size it to hold all marks for your hottest tables.

Check current mark cache usage:

```sql
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric LIKE '%MarkCache%';
```

## Uncompressed Cache

The uncompressed cache stores decompressed column data blocks. It speeds up repeated reads of the same data but consumes more memory than the mark cache.

```xml
<uncompressed_cache_size>8589934592</uncompressed_cache_size>
```

Enable or disable per query:

```sql
SET use_uncompressed_cache = 1;
```

For write-heavy servers where data changes frequently, consider disabling the uncompressed cache to free memory for other operations:

```sql
SET use_uncompressed_cache = 0;
```

## Query Result Cache

ClickHouse 23.4+ supports a query result cache for identical repeated queries:

```sql
SET use_query_cache = 1;
SET query_cache_ttl = 60;  -- seconds
SET query_cache_max_size_in_bytes = 104857600;  -- 100MB user-level cumulative cap
```

Configure the global cache size in `config.xml`:

```xml
<query_cache>
    <max_size_in_bytes>1073741824</max_size_in_bytes>
    <max_entries>1024</max_entries>
    <max_entry_size_in_bytes>1048576</max_entry_size_in_bytes>
    <max_entry_size_in_rows>30000000</max_entry_size_in_rows>
</query_cache>
```

Inspect cache entries:

```sql
SELECT query, result_size, expires_at, stale
FROM system.query_cache
ORDER BY expires_at DESC;
```

## Compiled Expression Cache

ClickHouse compiles expressions to native code. The compiled expression cache stores these artifacts:

```xml
<compiled_expression_cache_size>134217728</compiled_expression_cache_size>
```

128 MB is usually sufficient.

## Filesystem Page Cache

Beyond ClickHouse's internal caches, the Linux page cache is critical. Ensure your server has enough free RAM to allow the OS to cache frequently accessed files. ClickHouse relies heavily on the OS page cache for data files.

Monitor page cache pressure:

```bash
free -h
vmstat 1 5
```

## Memory Budget Allocation

A practical allocation for a 128 GB RAM server:

```text
OS + ClickHouse process: 10 GB
Mark cache: 5 GB
Uncompressed cache: 10 GB
Query cache: 1 GB
OS page cache: 50+ GB (remaining)
```

## Summary

ClickHouse cache tuning starts with sizing the mark cache to fit your hottest table indexes, optionally enabling the uncompressed cache for read-heavy workloads, and configuring the query result cache for dashboards with repeated queries. Always leave ample RAM for the OS page cache, which ClickHouse relies on extensively.
