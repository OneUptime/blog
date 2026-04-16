# How to Configure ClickHouse Query Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Cache, Performance, Caching, Configuration

Description: Learn how to configure ClickHouse's query cache to store and reuse query results, reducing latency and server load for repeated identical queries.

---

## Overview

The ClickHouse query cache (introduced in version 23.1) stores the full result sets of SELECT queries. When an identical query is executed again, ClickHouse returns the cached result without executing the query. This is especially valuable for dashboard queries, report endpoints, and monitoring systems that repeatedly execute the same queries.

## Enabling the Query Cache

The query cache is enabled globally in `config.xml`:

```xml
<!-- /etc/clickhouse-server/config.d/query-cache.xml -->
<clickhouse>
    <query_cache>
        <max_size_in_bytes>1073741824</max_size_in_bytes>    <!-- 1 GiB total -->
        <max_entries>1024</max_entries>                       <!-- max cached queries -->
        <max_entry_size_in_bytes>1048576</max_entry_size_in_bytes>  <!-- 1 MiB max per result -->
        <max_entry_size_in_rows>30000000</max_entry_size_in_rows>   <!-- 30M rows max per result -->
    </query_cache>
</clickhouse>
```

## Using the Query Cache in Queries

Enable caching for a specific query with the `SETTINGS` clause:

```sql
SELECT
    toDate(event_time) AS date,
    count()            AS events
FROM events
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY date
ORDER BY date
SETTINGS use_query_cache = 1;
```

On the first execution, the result is computed and cached. On subsequent identical executions, the result is returned from cache.

## Session-Level Default

Enable query caching by default for a session:

```sql
SET use_query_cache = 1;

-- All subsequent SELECT queries use the cache
SELECT count() FROM large_table;
SELECT avg(value) FROM metrics WHERE date = today();
```

## Cache Staleness - TTL

Control how long cache entries remain valid:

```sql
SELECT count() FROM events
SETTINGS
    use_query_cache = 1,
    query_cache_ttl = 300;  -- cache is valid for 300 seconds (5 minutes)
```

After the TTL expires, the next query re-executes and refreshes the cache entry.

## Cache Sharing Between Users

By default, cached results are only reused by the same user. Enable cross-user sharing:

```sql
SELECT * FROM dashboard_summary
SETTINGS
    use_query_cache = 1,
    query_cache_share_between_users = 1;
```

This is useful for shared dashboards where many users run identical queries.

## Bypassing the Cache

Force re-execution even if a cached result exists by disabling reads from the cache while still writing the fresh result back:

```sql
SELECT count() FROM events
SETTINGS use_query_cache = 1, enable_reads_from_query_cache = 0;

-- Or completely bypass:
SELECT count() FROM events SETTINGS use_query_cache = 0;
```

## Monitoring Cache Usage

Check current cache state:

```sql
SELECT * FROM system.query_cache;
```

This shows all cached queries, their sizes, creation times, and TTL expiry.

Check hit and miss events:

```sql
SELECT event, value
FROM system.events
WHERE event IN ('QueryCacheHits', 'QueryCacheMisses')
```

## Clearing the Query Cache

```sql
SYSTEM DROP QUERY CACHE;
```

Or drop cache entries that were written with a specific tag. Tag queries when caching:

```sql
SELECT count() FROM events SETTINGS use_query_cache = 1, query_cache_tag = 'events_dashboard';
```

Then drop just those entries:

```sql
SYSTEM DROP QUERY CACHE TAG 'events_dashboard';
```

## Best Practices

- Use query cache for dashboard and monitoring queries with 5-15 minute TTLs
- Do not cache queries that access data updated more frequently than the TTL
- Avoid caching queries with non-deterministic functions (`now()`, `rand()`) unless intentional
- Size `max_entry_size_in_bytes` to match your typical result set size

## Summary

ClickHouse's query cache stores full SELECT result sets and serves them directly on repeated execution. Configure it in `config.xml` for global limits and control per-query with `use_query_cache = 1` and `query_cache_ttl`. Monitor usage through `system.query_cache` and `QueryCacheHits`/`QueryCacheMisses` events. It is most effective for dashboard workloads where the same query is executed frequently by multiple users.
