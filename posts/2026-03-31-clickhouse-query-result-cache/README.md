# How to Use Query Result Cache in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Cache, Performance, Caching, Dashboard

Description: Learn how to enable and configure ClickHouse's query result cache to serve repeated dashboard queries from memory without re-scanning data.

---

ClickHouse's query result cache stores the result of a SELECT query in memory and returns the cached result for identical subsequent queries within a configurable TTL. This is especially useful for dashboards that run the same queries repeatedly over slightly stale data.

## Enabling the Query Result Cache

The query result cache is enabled per query or per session:

```sql
-- Cache this query result for 5 minutes
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS events
FROM events
WHERE event_time >= today()
GROUP BY hour
ORDER BY hour
SETTINGS use_query_cache = 1, query_cache_ttl = 300;
```

## Setting a Global Default

In `users.xml` or via a profile:

```xml
<profiles>
  <default>
    <use_query_cache>1</use_query_cache>
    <query_cache_ttl>60</query_cache_ttl>
  </default>
</profiles>
```

Or set it for a session:

```sql
SET use_query_cache = 1;
SET query_cache_ttl = 120;  -- 2 minutes
```

## Cache Hit vs. Miss

Check whether a query was served from cache:

```sql
-- Run the query
SELECT count() FROM events SETTINGS use_query_cache = 1, query_cache_ttl = 300;

-- Check the query log
SELECT
    query,
    result_rows,
    ProfileEvents['QueryCacheHits'] AS cache_hits,
    ProfileEvents['QueryCacheMisses'] AS cache_misses
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Viewing Cached Entries

```sql
SELECT
    query,
    result_size,
    stale,
    shared,
    expires_at
FROM system.query_cache
ORDER BY expires_at DESC;
```

## Cache Configuration

Configure the maximum cache size in `config.xml`:

```xml
<query_cache>
  <max_size_in_bytes>1073741824</max_size_in_bytes>  <!-- 1 GB -->
  <max_entries>1024</max_entries>
  <max_entry_size_in_bytes>10485760</max_entry_size_in_bytes>  <!-- 10 MB per entry -->
  <max_entry_size_in_rows>30000000</max_entry_size_in_rows>
</query_cache>
```

## Bypassing the Cache for Fresh Results

```sql
-- Force a fresh result even if cache has a valid entry
SELECT count() FROM events
SETTINGS use_query_cache = 1, enable_writes_to_query_cache = 1,
         enable_reads_from_query_cache = 0;
```

## Invalidating Cache Entries

```sql
-- Clear the entire query result cache
SYSTEM CLEAR QUERY CACHE;
```

## Use Cases

- Grafana dashboards: auto-refresh every 30 seconds can be served from cache instead of re-scanning billions of rows.
- API endpoints: REST APIs querying ClickHouse for summary stats can return cached results instantly.
- Expensive DISTINCT or UNIQ queries: cache them for the duration of a reporting period.

## Summary

ClickHouse's query result cache reduces redundant computation for repeated identical queries. By setting `use_query_cache = 1` with an appropriate TTL, dashboard queries that run on a refresh cycle are served from memory instantly, dramatically reducing CPU and I/O load on your ClickHouse cluster.
