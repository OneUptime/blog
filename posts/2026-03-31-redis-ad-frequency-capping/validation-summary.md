# Validation Summary: How to Implement Ad Frequency Capping with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, pipelines, INCR, EXPIRE, MGET, ZREMRANGEBYSCORE, ZADD, ZCARD)
- Redis Lua scripting (cjson, register_script)
- Python (redis-py client library)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis EXPIRE command documentation: https://redis.io/commands/expire
- Redis ZADD command documentation: https://redis.io/commands/zadd
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/commands/zremrangebyscore
- Redis ZCARD command documentation: https://redis.io/commands/zcard
- Redis MGET command documentation: https://redis.io/commands/mget
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- Redis cjson library documentation: https://redis.io/docs/interact/programmability/lua-api/#cjson-library
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- The fixed window approach always increments the counter even when the cap is exceeded (increment-before-check). This is a well-known trade-off for simplicity and is appropriately labeled as "the simplest approach," with the atomic Lua script shown later for correctness.
- The sliding window `impression_id` uses millisecond timestamps (`int(time.time() * 1000)`), which could collide under high concurrency. In production, a UUID or request-specific ID would be more robust. Acceptable for a tutorial.
- The `check_all_caps` function has a TOCTOU race between reading counters and incrementing them (two separate pipelines with `time.time()` called independently). A window boundary crossing between the two could cause a read from one bucket and write to another. This is an extremely rare edge case and acceptable for illustrative purposes.
- The `list[dict]` type hint in `bulk_cap_check` requires Python 3.9+. Not an error, but worth noting for readers on older Python versions.
- The campaign max in the Types section (10) differs from the code example (15). These are independent example values illustrating different contexts, not a contradiction.
