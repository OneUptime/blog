# How to Use Redis as a Cache for Your Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Performance, Cache-Aside, TTL, Application

Description: Learn how to add Redis caching to your application using the cache-aside pattern, TTL management, and cache invalidation strategies.

---

## What Is Redis Caching

Redis is an in-memory data store that sits between your application and your database. By storing frequently accessed data in Redis, you avoid expensive database queries and reduce response times from hundreds of milliseconds to single-digit milliseconds.

## Installing Redis

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install redis-server
redis-server --version
```

On macOS:

```bash
brew install redis
brew services start redis
```

Verify Redis is running:

```bash
redis-cli ping
# PONG
```

## The Cache-Aside Pattern

The most common caching pattern: check the cache first, fall back to the database on a miss, and populate the cache for next time.

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user(user_id):
    cache_key = f'user:{user_id}'
    # 1. Check cache
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    # 2. Cache miss - query database
    user = db.query('SELECT * FROM users WHERE id = ?', user_id)
    if user:
        # 3. Store in cache with 10-minute TTL
        r.setex(cache_key, 600, json.dumps(user))
    return user
```

## Setting TTL (Time to Live)

Always set a TTL on cached values to prevent stale data from living forever:

```bash
# Set a key with a 60-second TTL
SET user:42 '{"name":"Alice"}' EX 60

# Set with millisecond precision TTL
SET user:42 '{"name":"Alice"}' PX 60000

# Check remaining TTL
TTL user:42

# Update TTL without changing value
EXPIRE user:42 120
```

In application code:

```javascript
const redis = require('redis');
const client = redis.createClient();

async function cacheProduct(productId, data, ttlSeconds = 300) {
  await client.setEx(`product:${productId}`, ttlSeconds, JSON.stringify(data));
}

async function getProduct(productId) {
  const cached = await client.get(`product:${productId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  const product = await db.findProduct(productId);
  if (product) {
    await cacheProduct(productId, product);
  }
  return product;
}
```

## Caching Database Query Results

Cache entire query results, not just individual records:

```python
def get_top_products(category, limit=10):
    cache_key = f'products:top:{category}:{limit}'
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    results = db.query(
        'SELECT * FROM products WHERE category = ? ORDER BY sales DESC LIMIT ?',
        category, limit
    )
    r.setex(cache_key, 300, json.dumps(results))  # 5-minute TTL
    return results
```

## Cache Invalidation

When data changes, invalidate the cache so stale data is not served:

```python
def update_user(user_id, new_data):
    # Update database
    db.execute('UPDATE users SET ... WHERE id = ?', user_id)
    # Invalidate cache
    r.delete(f'user:{user_id}')
    # Also invalidate any list caches that included this user
    delete_pattern('users:list:page:*')  # DEL does not support wildcards, use SCAN
```

For pattern-based deletion without blocking:

```python
def delete_pattern(pattern):
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        if keys:
            r.delete(*keys)
        if cursor == 0:
            break
```

## Avoiding Cache Stampede

When a popular cache key expires, many requests hit the database simultaneously. Use a lock to let only one request rebuild the cache:

```python
import uuid

def get_with_lock(key, fetch_fn, ttl=300):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    lock_key = f'lock:{key}'
    lock_val = str(uuid.uuid4())

    # Try to acquire lock (NX = only set if not exists)
    acquired = r.set(lock_key, lock_val, nx=True, ex=10)
    if acquired:
        try:
            data = fetch_fn()
            r.setex(key, ttl, json.dumps(data))
            return data
        finally:
            # Release lock
            if r.get(lock_key) == lock_val:
                r.delete(lock_key)
    else:
        # Wait briefly and retry
        time.sleep(0.1)
        return get_with_lock(key, fetch_fn, ttl)
```

## Checking Cache Hit Rate

Monitor effectiveness using the Redis INFO command:

```bash
redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
# keyspace_hits:150000
# keyspace_misses:12000
```

Calculate hit rate:

```python
info = r.info('stats')
hits = info['keyspace_hits']
misses = info['keyspace_misses']
hit_rate = hits / (hits + misses) * 100
print(f'Cache hit rate: {hit_rate:.1f}%')
```

A healthy cache hit rate is typically above 80%.

## Summary

Redis caching with the cache-aside pattern reduces database load and dramatically improves application response times. Always set appropriate TTLs to balance freshness and performance, and invalidate cache entries when underlying data changes. As you scale, use cache stampede protection with distributed locks to prevent thundering herd problems when popular keys expire simultaneously.
