# Validation Summary: How to Build a Hotel Availability Cache with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, hashes, sets, Lua scripting, SET NX)
- Python (redis-py client library)
- JSON (cjson in Lua, json module in Python)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis HSET documentation: https://redis.io/commands/hset
- Redis SET documentation (NX/EX options): https://redis.io/commands/set
- Redis ZRANGEBYSCORE documentation: https://redis.io/commands/zrangebyscore
- Redis Lua scripting (EVAL): https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis cjson library in Lua: https://redis.io/docs/latest/develop/interact/programmability/lua-api/#cjson-library
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py Script (register_script) API: https://redis-py.readthedocs.io/en/stable/advanced_features.html#lua-scripting
- redis-py error handling for Lua error replies

## Issues Found
- **Bug in `confirm_reservation`: unhandled `ResponseError` from Lua error replies.** The Lua confirmation script uses `redis.error_reply('HOLD_EXPIRED')` and `redis.error_reply('INVALID_HOLD')` to signal failure cases. In redis-py, these error replies are raised as `redis.exceptions.ResponseError` exceptions, not returned as values. The `confirm_reservation` function compared the result to `"CONFIRMED"` but never caught the exception, meaning the function would crash with an unhandled exception instead of returning `False` for expired or invalid holds. Fixed by wrapping the script call in a `try/except redis.exceptions.ResponseError` block that returns `False`.

## Review Notes
- `zrangebyscore()` is deprecated in redis-py 5.x in favor of `zrange(key, min, max, byscore=True, offset=0, count=10)`. The deprecated method still works but may be removed in a future version. Not changed since the code is functional and the deprecated API is more readable for a tutorial context.
- The `time` module is imported but never used in the code examples. This is a minor cosmetic issue, not a functional bug.
- The `get_hotels_in_city` function's return type annotation says `-> list` but `smembers` returns a `set`. This doesn't cause runtime issues since both are iterable, but the annotation is slightly inaccurate.
- The hold mechanism does not remove the room from the availability sorted set when a hold is placed, meaning held rooms still appear in search results. Other users who try to hold the same room will fail (due to SET NX), but it could be confusing from a UX perspective. This is a valid design trade-off, not a bug.
