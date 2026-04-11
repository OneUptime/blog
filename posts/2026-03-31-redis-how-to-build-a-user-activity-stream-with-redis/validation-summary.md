# Validation Summary: How to Build a User Activity Stream with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets and Streams)
- Python 3 (redis-py client library)
- FastAPI

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZREVRANGE documentation: https://redis.io/commands/zrevrange
- Redis ZRANGEBYSCORE documentation: https://redis.io/commands/zrangebyscore
- Redis ZREMRANGEBYRANK documentation: https://redis.io/commands/zremrangebyrank
- Redis XADD documentation: https://redis.io/commands/xadd
- Redis XREVRANGE documentation: https://redis.io/commands/xrevrange
- Redis XREAD documentation: https://redis.io/commands/xread
- redis-py API reference: https://redis-py.readthedocs.io/en/stable/
- FastAPI documentation: https://fastapi.tiangolo.com/

## Issues Found
- **Unused `since_id` parameter in `read_activity_stream`**: The function declared a `since_id` parameter (defaulting to `"0"`) but never passed it to `r.xrevrange()`. This meant the parameter had no effect and pagination/filtering by stream ID was silently broken. Fixed by passing `since_id` as the `min` keyword argument to `xrevrange()`.

## Review Notes
- `zrevrange` and `zrangebyscore` have been deprecated since redis-py 4.4.0 in favor of `zrange` with `rev=True` and `byscore=True` parameters respectively. The deprecated methods still work but may be removed in a future major version.
- The `approximate=True` argument passed to `xadd` is the default value in redis-py, making it redundant but not incorrect.
- The Sorted Set approach uses JSON-serialized events as members. Two identical events recorded within the same second would produce the same member string and score, causing the second to overwrite the first. This is unlikely in practice but worth noting for high-throughput scenarios.
- The `subscribe_to_activity` generator using `xread` with `block=5000` is correct. The `if messages:` guard properly handles both `None` and empty list returns across redis-py versions.
