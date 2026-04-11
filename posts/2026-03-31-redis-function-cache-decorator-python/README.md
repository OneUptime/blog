# How to Use Redis as a Python Function Cache Decorator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Cache, Decorator, Performance

Description: Build a Redis-backed function cache decorator in Python to automatically cache expensive function results with TTL, key namespacing, and cache invalidation.

---

Caching expensive function calls - database queries, API responses, or heavy computations - is one of the most effective performance optimizations. A Redis-backed decorator makes caching transparent, reusable, and distributed across multiple application instances.

## Basic Cache Decorator

```python
import redis
import json
import hashlib
import functools
from typing import Callable, Any

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def redis_cache(ttl: int = 300, prefix: str = "cache"):
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build a deterministic cache key from function name and arguments
            key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            key_hash = hashlib.md5(key_data.encode()).hexdigest()
            cache_key = f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"

            # Check cache
            cached = r.get(cache_key)
            if cached is not None:
                return json.loads(cached)

            # Call the original function
            result = func(*args, **kwargs)

            # Store in cache
            r.set(cache_key, json.dumps(result), ex=ttl)
            return result
        return wrapper
    return decorator
```

## Using the Decorator

```python
import time

@redis_cache(ttl=60, prefix="api")
def get_user_profile(user_id: int) -> dict:
    # Simulates a slow database query
    time.sleep(0.5)
    return {"id": user_id, "name": "Alice", "plan": "pro"}

@redis_cache(ttl=300, prefix="report")
def generate_monthly_report(year: int, month: int) -> dict:
    # Simulates expensive report generation
    time.sleep(2)
    return {"year": year, "month": month, "revenue": 42000}

# First call - hits the real function
start = time.time()
profile = get_user_profile(1001)
print(f"First call: {time.time() - start:.3f}s")  # ~0.5s

# Second call - served from Redis
start = time.time()
profile = get_user_profile(1001)
print(f"Second call: {time.time() - start:.3f}s")  # ~0.001s
```

## Cache Invalidation

Add an `invalidate` method to the decorator:

```python
def redis_cache(ttl: int = 300, prefix: str = "cache"):
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            key_hash = hashlib.md5(key_data.encode()).hexdigest()
            cache_key = f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"

            cached = r.get(cache_key)
            if cached is not None:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.set(cache_key, json.dumps(result), ex=ttl)
            return result

        def invalidate(*args, **kwargs):
            key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            key_hash = hashlib.md5(key_data.encode()).hexdigest()
            cache_key = f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"
            r.delete(cache_key)

        wrapper.invalidate = invalidate
        return wrapper
    return decorator

# Invalidate a specific call
get_user_profile.invalidate(1001)
```

## Async Version

```python
import redis.asyncio as aioredis

def async_redis_cache(ttl: int = 300, prefix: str = "cache"):
    ar = aioredis.Redis(host="localhost", port=6379, decode_responses=True)

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
            key_hash = hashlib.md5(key_data.encode()).hexdigest()
            cache_key = f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"

            cached = await ar.get(cache_key)
            if cached is not None:
                return json.loads(cached)
            result = await func(*args, **kwargs)
            await ar.set(cache_key, json.dumps(result), ex=ttl)
            return result
        return wrapper
    return decorator
```

## Summary

A Redis-backed cache decorator intercepts function calls, builds a deterministic key from the function name and arguments, and serves subsequent calls from Redis until the TTL expires. Add an `invalidate` helper method on the wrapper to support explicit cache busting when underlying data changes.
