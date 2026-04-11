# Validation Summary: How to Implement Counting with Expiration in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, INCRBY, EXPIRE, TTL, ZADD, ZCARD, ZREMRANGEBYSCORE, Lua scripting)
- Python (redis-py client library)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis EXPIRE command documentation: https://redis.io/commands/expire
- Redis ZADD command documentation: https://redis.io/commands/zadd
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- redis-py documentation (pipeline, register_script, zadd mapping API): https://redis-py.readthedocs.io/en/stable/
- Redis data type conversion table for Lua (GET returning false for non-existent keys): https://redis.io/docs/interact/programmability/lua-api/

## Issues Found
- **Unused `increment` parameter in `sliding_window_count`**: The function declared `increment: int = 1` as a parameter but never used it in the body. The sorted set sliding window approach adds exactly one member per call, so the parameter was misleading. Removed the unused parameter from the function signature.

## Review Notes
- The `seconds_until_midnight()` function calculates seconds until UTC midnight, not local midnight. This is acceptable but users in non-UTC timezones should be aware.
- The `increment_with_ttl` function resets the TTL on every call, meaning the key expires N seconds after the *last* increment, not the first. This is a valid pattern but behaves differently from the `record_failed_login` function which only sets TTL on the first increment.
- The Lua script correctly handles the case where `redis.call("GET", key)` returns `false` for non-existent keys, since Lua's `false or 0` evaluates to `0`.
- The sorted set sliding window pattern may undercount if multiple requests arrive within the same millisecond (same member name in ZADD overwrites rather than adding a new entry). This is a well-known limitation of the pattern.
- The `record_failed_login` function has a potential race condition between INCR and EXPIRE (if the process crashes between them, the key may persist without a TTL). This is a known limitation of the non-Lua approach and is acceptable for a blog tutorial.
