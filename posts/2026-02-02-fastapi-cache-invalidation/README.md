# How to Implement Cache Invalidation in FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, Caching, Redis, Performance

Description: Learn how to implement cache invalidation strategies in FastAPI using Redis, including TTL, event-based invalidation, and cache-aside patterns.

---

> "There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton

Caching is easy. Knowing when to throw away that cache? That's where things get tricky. If you've ever served stale data to users or spent hours debugging why your changes aren't showing up, you know exactly what I mean.

This guide walks through practical cache invalidation strategies for FastAPI applications using Redis. We'll cover everything from simple TTL-based expiration to more sophisticated event-driven patterns.

---

## Cache Invalidation Strategies

| Strategy | Complexity | Consistency | Best For |
|----------|------------|-------------|----------|
| **TTL-based** | Low | Eventual | Read-heavy, tolerates staleness |
| **Event-based** | Medium | Strong | Write-through scenarios |
| **Cache Tags** | Medium | Strong | Related data invalidation |
| **Dependency-based** | High | Strong | Complex data relationships |
| **Write-through** | Medium | Strong | Critical data accuracy |

---

## Setting Up Redis with FastAPI

First, let's set up our Redis connection and basic caching utilities:

```python
# cache.py
import redis
import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
from fastapi import FastAPI

# Create Redis connection pool
redis_pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True
)

def get_redis() -> redis.Redis:
    """Get a Redis connection from the pool"""
    return redis.Redis(connection_pool=redis_pool)

def make_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a consistent cache key from arguments"""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    key_hash = hashlib.md5(key_data.encode()).hexdigest()[:12]
    return f"{prefix}:{key_hash}"
```

---

## TTL-Based Invalidation

The simplest approach - let caches expire automatically after a set time period:

```python
# ttl_cache.py
from cache import get_redis, make_cache_key
from functools import wraps
import json

def cached(prefix: str, ttl_seconds: int = 300):
    """
    Decorator that caches function results with automatic TTL expiration.

    Args:
        prefix: Cache key prefix for namespacing
        ttl_seconds: Time to live in seconds (default 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            r = get_redis()
            cache_key = make_cache_key(prefix, *args, **kwargs)

            # Try to get from cache
            cached_value = r.get(cache_key)
            if cached_value:
                return json.loads(cached_value)

            # Execute function and cache result
            result = await func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))

            return result
        return wrapper
    return decorator

# Usage in FastAPI
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
@cached(prefix="user", ttl_seconds=60)
async def get_user(user_id: int):
    # Simulating database call
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}
```

### Adaptive TTL Based on Data Volatility

Not all data changes at the same rate. Here's how to set TTL based on how often data changes:

```python
# adaptive_ttl.py
from datetime import datetime, timedelta

class AdaptiveTTLCache:
    """Cache with TTL that adapts based on data change frequency"""

    # TTL settings for different data types
    TTL_CONFIG = {
        "user_profile": 3600,      # 1 hour - rarely changes
        "user_settings": 1800,     # 30 minutes
        "product_list": 300,       # 5 minutes - moderate changes
        "inventory": 60,           # 1 minute - changes frequently
        "live_scores": 10,         # 10 seconds - real-time data
    }

    def __init__(self):
        self.redis = get_redis()

    def get_ttl(self, data_type: str) -> int:
        """Get appropriate TTL for data type"""
        return self.TTL_CONFIG.get(data_type, 300)

    def set(self, key: str, value: Any, data_type: str):
        """Set cache with appropriate TTL for data type"""
        ttl = self.get_ttl(data_type)
        self.redis.setex(key, ttl, json.dumps(value))

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        value = self.redis.get(key)
        return json.loads(value) if value else None
```

---

## Event-Based Invalidation

When data changes, immediately invalidate related caches. This gives you strong consistency:

```python
# event_invalidation.py
from fastapi import FastAPI, BackgroundTasks
from typing import List
import logging

logger = logging.getLogger(__name__)

class CacheInvalidator:
    """Handles cache invalidation on data changes"""

    def __init__(self):
        self.redis = get_redis()

    def invalidate(self, *keys: str):
        """Invalidate one or more cache keys"""
        if keys:
            deleted = self.redis.delete(*keys)
            logger.info(f"Invalidated {deleted} cache keys")

    def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching a pattern"""
        # Use SCAN to avoid blocking Redis with KEYS
        cursor = 0
        deleted_count = 0

        while True:
            cursor, keys = self.redis.scan(cursor, match=pattern, count=100)
            if keys:
                deleted_count += self.redis.delete(*keys)
            if cursor == 0:
                break

        logger.info(f"Invalidated {deleted_count} keys matching '{pattern}'")
        return deleted_count

invalidator = CacheInvalidator()

app = FastAPI()

@app.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, background_tasks: BackgroundTasks):
    # Update user in database
    # ... database update logic ...

    # Invalidate related caches in the background
    background_tasks.add_task(
        invalidator.invalidate,
        f"user:{user_id}",
        f"user_profile:{user_id}",
        f"user_settings:{user_id}"
    )

    return {"status": "updated"}

@app.delete("/users/{user_id}")
async def delete_user(user_id: int, background_tasks: BackgroundTasks):
    # Delete user from database
    # ... database delete logic ...

    # Invalidate all caches related to this user
    background_tasks.add_task(
        invalidator.invalidate_pattern,
        f"*user*:{user_id}*"
    )

    return {"status": "deleted"}
```

---

## Cache Tags for Related Data

When you need to invalidate groups of related cache entries, tags make it easy:

```python
# cache_tags.py
from typing import Set, List
import json

class TaggedCache:
    """Cache system with tag-based invalidation"""

    def __init__(self):
        self.redis = get_redis()

    def set_with_tags(self, key: str, value: Any, tags: List[str], ttl: int = 300):
        """
        Store a value with associated tags for group invalidation.

        Args:
            key: The cache key
            value: Value to cache
            tags: List of tags for grouping related entries
            ttl: Time to live in seconds
        """
        pipe = self.redis.pipeline()

        # Store the actual value
        pipe.setex(key, ttl, json.dumps(value))

        # Add this key to each tag's set
        for tag in tags:
            tag_key = f"tag:{tag}"
            pipe.sadd(tag_key, key)
            pipe.expire(tag_key, ttl + 60)  # Tag lives slightly longer

        pipe.execute()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        value = self.redis.get(key)
        return json.loads(value) if value else None

    def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries with a specific tag"""
        tag_key = f"tag:{tag}"

        # Get all keys with this tag
        keys = self.redis.smembers(tag_key)

        if not keys:
            return 0

        # Delete all tagged keys plus the tag set itself
        pipe = self.redis.pipeline()
        for key in keys:
            pipe.delete(key)
        pipe.delete(tag_key)
        pipe.execute()

        return len(keys)

# Usage example
cache = TaggedCache()

@app.get("/products/{product_id}")
async def get_product(product_id: int):
    cache_key = f"product:{product_id}"

    # Check cache first
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Fetch from database
    product = await fetch_product_from_db(product_id)

    # Cache with tags for category and vendor
    cache.set_with_tags(
        cache_key,
        product,
        tags=[f"category:{product['category_id']}", f"vendor:{product['vendor_id']}"],
        ttl=600
    )

    return product

@app.put("/categories/{category_id}")
async def update_category(category_id: int, data: dict):
    # Update category in database
    # ... database update logic ...

    # Invalidate all products in this category
    invalidated = cache.invalidate_by_tag(f"category:{category_id}")

    return {"status": "updated", "caches_invalidated": invalidated}
```

---

## Dependency-Based Invalidation

For complex data relationships, track dependencies and cascade invalidations:

```python
# dependency_cache.py
from typing import Dict, Set
from collections import defaultdict

class DependencyCache:
    """Cache with automatic dependency tracking and cascade invalidation"""

    def __init__(self):
        self.redis = get_redis()
        # Track which keys depend on other keys
        # Format: dependency_key -> set of dependent keys
        self.dependency_prefix = "deps:"

    def set_with_dependencies(
        self,
        key: str,
        value: Any,
        depends_on: List[str] = None,
        ttl: int = 300
    ):
        """
        Cache a value that depends on other cache keys.
        When a dependency is invalidated, this key will also be invalidated.
        """
        pipe = self.redis.pipeline()

        # Store the value
        pipe.setex(key, ttl, json.dumps(value))

        # Register dependencies
        if depends_on:
            for dep_key in depends_on:
                dep_set_key = f"{self.dependency_prefix}{dep_key}"
                pipe.sadd(dep_set_key, key)
                pipe.expire(dep_set_key, ttl + 60)

        pipe.execute()

    def invalidate_with_dependents(self, key: str) -> int:
        """Invalidate a key and all keys that depend on it"""
        invalidated = 0
        to_invalidate = {key}
        processed = set()

        while to_invalidate:
            current_key = to_invalidate.pop()
            if current_key in processed:
                continue

            processed.add(current_key)

            # Get dependents
            dep_set_key = f"{self.dependency_prefix}{current_key}"
            dependents = self.redis.smembers(dep_set_key)

            # Add dependents to invalidation queue
            to_invalidate.update(dependents)

            # Delete the key and its dependency set
            self.redis.delete(current_key, dep_set_key)
            invalidated += 1

        return invalidated

# Usage: Order depends on User and Products
dep_cache = DependencyCache()

async def cache_order(order_id: int, order_data: dict):
    """Cache an order with its dependencies"""
    dep_cache.set_with_dependencies(
        key=f"order:{order_id}",
        value=order_data,
        depends_on=[
            f"user:{order_data['user_id']}",
            *[f"product:{pid}" for pid in order_data['product_ids']]
        ],
        ttl=3600
    )

@app.put("/products/{product_id}")
async def update_product(product_id: int, data: dict):
    # Update product in database
    # ... database update logic ...

    # Invalidate product and all orders containing this product
    invalidated = dep_cache.invalidate_with_dependents(f"product:{product_id}")

    return {"status": "updated", "caches_invalidated": invalidated}
```

---

## Background Tasks for Cache Warming

Pre-populate caches in the background to avoid cache stampedes:

```python
# cache_warming.py
from fastapi import FastAPI, BackgroundTasks
from typing import List, Callable
import asyncio
import logging

logger = logging.getLogger(__name__)

class CacheWarmer:
    """Background cache warming to prevent cold cache issues"""

    def __init__(self):
        self.redis = get_redis()
        self.warming_tasks: List[Callable] = []

    def register_warmer(self, func: Callable):
        """Register a function to be called during cache warming"""
        self.warming_tasks.append(func)
        return func

    async def warm_cache(self, keys: List[str] = None):
        """
        Warm the cache by pre-fetching data.
        If keys are provided, only warm those specific keys.
        """
        if keys:
            # Warm specific keys
            for key in keys:
                await self._warm_single_key(key)
        else:
            # Run all registered warming tasks
            for task in self.warming_tasks:
                try:
                    await task()
                except Exception as e:
                    logger.error(f"Cache warming failed: {e}")

    async def _warm_single_key(self, key: str):
        """Warm a single cache key based on its prefix"""
        # Parse key to determine type and ID
        parts = key.split(":")
        if len(parts) < 2:
            return

        key_type, key_id = parts[0], parts[1]

        # Fetch and cache based on type
        if key_type == "user":
            user = await fetch_user_from_db(int(key_id))
            self.redis.setex(key, 3600, json.dumps(user))
        elif key_type == "product":
            product = await fetch_product_from_db(int(key_id))
            self.redis.setex(key, 600, json.dumps(product))

warmer = CacheWarmer()

@warmer.register_warmer
async def warm_popular_products():
    """Pre-cache the top 100 most viewed products"""
    popular_ids = await get_popular_product_ids(limit=100)

    for product_id in popular_ids:
        product = await fetch_product_from_db(product_id)
        warmer.redis.setex(
            f"product:{product_id}",
            600,
            json.dumps(product)
        )

    logger.info(f"Warmed cache for {len(popular_ids)} popular products")

app = FastAPI()

@app.on_event("startup")
async def startup_cache_warming():
    """Warm caches on application startup"""
    await warmer.warm_cache()

@app.post("/admin/warm-cache")
async def trigger_cache_warming(background_tasks: BackgroundTasks):
    """Manually trigger cache warming"""
    background_tasks.add_task(warmer.warm_cache)
    return {"status": "cache warming started"}
```

---

## Complete Example: Cache-Aside Pattern

Putting it all together with a production-ready cache-aside implementation:

```python
# cache_aside.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from typing import Optional, TypeVar, Generic
from pydantic import BaseModel
import json
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CacheAside:
    """
    Production-ready cache-aside pattern implementation.
    Handles cache misses, write-through, and invalidation.
    """

    def __init__(self, prefix: str, ttl: int = 300):
        self.redis = get_redis()
        self.prefix = prefix
        self.ttl = ttl

    def _make_key(self, id: str) -> str:
        return f"{self.prefix}:{id}"

    async def get_or_fetch(
        self,
        id: str,
        fetch_func: Callable,
        ttl: int = None
    ) -> Optional[dict]:
        """
        Get from cache or fetch from source.
        Automatically caches the result on cache miss.
        """
        key = self._make_key(id)
        ttl = ttl or self.ttl

        # Try cache first
        cached = self.redis.get(key)
        if cached:
            logger.debug(f"Cache hit: {key}")
            return json.loads(cached)

        # Cache miss - fetch from source
        logger.debug(f"Cache miss: {key}")
        data = await fetch_func(id)

        if data:
            self.redis.setex(key, ttl, json.dumps(data))

        return data

    def write_through(self, id: str, data: dict):
        """Update cache immediately after database write"""
        key = self._make_key(id)
        self.redis.setex(key, self.ttl, json.dumps(data))

    def invalidate(self, id: str):
        """Invalidate a single cache entry"""
        key = self._make_key(id)
        self.redis.delete(key)

# Initialize caches for different entities
user_cache = CacheAside(prefix="user", ttl=3600)
product_cache = CacheAside(prefix="product", ttl=600)

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await user_cache.get_or_fetch(
        str(user_id),
        fetch_func=fetch_user_from_db
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict):
    # Update database
    updated_user = await update_user_in_db(user_id, user_data)

    # Write through to cache
    user_cache.write_through(str(user_id), updated_user)

    return updated_user

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    # Delete from database
    await delete_user_from_db(user_id)

    # Invalidate cache
    user_cache.invalidate(str(user_id))

    return {"status": "deleted"}
```

---

## Best Practices

1. **Use consistent key naming** - Establish a convention like `entity:id:subtype` and stick to it
2. **Set appropriate TTLs** - Match TTL to how often your data actually changes
3. **Handle cache failures gracefully** - Your app should work (slower) if Redis is down
4. **Monitor cache hit rates** - Low hit rates mean your invalidation might be too aggressive
5. **Use background tasks for invalidation** - Don't block user requests with cache operations
6. **Avoid thundering herd** - Use locking or cache warming to prevent stampedes after invalidation

---

## Conclusion

Cache invalidation doesn't have to be painful. The right strategy depends on your consistency requirements:

- **TTL-based** works great when eventual consistency is acceptable
- **Event-based** gives you strong consistency with minimal complexity
- **Tags** help when you need to invalidate groups of related data
- **Dependency tracking** handles complex relationships automatically

Start simple with TTL-based caching, and add more sophisticated invalidation as your needs grow. The key is understanding your data access patterns and consistency requirements.

---

*Building a FastAPI application that needs reliable monitoring? [OneUptime](https://oneuptime.com) offers comprehensive API monitoring with cache performance tracking built in.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
