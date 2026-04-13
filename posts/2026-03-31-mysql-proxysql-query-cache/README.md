# How to Cache Queries with ProxySQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Cache, Query Rule, Performance

Description: Use ProxySQL's query cache to reduce MySQL load by caching SELECT results at the proxy layer and serving repeated queries without hitting the database.

---

## How ProxySQL Query Cache Works

ProxySQL has a built-in in-memory query cache that sits between the application and MySQL. When a cached query arrives, ProxySQL serves the result directly from memory without forwarding the request to any backend. Cache entries expire after a configurable TTL. This approach works best for read-heavy workloads where the same queries run repeatedly and the underlying data changes infrequently.

## Enabling the Cache

The cache is controlled per query rule using the `cache_ttl` column (value in milliseconds). No global toggle is needed - simply add or update a rule.

```sql
-- Cache all SELECT queries for 5 seconds (5000 ms)
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, cache_ttl, apply
) VALUES (50, 1, '^SELECT', 5000, 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Caching Specific Queries

For fine-grained control, match a narrower pattern and set a longer TTL for data that rarely changes:

```sql
-- Cache product catalog queries for 60 seconds
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, cache_ttl, apply
) VALUES (51, 1, '^SELECT .* FROM products', 60000, 1);

-- Cache exchange rate lookup for 10 minutes
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, cache_ttl, apply
) VALUES (52, 1, 'SELECT .* FROM exchange_rates', 600000, 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Configuring Cache Size

Set the memory threshold used by the cache purging thread. This is a soft limit — when usage exceeds this value, the purging thread becomes more aggressive about evicting entries:

```sql
SET mysql-query_cache_size_MB = 256;
LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Monitoring Cache Effectiveness

Query `stats_mysql_global` for cache hit and miss counters:

```sql
SELECT Variable_Name, Variable_Value
FROM stats_mysql_global
WHERE Variable_Name LIKE 'Query_Cache%';
```

Key variables:

```text
Query_Cache_count_GET       - total cache lookups
Query_Cache_count_GET_OK    - cache hits (result found)
Query_Cache_count_SET       - entries added to cache
Query_Cache_bytes_IN        - bytes written into cache
Query_Cache_bytes_OUT       - bytes read from cache
Query_Cache_Purged          - entries evicted due to TTL or memory pressure
```

A high `GET_OK / GET` ratio indicates the cache is effective.

## Bypassing Cache for Specific Users

If certain users should always get fresh data (e.g., admin tools), add a rule that matches their queries without setting `cache_ttl`, and use a lower `rule_id` so it is evaluated first. Setting `apply=1` stops rule processing so no later caching rule applies:

```sql
INSERT INTO mysql_query_rules (
  rule_id, active, username, match_pattern, apply
) VALUES (1, 1, 'admin_user', '^SELECT', 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Clearing the Cache

In ProxySQL 2.x, flush the entire query cache with a single command:

```sql
PROXYSQL FLUSH QUERY CACHE;
```

In production, prefer short TTLs over manual flushes.

## Summary

ProxySQL's query cache reduces MySQL load by serving repeated SELECT results from memory using the `cache_ttl` column in `mysql_query_rules`. Monitor hit rates through `stats_mysql_global`, scope caching to specific queries or schemas with regex patterns, and exclude sensitive users with a non-caching rule. Keep TTLs short for data that changes frequently to avoid stale reads.
