# How to Configure query_cache_size (MySQL 5.7 and Earlier)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Cache, Configuration, MySQL 5.7

Description: Learn how to configure the MySQL query cache in MySQL 5.7 and earlier, when to use it, and why it was removed in MySQL 8.0.

---

## What Is the Query Cache

The MySQL query cache stores the text of SELECT queries along with their result sets. When an identical query is received, MySQL returns the cached result without re-executing the query.

**Important:** The query cache was deprecated in MySQL 5.7.20 and removed entirely in MySQL 8.0. Do not use it in new deployments. Use application-level caching (Redis, Memcached) instead.

## Query Cache Variables

```sql
SHOW VARIABLES LIKE 'query_cache%';
```

```text
+------------------------------+---------+
| Variable_name                | Value   |
+------------------------------+---------+
| query_cache_limit            | 1048576 |
| query_cache_min_res_unit     | 4096    |
| query_cache_size             | 0       |
| query_cache_type             | OFF     |
| query_cache_wlock_invalidate | OFF     |
+------------------------------+---------+
```

- `query_cache_size` - total memory allocated to the cache (0 = disabled)
- `query_cache_type` - `0`/`OFF`, `1`/`ON`, or `2`/`DEMAND`
- `query_cache_limit` - max size for a single query result (default 1 MB)

## Enabling the Query Cache in MySQL 5.7

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

Verify:

```sql
SHOW VARIABLES LIKE 'query_cache_type';
SHOW VARIABLES LIKE 'query_cache_size';
```

## query_cache_type Modes

| Value | Behavior |
|---|---|
| `0` or `OFF` | Disabled entirely |
| `1` or `ON` | Cache all cacheable queries; use `SQL_NO_CACHE` to skip |
| `2` or `DEMAND` | Only cache queries with `SQL_CACHE` hint |

With `DEMAND` mode, you opt in per query:

```sql
SELECT SQL_CACHE id, name FROM products WHERE category = 'electronics';
```

## Monitoring Query Cache Effectiveness

```sql
SHOW STATUS LIKE 'Qcache%';
```

```text
+-------------------------+---------+
| Variable_name           | Value   |
+-------------------------+---------+
| Qcache_hits             | 12345   |
| Qcache_inserts          | 6789    |
| Qcache_not_cached       | 1000    |
| Qcache_free_memory      | 4194304 |
| Qcache_total_blocks     | 300     |
| Qcache_lowmem_prunes    | 50      |
+-------------------------+---------+
```

Calculate hit rate:

```sql
SELECT
  (Qcache_hits / (Qcache_hits + Qcache_inserts)) * 100 AS hit_rate_pct
FROM (
  SELECT
    VARIABLE_VALUE AS Qcache_hits
  FROM performance_schema.global_status
  WHERE VARIABLE_NAME = 'Qcache_hits'
) h,
(
  SELECT
    VARIABLE_VALUE AS Qcache_inserts
  FROM performance_schema.global_status
  WHERE VARIABLE_NAME = 'Qcache_inserts'
) i;
```

A hit rate below 80% suggests the cache is not effective.

## Why the Query Cache Was Problematic

1. **Mutex contention** - a single global lock protected all cache operations, becoming a bottleneck under high concurrency
2. **Invalidation on any write** - any `INSERT`, `UPDATE`, or `DELETE` to a table immediately invalidates all cached queries for that table
3. **High write workloads** - on write-heavy databases, the cache provides no benefit and adds overhead
4. **Memory fragmentation** - `Qcache_lowmem_prunes` growing indicates fragmentation

## Migration to Application-Level Caching

For MySQL 8.0 and modern workloads, use Redis or Memcached:

```python
import redis
import mysql.connector
import json

cache = redis.Redis(host='localhost', port=6379)

def get_products(category):
    key = f'products:{category}'
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    conn = mysql.connector.connect(host='localhost', user='app', password='pass', database='shop')
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id, name, price FROM products WHERE category = %s', (category,))
    result = cursor.fetchall()

    cache.setex(key, 300, json.dumps(result))  # Cache for 5 minutes
    return result
```

## Summary

The query cache in MySQL 5.7 is enabled with `query_cache_type = 1` and `query_cache_size = 64M`, but it was removed in MySQL 8.0 due to scalability issues caused by its global mutex. For new applications, implement caching at the application layer using Redis or Memcached for better performance and control.
