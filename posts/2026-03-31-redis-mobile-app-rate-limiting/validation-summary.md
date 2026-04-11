# Validation Summary: How to Implement Mobile App Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, PEXPIRE, HGET, HMSET, GET, TTL, pipelines, Lua scripting)
- Python (redis-py client library)
- Rate limiting algorithms: fixed window counter, sliding window log, token bucket

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis ZADD command documentation: https://redis.io/commands/zadd
- Redis HGET/HMSET command documentation: https://redis.io/commands/hget, https://redis.io/commands/hmset
- Redis TTL command documentation: https://redis.io/commands/ttl (returns -2 for non-existent keys, -1 for keys with no expiry)
- Redis PEXPIRE command documentation: https://redis.io/commands/pexpire
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/ (pipeline, register_script APIs)

## Issues Found

### 1. Rate limit headers function - missing `endpoint` parameter and wrong key pattern
**What was wrong:** The `get_rate_limit_headers` function used key pattern `rate:device:{device_id}` (without endpoint), but the fixed window counter creates keys as `rate:device:{device_id}:{endpoint}`. The function was also missing the `endpoint` parameter entirely. Anyone using both functions together would find the headers function always returns 0 remaining (key not found).

**What was changed:** Added `endpoint: str` parameter to the function signature and updated the key pattern to `rate:device:{device_id}:{endpoint}` to match the fixed window counter.

### 2. Negative TTL in `X-RateLimit-Reset` header
**What was wrong:** `r.ttl(key)` returns `-2` when the key does not exist and `-1` when the key has no associated expiry. Adding a negative TTL to the current timestamp produces a reset time in the past, which is invalid per standard rate limit header conventions.

**What was changed:** Wrapped the TTL value with `max(ttl, 0)` so that non-existent or no-expiry keys produce a reset time of "now" rather than a time in the past.

## Review Notes
- **HMSET deprecation:** The token bucket Lua script uses `HMSET`, which has been deprecated since Redis 4.0.0 in favor of `HSET` (which now accepts multiple field-value pairs). `HMSET` still works and is not removed, so this is not a breaking issue, but future updates could use `HSET` instead.
- **Sliding window duplicate millisecond entries:** The sliding window Lua script uses `now` (millisecond timestamp) as both the sorted set score and member. If two requests from the same device arrive within the same millisecond, the second `ZADD` updates the existing member rather than adding a new one, so only one request is counted. This is a commonly accepted simplification in tutorials but could allow slightly more requests than the limit in high-throughput scenarios.
- **Fixed window TTL reset:** The fixed window counter calls `EXPIRE` on every request, which resets the TTL. This means the window can drift (e.g., a request at T+30s resets the 60s window to expire at T+90s instead of T+60s). This is a well-known trade-off of the simple pipeline approach and is acceptable for the "simplest approach" framing used in the post.
- **Return value inconsistency:** The sliding window returns 0 for allowed / 1 for rate-limited, while the token bucket returns 1 for allowed / 0 for denied. Each Python wrapper handles this correctly, but readers implementing both should note the difference.
