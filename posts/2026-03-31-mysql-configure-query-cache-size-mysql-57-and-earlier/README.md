# How to Configure query_cache_size in MySQL 5.7 and Earlier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Query Cache, Configuration, MySQL 5.7, Tuning

Description: Learn how to configure query_cache_size and related settings in MySQL 5.7 and earlier to cache repeated SELECT query results and reduce database load.

---

The MySQL query cache stores the result sets of SELECT queries along with their text. When an identical query is received, MySQL returns the cached result without re-executing the query. This feature was available up through MySQL 5.7 and was removed entirely in MySQL 8.0.

Note: The query cache is deprecated as of MySQL 5.7.20 and removed in MySQL 8.0. On high-concurrency workloads it can actually hurt performance due to cache invalidation contention. Use it only on read-heavy workloads with low write volume.

## Check Current Query Cache Status

```sql
SHOW VARIABLES LIKE 'query_cache%';
SHOW STATUS LIKE 'Qcache%';
```

Key variables to look at:

```text
query_cache_type    - 0=OFF, 1=ON, 2=DEMAND
query_cache_size    - Size of the cache in bytes
query_cache_limit   - Maximum size of a single cached result
```

## Enable the Query Cache

Edit the MySQL configuration file:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add or update the following under `[mysqld]`:

```text
[mysqld]
query_cache_type  = 1
query_cache_size  = 64M
query_cache_limit = 2M
```

Restart MySQL to apply the changes:

```bash
sudo systemctl restart mysql
```

## Verify the Cache is Active

After restarting, confirm the settings took effect:

```sql
SHOW VARIABLES LIKE 'query_cache_type';
SHOW VARIABLES LIKE 'query_cache_size';
```

Expected output:

```text
+------------------+----------+
| Variable_name    | Value    |
+------------------+----------+
| query_cache_type | ON       |
| query_cache_size | 67108864 |
+------------------+----------+
```

## Monitor Cache Hit Rate

After the cache has been running for some time, check how effective it is:

```sql
SHOW STATUS LIKE 'Qcache%';
```

Key metrics:

```text
Qcache_hits          - Number of times a query was served from the cache
Qcache_inserts       - Number of queries added to the cache
Qcache_not_cached    - Queries not eligible for caching
Qcache_lowmem_prunes - Times the cache was pruned due to low memory
```

Calculate the hit rate:

```sql
SELECT
  (Qcache_hits / (Qcache_hits + Qcache_inserts)) * 100 AS hit_rate_pct
FROM (
  SELECT
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Qcache_hits') + 0 AS Qcache_hits,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Qcache_inserts') + 0 AS Qcache_inserts
) t;
```

Note: On MySQL versions before 5.7.6, use `information_schema.GLOBAL_STATUS` instead of `performance_schema.global_status`.

A hit rate above 80% indicates the cache is providing value.

## Use DEMAND Mode (query_cache_type = 2)

In demand mode, only queries that include the `SQL_CACHE` hint are cached:

```text
[mysqld]
query_cache_type = 2
query_cache_size = 64M
```

Then in your SQL:

```sql
SELECT SQL_CACHE id, name, email FROM users WHERE status = 'active';
```

This gives you explicit control over which queries benefit from caching.

## Exclude Specific Queries from Caching

To prevent a specific query from being cached even when `query_cache_type = 1`:

```sql
SELECT SQL_NO_CACHE id, name FROM users WHERE id = 1;
```

Note that queries using non-deterministic functions like `NOW()` and `RAND()` are automatically excluded from the cache by MySQL. Use `SQL_NO_CACHE` for deterministic queries that you still want to bypass the cache, such as frequently changing data or one-off reports.

## Disable the Query Cache

If the cache is causing contention on a write-heavy workload, disable it without restarting:

```sql
SET GLOBAL query_cache_type = 0;
SET GLOBAL query_cache_size = 0;
```

To make this permanent, update `mysqld.cnf`:

```text
[mysqld]
query_cache_type = 0
query_cache_size = 0
```

## Right-Sizing query_cache_size

The optimal size depends on your workload. General guidelines:

```text
Low traffic / small dataset   - 16M to 64M
Medium traffic                - 64M to 256M
High traffic or large results - Consider disabling; use application-level cache
```

A `Qcache_lowmem_prunes` value that keeps increasing means the cache is too small. Increase `query_cache_size` or reduce `query_cache_limit`.

## Summary

The query cache in MySQL 5.7 and earlier is configured through `query_cache_type` and `query_cache_size` in `mysqld.cnf`. It works best on read-heavy workloads with low write rates. Monitor `Qcache_hits` and `Qcache_lowmem_prunes` to tune the size appropriately. Because the query cache was removed in MySQL 8.0, consider migrating to application-level caching with Redis or Memcached for long-term maintainability.
