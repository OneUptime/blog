# How to Use Memcached as a Cache Layer for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Memcached, Cache

Description: Learn how to use Memcached as a cache layer for MySQL queries to reduce database load, improve response times, and implement effective cache invalidation.

---

Memcached is an in-memory key-value store that reduces MySQL database load by caching the results of frequently executed queries. When an application reads data, it first checks Memcached. If the data exists (a cache hit), it returns immediately without touching MySQL. If it does not exist (a cache miss), the application queries MySQL and stores the result in Memcached for subsequent requests.

## Installing Memcached

```bash
# Ubuntu/Debian
sudo apt install memcached libmemcached-tools
sudo systemctl enable --now memcached

# Verify
memcstat --servers=127.0.0.1
```

## Cache-Aside Pattern in Python

The most common pattern is cache-aside, where the application manages the cache explicitly:

```python
import pymemcache.client.base as memcache
import mysql.connector
import json

mc = memcache.Client(('127.0.0.1', 11211))
db = mysql.connector.connect(host='localhost', database='myapp', user='app', password='secret')

def get_product(product_id):
    cache_key = f'product:{product_id}'

    # Try cache first
    cached = mc.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss: query MySQL
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM products WHERE id = %s', (product_id,))
    product = cursor.fetchone()

    if product:
        # Store in cache for 5 minutes
        mc.set(cache_key, json.dumps(product, default=str), expire=300)

    return product
```

## Cache Key Design

Use structured key names to avoid collisions and make invalidation predictable:

```text
product:{id}             - single product
products:category:{slug} - product list by category
user:{id}:profile        - user profile
orders:{user_id}:recent  - recent orders per user
```

## Cache Invalidation on Write

Invalidate cached entries when the underlying MySQL data changes:

```python
def update_product(product_id, data):
    cursor = db.cursor()
    cursor.execute(
        'UPDATE products SET name=%s, price=%s WHERE id=%s',
        (data['name'], data['price'], product_id)
    )
    db.commit()

    # Invalidate cache
    mc.delete(f'product:{product_id}')

    # Also invalidate any list caches that may contain this product
    cursor.execute('SELECT category_slug FROM products WHERE id=%s', (product_id,))
    row = cursor.fetchone()
    if row:
        mc.delete(f'products:category:{row[0]}')
```

## Bulk Cache Loading

Pre-warm the cache with frequently accessed records after a deployment or restart:

```python
def warm_cache():
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM products WHERE featured = 1')
    for product in cursor.fetchall():
        cache_key = f'product:{product["id"]}'
        mc.set(cache_key, json.dumps(product, default=str), expire=3600)
    print(f"Cache warmed with {cursor.rowcount} products")
```

## Checking Cache Hit Rates

Monitor Memcached statistics to see whether the cache is effective:

```bash
memcstat --servers=127.0.0.1 | grep -E "cmd_get|cmd_set|get_hits|get_misses"
```

Calculate the hit rate: `get_hits / (get_hits + get_misses) * 100`. A well-tuned cache for read-heavy workloads should exceed 90%.

## Avoiding Cache Stampede

Cache stampede occurs when many requests miss the cache simultaneously and all query MySQL at once. Use a short lock to prevent this:

```python
import time

def get_product_safe(product_id):
    cache_key = f'product:{product_id}'
    lock_key = f'lock:product:{product_id}'

    cached = mc.get(cache_key)
    if cached:
        return json.loads(cached)

    # Try to acquire lock
    if mc.add(lock_key, '1', expire=5, noreply=False):
        product = fetch_from_mysql(product_id)
        mc.set(cache_key, json.dumps(product, default=str), expire=300)
        mc.delete(lock_key)
        return product

    # Another worker is fetching, wait briefly and retry
    time.sleep(0.05)
    return get_product_safe(product_id)
```

## Summary

Memcached serves as a fast in-memory cache layer in front of MySQL using the cache-aside pattern. The application checks Memcached first, falls back to MySQL on a miss, and invalidates cache entries on writes. Monitor hit rates to tune expiration times and cache key coverage.
