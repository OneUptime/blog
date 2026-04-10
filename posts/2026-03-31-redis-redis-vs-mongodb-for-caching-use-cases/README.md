# Redis vs MongoDB for Caching Use Cases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MongoDB, Caching, Comparison, Database

Description: Compare Redis and MongoDB for caching use cases, covering latency, TTL support, memory efficiency, and when MongoDB's document model can replace or complement Redis.

---

## Overview

Redis and MongoDB are both used in modern application stacks, but they serve different primary purposes. Redis is an in-memory data structure store optimized for sub-millisecond access; MongoDB is a disk-based document database with in-memory caching via WiredTiger. Understanding their overlap - and differences - helps choose the right tool.

## Latency Comparison

```text
Operation          | Redis (in-memory) | MongoDB (indexed)
-------------------|-------------------|------------------
Simple GET         | 0.1ms             | 1-5ms
Complex query      | N/A               | 5-50ms
Aggregation        | Varies            | 10-100ms
Write (durable)    | 0.1-1ms           | 5-20ms
```

For cache-layer workloads requiring sub-millisecond reads, Redis is the clear winner. MongoDB's latency is acceptable for primary data stores but too slow for high-frequency cache lookups.

## TTL and Expiration

```python
import redis
import pymongo
import time
from datetime import datetime, timedelta

r = redis.Redis(decode_responses=True)
mongo = pymongo.MongoClient("mongodb://localhost:27017")
db = mongo.myapp

# Redis TTL - native, per-key
r.set("cache:product:123", '{"name": "Widget"}', ex=3600)
r.ttl("cache:product:123")  # Returns seconds remaining

# MongoDB TTL - index-based, scans every 60 seconds
db.cache.create_index("expires_at", expireAfterSeconds=0)

# Insert with expiry
db.cache.insert_one({
    "_id": "product:123",
    "data": {"name": "Widget"},
    "expires_at": datetime.utcnow() + timedelta(seconds=3600)
})
```

MongoDB TTL is less precise than Redis - expired documents are removed in batches every 60 seconds by a background thread.

## Caching Patterns

```python
import json

# Redis cache-aside pattern
def get_product_redis(product_id: str) -> dict:
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from DB
    product = db.products.find_one({"_id": product_id})
    if product:
        product["_id"] = str(product["_id"])
        r.set(cache_key, json.dumps(product), ex=3600)
    return product

# MongoDB as its own cache (for less frequently accessed data)
def get_product_mongo_cached(product_id: str) -> dict:
    """Use MongoDB for medium-frequency caching when Redis is unavailable."""
    cached = db.product_cache.find_one({"_id": product_id})

    if cached and cached.get("expires_at", datetime.min) > datetime.utcnow():
        return cached["data"]

    # Fetch from source
    product = fetch_from_external_api(product_id)
    db.product_cache.replace_one(
        {"_id": product_id},
        {
            "_id": product_id,
            "data": product,
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        },
        upsert=True
    )
    return product
```

## When MongoDB Can Replace Redis for Caching

MongoDB is a reasonable cache store when:

```python
# 1. Cache data needs to be queryable
# Redis: can only look up by exact key
value = r.get("user:1001")

# MongoDB: can query across multiple fields
users = list(db.cache.find({
    "country": "US",
    "tier": "premium",
    "expires_at": {"$gt": datetime.utcnow()}
}))

# 2. Cache objects are large (Redis has memory cost)
# Large documents are cheaper to store in MongoDB

# 3. Cache and primary data are the same collection
# Avoid a separate cache layer for infrequently read data
product = db.products.find_one(
    {"_id": product_id},
    hint="cache_index"  # Hint MongoDB to use a specific index
)
```

## When Redis is Better than MongoDB for Caching

```python
# 1. Session storage - Redis TTL is precise and automatic
r.hset(f"session:{token}", mapping={"user_id": "42", "role": "admin"})
r.expire(f"session:{token}", 1800)

# 2. Rate limiting - atomic INCR is simpler and faster than MongoDB's $inc
count = r.incr(f"rate:{user_id}:{minute}")
r.expire(f"rate:{user_id}:{minute}", 120)

# 3. Leaderboards - Sorted Set O(log n) operations
r.zadd("scores", {"player:42": 9500})
top_10 = r.zrevrange("scores", 0, 9, withscores=True)
# No equivalent atomic sorted structure in MongoDB

# 4. Pub/Sub for cache invalidation
r.publish("cache:invalidate", "product:123")

# 5. High-frequency hot data (sub-millisecond requirement)
# Redis: 0.1ms, MongoDB: 1-5ms minimum
```

## Hybrid Architecture

The most common pattern uses both:

```python
from functools import wraps

def cached(ttl: int = 3600, use_redis: bool = True):
    """Multi-level cache decorator: Redis first, MongoDB fallback."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            cache_key = f"{fn.__name__}:{args}:{kwargs}"

            # Level 1: Redis (fastest)
            if use_redis:
                cached_val = r.get(cache_key)
                if cached_val:
                    return json.loads(cached_val)

            # Level 2: MongoDB cache collection
            mongo_cached = db.cache.find_one({"_id": cache_key})
            if mongo_cached and mongo_cached.get("expires_at", datetime.min) > datetime.utcnow():
                result = mongo_cached["data"]
                # Backfill Redis
                if use_redis:
                    r.set(cache_key, json.dumps(result), ex=ttl)
                return result

            # Level 3: Source of truth
            result = fn(*args, **kwargs)

            # Cache in both layers
            if use_redis:
                r.set(cache_key, json.dumps(result), ex=ttl)

            db.cache.replace_one(
                {"_id": cache_key},
                {
                    "_id": cache_key,
                    "data": result,
                    "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
                },
                upsert=True
            )
            return result
        return wrapper
    return decorator

@cached(ttl=3600)
def get_user_profile(user_id: str) -> dict:
    return db.users.find_one({"_id": user_id})
```

## Summary

Redis and MongoDB serve different niches: Redis provides sub-millisecond access for hot cache data, precise per-key TTL, and atomic data structures that MongoDB cannot replicate. MongoDB can function as a cache for queryable, complex documents or when a separate Redis instance is impractical, but its 1-5ms latency makes it unsuitable for high-frequency cache reads. The optimal architecture uses Redis for hot session data, rate limiting, and leaderboards, with MongoDB as the primary data store and an optional secondary cache layer for complex queries.
