# Validation Summary: How to Use Redis as a Python Function Cache Decorator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Redis (redis-py library)
- Python decorators and `functools.wraps`
- `redis.asyncio` (async Redis support in redis-py 4.2+)
- JSON serialization for cache keys
- MD5 hashing for key generation

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py `Redis.set()` API reference (verified `ex` parameter for TTL in seconds)
- redis-py async documentation: https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html
- Python `functools.wraps` documentation: https://docs.python.org/3/library/functools.html#functools.wraps
- Python `json.dumps` documentation (verified `sort_keys` and `default` parameters): https://docs.python.org/3/library/json.html#json.dumps
- Python `hashlib.md5` documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

1. **Async version: Redis client created inside every call (was line 119)**
   - **What was wrong:** `aioredis.Redis(host="localhost", port=6379, decode_responses=True)` was instantiated inside the `wrapper` function, meaning a new Redis connection pool was created on every single cached function call. This leaks connections and causes resource exhaustion under load.
   - **What was changed:** Moved the Redis client instantiation to the `async_redis_cache` function scope (outside `decorator` and `wrapper`), so a single connection pool is reused across all calls.
   - **Why:** Each `aioredis.Redis()` call creates a new connection pool. Without explicit cleanup, these connections are never closed, leading to connection leaks. A single shared client is the standard pattern.

2. **Async version: Inconsistent cache key format (was line 122)**
   - **What was wrong:** The async version used `f"{prefix}:{func.__qualname__}:{key_hash}"` which omits `func.__module__`, while both sync versions used `f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"`.
   - **What was changed:** Updated the async cache key to `f"{prefix}:{func.__module__}.{func.__qualname__}:{key_hash}"` to match the sync versions.
   - **Why:** Without `__module__` in the key, two functions with the same qualified name in different modules would share cache entries, causing incorrect cached results.

## Review Notes
- The `Any` import from `typing` in the basic decorator example is unused, but this is a minor style issue not worth changing.
- Using MD5 for cache key hashing is appropriate here since it is not used for security purposes, only for generating short deterministic keys.
- The `default=str` in `json.dumps` for key generation is a pragmatic choice that handles non-JSON-serializable arguments, though callers should be aware that different objects with the same `str()` representation will produce the same cache key.
- The decorator only caches JSON-serializable return values. Functions returning non-serializable objects (e.g., database cursors, file handles) will raise a `TypeError` at `json.dumps(result)`. This is an inherent limitation that could be noted in a future revision.
