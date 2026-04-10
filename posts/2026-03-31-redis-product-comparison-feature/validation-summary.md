# Validation Summary: How to Build a Product Comparison Feature with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, Sorted Sets, Strings, Hashes)
- Python (redis-py client library)
- Redis CLI commands (SADD, SCARD, SISMEMBER, SREM, EXPIRE)

## Sources Consulted
- Redis official documentation for SET commands: https://redis.io/docs/latest/commands/?group=set
- Redis official documentation for String commands (GET, SETEX): https://redis.io/docs/latest/commands/?group=string
- Redis official documentation for Sorted Set commands (ZINCRBY, ZREVRANGE): https://redis.io/docs/latest/commands/?group=sorted-set
- redis-py Python client documentation: https://redis-py.readthedocs.io/en/stable/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
1. **Data model incorrectly described cache type as Hash (line 16):** The data model stated `compare:cache:{cacheKey} -> Hash: cached comparison result`, but the code uses `r.get()` and `r.setex()` which are String operations — the cached data is stored as a JSON-serialized String, not a Redis Hash. Fixed to `compare:cache:{cacheKey} -> String: cached comparison result (JSON)`.

## Review Notes
- The `add_to_comparison` function has a potential race condition between the `SCARD` check and the `SADD` — another concurrent request could add a product between these two operations, briefly exceeding `MAX_COMPARE`. For a tutorial this is acceptable, but production code should use a Lua script or `WATCH`/`MULTI` transaction to enforce the limit atomically.
- `ZREVRANGE` is deprecated in Redis 6.2+ in favor of `ZRANGE ... REV`. The redis-py method `zrevrange` still works but may emit deprecation warnings in newer versions of the library. A future update could use `r.zrange("compare:popular_pairs", 0, limit - 1, desc=True, withscores=True)` instead.
- The Python code uses keys like `compare:{session_id}` while the CLI examples use `compare:session:abc` — these are consistent if `session_id = "session:abc"`, but readers may find the difference in naming style slightly confusing.
