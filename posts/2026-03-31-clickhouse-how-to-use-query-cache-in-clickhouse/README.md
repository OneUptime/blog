# How to Use Query Cache in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Caching, Query Optimization

Description: Configure and use ClickHouse's built-in query cache to speed up repeated queries by storing and reusing query results.

---

## What Is the ClickHouse Query Cache?

Introduced in ClickHouse 23.1, the query cache stores the result of a SELECT query in memory. Subsequent identical queries are served directly from the cache, bypassing query execution entirely.

```sql
-- First execution: computes the result and stores in cache
SELECT count(), sum(revenue) FROM orders WHERE date = today()
SETTINGS use_query_cache = 1;

-- Second execution: returns from cache instantly
SELECT count(), sum(revenue) FROM orders WHERE date = today()
SETTINGS use_query_cache = 1;
```

## Enabling the Query Cache

The query cache is disabled by default. Enable it per query, per session, or globally:

```sql
-- Per query
SELECT count() FROM events
SETTINGS use_query_cache = 1;

-- Per session
SET use_query_cache = 1;

-- Globally in users.xml
```

```xml
<!-- /etc/clickhouse-server/users.d/query_cache.xml -->
<clickhouse>
  <profiles>
    <default>
      <use_query_cache>1</use_query_cache>
    </default>
  </profiles>
</clickhouse>
```

## Configuring Cache Size and TTL

```xml
<!-- /etc/clickhouse-server/config.d/query_cache.xml -->
<clickhouse>
  <query_cache>
    <!-- Maximum cache size in bytes (1 GB) -->
    <max_size_in_bytes>1073741824</max_size_in_bytes>
    <!-- Maximum number of cached entries -->
    <max_entries>1024</max_entries>
    <!-- Maximum size of a single result in bytes (100 MB) -->
    <max_entry_size_in_bytes>104857600</max_entry_size_in_bytes>
    <!-- Maximum rows in a cached result -->
    <max_entry_size_in_rows>30000000</max_entry_size_in_rows>
  </query_cache>
</clickhouse>
```

## Setting Cache TTL

Control how long cached results live:

```sql
-- Cache result for 60 seconds
SELECT count() FROM events WHERE date = today()
SETTINGS
    use_query_cache = 1,
    query_cache_ttl = 60;

-- Cache result for 5 minutes
SELECT sum(revenue) FROM orders WHERE date >= today() - 7
SETTINGS
    use_query_cache = 1,
    query_cache_ttl = 300;
```

## Passive vs Active Cache Mode

```sql
-- Passive mode (default): read from cache but don't write new results
SET use_query_cache = 1;
SET query_cache_nondeterministic_function_handling = 'throw';

-- Active mode: explicitly write to cache
SELECT count() FROM events
SETTINGS
    use_query_cache = 1,
    enable_writes_to_query_cache = 1;

-- Read-only mode: only serve from cache, don't populate
SELECT count() FROM events
SETTINGS
    use_query_cache = 1,
    enable_writes_to_query_cache = 0;
```

## Sharing Cache Between Users

By default, query cache entries are isolated per user. Enable sharing:

```sql
-- Allow other users to use your cached results
SELECT count() FROM events
SETTINGS
    use_query_cache = 1,
    query_cache_share_between_users = 1;
```

Use with care - sharing can expose data to unauthorized users if row-level security is in place.

## Caching Queries with Non-Deterministic Functions

By default, queries with `now()`, `today()`, `rand()` are not cached. Override this:

```sql
-- Force caching even with non-deterministic functions
SELECT count() FROM events WHERE date = today()
SETTINGS
    use_query_cache = 1,
    query_cache_nondeterministic_function_handling = 'save',
    query_cache_ttl = 60;
```

## Inspecting the Cache

```sql
-- See what is currently cached
SELECT
    query,
    result_size,
    stale,
    shared,
    expires_at
FROM system.query_cache
ORDER BY expires_at DESC;
```

## Invalidating the Cache

```sql
-- Drop cache entries associated with a specific tag
SYSTEM DROP QUERY CACHE TAG 'dashboard';

-- Drop all cache entries
SYSTEM DROP QUERY CACHE;
```

## Practical Example - Dashboard Caching

```sql
-- Dashboard widget query - cache for 5 minutes
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS cnt
FROM events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour, event_type
ORDER BY hour
SETTINGS
    use_query_cache = 1,
    query_cache_ttl = 300,
    query_cache_nondeterministic_function_handling = 'save';
```

## When Not to Use the Query Cache

- Queries that change frequently (different WHERE parameters each time)
- Real-time queries that must reflect the latest data
- Queries with user-specific data when sharing is enabled
- Very large result sets (near or over `max_entry_size_in_bytes`)

## Summary

ClickHouse's query cache (available since 23.1) stores SELECT results in memory and serves identical subsequent queries without re-execution. Enable it with `use_query_cache = 1`, set a TTL with `query_cache_ttl`, and inspect the cache via `system.query_cache`. It is most effective for dashboard queries, reporting aggregates, and any repeated read-heavy workload where data freshness requirements allow a small staleness window.
