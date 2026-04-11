# Validation Summary: How to Implement Rate Limiting in a Single Redis Lua Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, EVAL/EVALSHA, sorted sets, hashes)
- Lua (Redis embedded scripting)
- Python (redis-py client library)
- Flask (middleware/decorator pattern)

## Sources Consulted
- Redis EVAL and Lua scripting documentation (https://redis.io/docs/latest/develop/interact/programmers/lua-api/)
- Redis INCR, EXPIRE, TTL, ZADD, ZREMRANGEBYSCORE, ZCARD, PEXPIRE, HMGET, HSET command references (https://redis.io/docs/latest/commands/)
- Redis SCRIPT LOAD documentation (https://redis.io/docs/latest/commands/script-load/)
- redis-py evalsha and script_load API (https://redis-py.readthedocs.io/)
- HTTP 429 and Retry-After header semantics (RFC 6585)

## Issues Found
- **Critical bug in fixed window Lua denied return value**: The Lua script returned `{0, redis.call('TTL', key)}` when a request exceeded the limit. However, when the request count exactly equaled the limit (last allowed request), the allowed path also returned `{limit - current, ttl}` = `{0, ttl}`. Since the Python code checked `allowed = remaining >= 0`, the value `0` was treated as "allowed" in both cases, meaning every request over the limit was incorrectly permitted. Fixed by changing the denied return to `{-1, redis.call('TTL', key)}`, so the Python `>= 0` check correctly returns `False` for denied requests and `True` for the boundary case where remaining is exactly 0.

## Review Notes
- The sliding window script uses `math.random(1, 1000000)` for member uniqueness in the sorted set. On Redis < 7.0 with script-based replication (the old default), `math.random` is seeded deterministically per script invocation, meaning concurrent requests within the same millisecond could generate identical members and collide. On Redis >= 7.0 (which uses effects-based replication by default), this is not an issue. The post does not specify a minimum Redis version.
- The Python code computes the SHA1 hash locally with `hashlib` even though `r.script_load()` returns the SHA. Using the return value directly would be simpler and eliminate the `hashlib` import, but the current approach is not incorrect since the hashes will match.
- The NOSCRIPT error handling uses string matching (`'NOSCRIPT' in str(e)`) rather than catching `redis.exceptions.NoScriptError`. This works correctly but is less idiomatic for redis-py.
- The Flask middleware snippet references `app` and `check_rate_limit` without defining them, which is appropriate for a blog post code snippet showing integration patterns.
- The `HSET` with multiple field-value pairs in the token bucket script requires Redis >= 4.0.
