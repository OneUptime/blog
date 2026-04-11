# Validation Summary: How to Implement Sliding Window Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sorted Sets: ZADD, ZCOUNT, ZCARD, ZREMRANGEBYSCORE, EXPIRE)
- Python (redis-py client library)
- Lua scripting in Redis
- FastAPI (HTTP middleware)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZCOUNT documentation: https://redis.io/commands/zcount
- Redis ZCARD documentation: https://redis.io/commands/zcard
- Redis ZREMRANGEBYSCORE documentation: https://redis.io/commands/zremrangebyscore
- Redis EVAL / Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation for pipeline and register_script: https://redis-py.readthedocs.io/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- RFC 7231 Section 7.1.3 (Retry-After header): https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3

## Issues Found
- **Bug: `get_rate_limit_info` did not record requests.** The function only called `zremrangebyscore` and `zcard` but never called `zadd` to add the current request to the sorted set, nor `expire` to set a TTL. This meant the FastAPI middleware that depends on it would never actually rate limit anyone — the sorted set would always remain empty. Fixed by adding `pipe.zadd(key, {str(now): now})` and `pipe.expire(key, window + 1)` to the pipeline, and adjusting the `remaining` calculation to `max(0, limit - count - 1) if allowed else 0` to account for the just-added request.

## Review Notes
- The pipeline-based functions (`is_allowed` and `get_rate_limit_info`) unconditionally add requests even when the limit is exceeded. The post correctly identifies this class of issue in the "Atomic Lua Implementation" section and provides the Lua script as the proper atomic solution, so no change was made.
- Using the timestamp as both score and member in `ZADD` could cause collisions if two requests arrive at exactly the same microsecond. This is a standard pattern in Redis rate limiting tutorials and the collision probability is extremely low, so no change was made.
- The `reset_at` calculation (`int(now) + window`) is an approximation — in a true sliding window the oldest request falls off at its own timestamp + window, not relative to the current time. This is a common and reasonable simplification for API headers.
- `request.client` in FastAPI can be `None` when behind certain proxy configurations; production deployments should account for this, but it is acceptable for a tutorial.
