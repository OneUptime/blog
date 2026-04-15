# How to Use Query Result Caching in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Cache, Performance, Caching, Dashboard

Description: Enable and configure ClickHouse query result cache to serve repeated dashboard queries instantly without re-scanning data.

---

ClickHouse 23.1+ includes a built-in query result cache that stores the complete results of SELECT queries. Repeated identical queries are served from cache without touching disk, making dashboard latency consistent.

## Enable Query Result Cache

The query result cache is enabled globally in `config.xml`:

```xml
<query_cache>
  <max_size_in_bytes>1073741824</max_size_in_bytes>  <!-- 1GB -->
  <max_entries>1024</max_entries>
  <max_entry_size_in_bytes>1048576</max_entry_size_in_bytes>  <!-- 1MB per entry -->
  <max_entry_size_in_rows>30000000</max_entry_size_in_rows>
</query_cache>
```

## Use Cache Per Query

Enable caching on a per-query basis with settings:

```sql
SELECT
  toDate(event_time) AS event_date,
  count() AS events
FROM user_events
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY event_date
ORDER BY event_date
SETTINGS
  use_query_cache = true,
  query_cache_nondeterministic_function_handling = 'save';
```

## Set Cache TTL

Control how long results are cached:

```sql
SELECT region, sum(revenue)
FROM sales
WHERE sale_date >= today() - 7
GROUP BY region
SETTINGS
  use_query_cache = true,
  query_cache_ttl = 600,  -- Cache for 10 minutes
  query_cache_nondeterministic_function_handling = 'save';
```

## Share Cache Results Across Users

By default, cache entries are per-user (for security). To share results across all users:

```sql
SELECT count() FROM public_events
SETTINGS
  use_query_cache = true,
  query_cache_share_between_users = true;
```

Note: only use this for queries without user-specific data.

## Inspect Cache Contents

View what is currently cached:

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

## Clear the Cache

Clear all cached entries:

```sql
SYSTEM DROP QUERY CACHE;
```

Clear for a specific query:

```sql
SELECT region, sum(revenue)
FROM sales
GROUP BY region
SETTINGS
  use_query_cache = true,
  enable_writes_to_query_cache = true,
  enable_reads_from_query_cache = false;  -- Force refresh
```

## Enable Cache in Profile

Set caching as the default for a profile:

```sql
CREATE SETTINGS PROFILE dashboard_profile
SETTINGS
  use_query_cache = true,
  query_cache_ttl = 300;

ALTER USER dashboard_user SETTINGS PROFILE dashboard_profile;
```

## When Not to Use Cache

Avoid caching for:

```sql
-- Queries with nondeterministic functions (now(), today(), rand()) are not cached by default.
-- Use query_cache_nondeterministic_function_handling = 'save' to cache them, but
-- be aware that cached results will contain stale values for those functions.
SELECT user_id, now() FROM events;  -- now() changes every call

-- Very infrequently repeated queries waste cache space
SELECT count() FROM events WHERE user_id = 42;
```

## Summary

ClickHouse query result caching (23.1+) stores complete SELECT results and serves repeated queries instantly. Configure the cache size in `config.xml`, use `use_query_cache = true` per query or in a settings profile, set TTL with `query_cache_ttl`, and optionally share results across users for public datasets. Use `system.query_cache` to monitor cache utilization.
