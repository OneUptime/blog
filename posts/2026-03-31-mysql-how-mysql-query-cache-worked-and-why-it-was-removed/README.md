# How MySQL Query Cache Worked (and Why It Was Removed)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Cache, Performance, History, Caching

Description: Understand how MySQL's query cache worked, why it caused performance problems under high write loads, and what replaced it in MySQL 8.

---

## What Was the MySQL Query Cache

The MySQL Query Cache (QC) was a feature that stored the full result set of SELECT statements. If the same query was executed again and the underlying tables had not changed, MySQL returned the cached result directly without parsing, optimizing, or executing the query.

The query cache was available from MySQL 4.0.1 through MySQL 5.7, and was deprecated in MySQL 5.7.20. It was completely removed in MySQL 8.0.

## How the Query Cache Worked

When a SELECT query arrived:

1. MySQL computed a hash of the exact query string (including whitespace and case).
2. If the hash existed in the cache and the tables involved had not been modified, MySQL returned the cached result.
3. If the hash was not found, MySQL executed the query normally and stored the result in the cache.

### Checking Query Cache Status (MySQL 5.7)

```sql
SHOW VARIABLES LIKE 'query_cache_type';
SHOW VARIABLES LIKE 'query_cache_size';
SHOW STATUS LIKE 'Qcache%';
```

### Enabling Query Cache (MySQL 5.7)

```text
[mysqld]
query_cache_type = 1
query_cache_size = 67108864  # 64MB
query_cache_limit = 1048576  # Max 1MB per result
```

## Why the Query Cache Was Problematic

### Problem 1 - Single Global Mutex

The query cache used a single global mutex (lock) for all reads and writes. Every query - hit or miss - had to acquire this lock.

Under high concurrency, threads queued up waiting for the mutex, causing severe contention and degraded performance. What was designed to help often made things worse.

### Problem 2 - Instant Invalidation on Any Write

When any row in a table changed (INSERT, UPDATE, DELETE), MySQL immediately invalidated ALL cached results that referenced that table - even if the changed row had no effect on those results.

For write-heavy applications, the cache was constantly invalidated, providing zero benefit while consuming CPU time for cache management.

### Problem 3 - Exact Match Only

The cache required an exact string match. These two queries used different cache entries:

```sql
SELECT * FROM orders WHERE id = 1;
select * from orders where id = 1;  -- Different case = different cache entry
```

### Problem 4 - Memory Fragmentation

As results were added and evicted, the cache memory became fragmented, requiring expensive defragmentation operations.

## Performance Impact at Scale

Benchmarks consistently showed that enabling the query cache at high concurrency (>4 threads) degraded performance compared to disabling it:

```text
Concurrency    QC Disabled    QC Enabled
4 threads      100,000 QPS    95,000 QPS
16 threads     200,000 QPS    80,000 QPS   (60% SLOWER)
64 threads     300,000 QPS    50,000 QPS   (83% SLOWER)
```

## What Replaced the Query Cache in MySQL 8

MySQL 8 removed the query cache entirely. The recommended alternatives are:

### Application-Level Caching with Redis

```python
import redis
import mysql.connector
import json

redis_client = redis.Redis(host='localhost', decode_responses=True)

def get_product(product_id):
    cache_key = f"product:{product_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    conn = mysql.connector.connect(host='localhost', user='app', password='pass', database='shop')
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
    product = cursor.fetchone()
    conn.close()

    if product:
        redis_client.setex(cache_key, 300, json.dumps(product))  # Cache 5 min
    return product
```

### ProxySQL Query Caching

ProxySQL provides a smarter query cache with per-query TTL control:

```sql
-- In ProxySQL admin interface
INSERT INTO mysql_query_rules (rule_id, active, match_digest, cache_ttl)
VALUES (1, 1, '^SELECT .* FROM products', 60000);  -- Cache for 60 seconds
```

### InnoDB Buffer Pool

For read-heavy workloads, a well-sized InnoDB buffer pool caches data pages and serves most reads from memory without disk I/O - this is more effective than a query result cache.

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
```

## Disabling the Query Cache in MySQL 5.7

If you are still on MySQL 5.7, disable the query cache to avoid the mutex contention:

```text
[mysqld]
query_cache_type = 0
query_cache_size = 0
```

## Summary

The MySQL Query Cache worked by storing exact SELECT results and returning them without execution when tables were unchanged. It was fundamentally flawed because of a global mutex that caused severe contention under concurrent load, and instant full invalidation on any write. MySQL 8 removed it completely. The correct replacements are application-level caching (Redis/Memcached) with explicit invalidation, ProxySQL-based caching with TTLs, and a properly sized InnoDB buffer pool for data page caching.
