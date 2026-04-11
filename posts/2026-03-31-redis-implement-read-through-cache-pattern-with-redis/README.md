# How to Implement Read-Through Cache Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Read-Through, Cache Patterns, Database

Description: Learn how to implement the read-through cache pattern with Redis, where cache misses are automatically populated by a loader function without changing application code.

---

## What is the Read-Through Pattern?

In the read-through pattern, the application always reads from the cache. On a cache miss, the cache layer automatically fetches the data from the database, stores it in the cache, and returns it to the caller.

```text
Application reads key
        |
        v
    Cache (Redis)
     hit?   miss?
      |        |
   return    fetch from DB
              |
           store in cache
              |
           return to app
```

The key difference from cache-aside (lazy loading) is where the load logic lives. In read-through, the loader is encapsulated inside a cache abstraction, keeping application code clean.

## When to Use Read-Through

- Read-heavy workloads where the same data is requested many times
- When you want to hide cache/DB interaction from application code
- Building a shared caching library or infrastructure component
- Microservices where many teams read the same entities

## Python Implementation

### Generic Read-Through Cache Class

```python
import redis
import json
from typing import Callable, Optional, Any

class ReadThroughCache:
    def __init__(self, redis_client: redis.Redis, default_ttl: int = 3600):
        self.redis = redis_client
        self.default_ttl = default_ttl

    def get(
        self,
        key: str,
        loader: Callable[[str], Optional[Any]],
        ttl: Optional[int] = None
    ) -> Optional[Any]:
        """Get from cache; on miss, call loader and populate cache."""
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        # Cache miss - load from source
        value = loader(key)
        if value is not None:
            self.redis.setex(key, ttl or self.default_ttl, json.dumps(value))

        return value

    def invalidate(self, key: str) -> None:
        self.redis.delete(key)

    def invalidate_many(self, keys: list) -> None:
        if keys:
            self.redis.delete(*keys)
```

### Usage in Application Code

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
cache = ReadThroughCache(r, default_ttl=3600)

def get_user(user_id: int) -> dict:
    key = f"user:{user_id}"
    return cache.get(key, loader=lambda k: db_fetch_user(user_id))

def get_product(product_id: int) -> dict:
    key = f"product:{product_id}"
    return cache.get(key, loader=lambda k: db_fetch_product(product_id), ttl=1800)

def db_fetch_user(user_id: int) -> dict:
    # SELECT * FROM users WHERE id = user_id
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

def db_fetch_product(product_id: int) -> dict:
    # SELECT * FROM products WHERE id = product_id
    return {"id": product_id, "name": "Widget", "price": 9.99}
```

## Node.js Implementation

```javascript
const redis = require('redis');

class ReadThroughCache {
  constructor(client, defaultTtl = 3600) {
    this.client = client;
    this.defaultTtl = defaultTtl;
  }

  async get(key, loader, ttl) {
    const cached = await this.client.get(key);
    if (cached !== null) {
      return JSON.parse(cached);
    }

    // Cache miss - load from source
    const value = await loader(key);
    if (value !== null && value !== undefined) {
      await this.client.setEx(key, ttl || this.defaultTtl, JSON.stringify(value));
    }
    return value;
  }

  async invalidate(key) {
    await this.client.del(key);
  }
}

const client = redis.createClient({ url: process.env.REDIS_URL });
await client.connect();
const cache = new ReadThroughCache(client);

async function getUser(userId) {
  return cache.get(
    `user:${userId}`,
    async () => db.query('SELECT * FROM users WHERE id = $1', [userId])
  );
}

async function getPost(postId) {
  return cache.get(
    `post:${postId}`,
    async () => db.query('SELECT * FROM posts WHERE id = $1', [postId]),
    1800 // 30 minutes TTL
  );
}
```

## Handling Cache Stampede

When many requests miss the cache simultaneously (cold start or TTL expiry), all of them hit the database at once. Use a mutex lock to allow only one request to populate the cache:

```python
import redis
import json
import time

def get_with_lock(r: redis.Redis, key: str, loader, ttl: int = 3600):
    """Read-through with mutex to prevent cache stampede."""
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{key}"

    # Try to acquire a lock
    acquired = r.set(lock_key, 1, nx=True, ex=5)  # 5-second lock

    if acquired:
        try:
            value = loader()
            if value is not None:
                r.setex(key, ttl, json.dumps(value))
            return value
        finally:
            r.delete(lock_key)
    else:
        # Another process is loading - wait and retry
        for _ in range(10):
            time.sleep(0.1)
            cached = r.get(key)
            if cached:
                return json.loads(cached)
        # Final fallback - load directly
        return loader()
```

## Batch Read-Through

```python
def get_many(r: redis.Redis, keys: list, loader, ttl: int = 3600) -> dict:
    """Get multiple keys with read-through on misses."""
    # Fetch all from cache in one round-trip
    pipe = r.pipeline()
    for key in keys:
        pipe.get(key)
    results = pipe.execute()

    missing_keys = [k for k, v in zip(keys, results) if v is None]
    data = {k: json.loads(v) for k, v in zip(keys, results) if v is not None}

    if missing_keys:
        # Load missing keys from DB in batch
        loaded = loader(missing_keys)
        pipe = r.pipeline()
        for key, value in loaded.items():
            pipe.setex(key, ttl, json.dumps(value))
            data[key] = value
        pipe.execute()

    return data
```

## Invalidation Strategy

```python
# On data update, invalidate the cache key
def update_user(user_id: int, data: dict) -> dict:
    updated = db_update_user(user_id, data)
    cache.invalidate(f"user:{user_id}")
    return updated
```

On the next read, the cache miss triggers the loader to fetch fresh data.

## Summary

The read-through pattern encapsulates cache miss handling inside a reusable cache abstraction, keeping application code free of cache logic. Implement a `ReadThroughCache` class with a `get(key, loader)` method that checks Redis first and calls the loader function on misses. Add a distributed lock to prevent cache stampede during cold starts, and implement batch loading for multi-key reads to minimize database round-trips.
