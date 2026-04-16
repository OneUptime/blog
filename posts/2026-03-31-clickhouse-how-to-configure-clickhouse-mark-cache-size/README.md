# How to Configure ClickHouse Mark Cache Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mark Cache, Performance, Memory, Configuration

Description: Learn how to configure ClickHouse's mark cache size to improve query performance by keeping index mark files in memory, reducing disk I/O for repeated queries.

---

## Overview

The mark cache in ClickHouse stores the parsed contents of `.mrk` (mark) files - the per-column offset files that map index granules to data file positions. By keeping marks in memory, ClickHouse avoids re-reading them from disk on every query. The mark cache is global across all tables and queries on a server.

## What Are Mark Files?

Each MergeTree data part contains mark files (`.mrk2` for adaptive granularity). For every column and every index granule, the mark file stores the byte offset into the corresponding column data file. ClickHouse reads marks to locate which parts of a column file to decompress and scan.

With many concurrent queries across large tables, mark files can be read thousands of times per second. The mark cache prevents this repeated I/O.

## Default Configuration

The default mark cache size is 5 GiB in recent ClickHouse versions.

## Setting Mark Cache Size

Configure in `config.xml` or a file under `config.d/`:

```xml
<!-- /etc/clickhouse-server/config.d/mark-cache.xml -->
<clickhouse>
    <mark_cache_size>5368709120</mark_cache_size>  <!-- 5 GiB in bytes -->
</clickhouse>
```

Or using a more readable form in newer ClickHouse versions:

```xml
<clickhouse>
    <mark_cache_size>5Gi</mark_cache_size>
</clickhouse>
```

Reload the server after changes:

```bash
sudo systemctl restart clickhouse-server
```

## Monitoring Mark Cache Usage

Check current cache usage (size in bytes and number of files) from asynchronous metrics:

```sql
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric IN ('MarkCacheBytes', 'MarkCacheFiles')
```

Check hit/miss counts (cumulative since server start) from events:

```sql
SELECT
    event,
    value
FROM system.events
WHERE event IN ('MarkCacheMisses', 'MarkCacheHits')
```

## Calculating Hit Rate

```sql
SELECT
    sumIf(value, event = 'MarkCacheHits')                        AS hits,
    sumIf(value, event = 'MarkCacheMisses')                      AS misses,
    round(
        sumIf(value, event = 'MarkCacheHits') /
        (sumIf(value, event = 'MarkCacheHits') + sumIf(value, event = 'MarkCacheMisses')) * 100,
        2
    ) AS hit_rate_pct
FROM system.events
WHERE event IN ('MarkCacheHits', 'MarkCacheMisses')
```

A hit rate above 80-90% indicates the mark cache is working well. If lower, consider increasing the size.

## Sizing Guidelines

The mark cache should hold all frequently accessed mark files. Estimate the total mark file size for your hot tables:

```sql
SELECT
    table,
    sum(marks_bytes) AS total_marks_bytes,
    formatReadableSize(sum(marks_bytes)) AS marks_size
FROM system.parts
WHERE active = 1
GROUP BY table
ORDER BY total_marks_bytes DESC
```

Set the mark cache to at least the size of the hot table marks, with headroom for other tables.

## Example Sizing

For a production server with:
- 10 hot tables totaling 2 GB of mark files
- 64 GB total RAM
- Recommended mark cache: 4-8 GB

```xml
<mark_cache_size>8589934592</mark_cache_size>  <!-- 8 GiB -->
```

## Clearing the Mark Cache

For testing purposes, you can clear the cache:

```sql
SYSTEM DROP MARK CACHE;
```

This forces all subsequent queries to re-read marks from disk - useful for benchmarking cold vs. warm performance.

## Summary

The ClickHouse mark cache stores `.mrk` file contents in memory to eliminate repeated disk reads for the per-column, per-granule offset data used during query execution. Configure `mark_cache_size` based on the total size of mark files for your hot tables. Monitor `MarkCacheHits` vs `MarkCacheMisses` to ensure the cache is large enough for your workload.
