# Validation Summary: How to Implement CDR (Call Detail Record) Caching with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Redis (redis-py client library)
- Redis data structures: strings, sorted sets, hashes, sets, pub/sub
- Redis pipelines

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Python `time` module documentation: https://docs.python.org/3/library/time.html

## Issues Found

1. **Unused import `hashlib`**: The `hashlib` module was imported in the Setup section but never used anywhere in the post. Removed the import.

2. **Misleading comment on `setex` call**: The comment said "Store CDR in hash" but `setex` stores a plain string key with a TTL, not a Redis hash. Changed the comment to "Store CDR as JSON string with TTL" to accurately describe the operation.

3. **Bug in `get_recent_calls` — incorrect `zrange` indices with `rev=True`**: The original code used `r.zrange(key, -limit, -1, rev=True)`. When `rev=True`, the sorted set is conceptually reversed so index 0 is the highest-scored element (most recent timestamp). Using negative indices `-limit` to `-1` selects the tail of this reversed ordering, which returns the **oldest** records — the opposite of the intended behavior. Fixed to `r.zrange(key, 0, limit - 1, rev=True)` which correctly returns the most recent `limit` calls.

## Review Notes
- The fraud detection destination tracking uses a Redis set with a flat 3600-second TTL (`EXPIRE`) rather than pruning old destinations in sync with the sliding window. This means the unique destination count can be slightly over-counted if the set's TTL gets reset by new calls while old destinations from beyond the 1-hour window remain. This is a known approximation and acceptable for a blog tutorial, but production systems would typically use a sorted set for destinations as well to enable precise window-based pruning.
- The `zrange` with `rev=True` parameter requires redis-py >= 4.2.0 and Redis server >= 6.2.0. The post does not specify version requirements, which could cause confusion for readers on older versions.
