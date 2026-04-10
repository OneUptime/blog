# Validation Summary: How to Implement a Sliding Window Log in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, pipelines, Lua scripting, EXPIRE/TTL)
- Python (redis-py client library)
- Rate limiting algorithms (sliding window log vs. fixed window counter)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis ZCARD documentation: https://redis.io/docs/latest/commands/zcard/
- Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/
- Redis EXPIRE documentation: https://redis.io/docs/latest/commands/expire/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py `register_script` API: https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.core.CoreCommands.register_script

## Issues Found
1. **Pipeline version logged rejected requests (lines 29-41):** The `is_allowed` function used a pipeline that unconditionally executed `zadd` for every request, including those that exceeded the rate limit. Since all commands in a Redis pipeline execute regardless, rejected requests were added to the sorted set, inflating the count and potentially blocking users longer than intended. **Fix:** Moved the `zadd` and `expire` calls out of the pipeline and made them conditional — they now only execute when `count_in_window < limit`. The Lua script version already handled this correctly with a conditional check.

## Review Notes
- The pipeline version still has an inherent race condition between the `zcard` check and the `zadd` — two concurrent requests could both pass the check simultaneously. The post correctly addresses this by offering the Lua script as the atomic alternative for "strict consistency," so this is a known and documented tradeoff, not a bug.
- Using `str(now)` as the sorted set member means two requests at the exact same `time.time()` value would collide (the second overwrites the first). This is extremely unlikely in practice and is an acceptable tradeoff.
- The `get_quota` function calls `zremrangebyscore`, `zcard`, and `zrange` as separate non-pipelined commands. This could be optimized with a pipeline for fewer round-trips, but is functionally correct.
- All Redis commands (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`, `ZRANGE`, `EXPIRE`) are used with correct syntax and arguments.
- The redis-py API usage (`pipeline()`, `zadd` mapping syntax, `register_script`, `zrange` with `withscores=True`) is correct for current versions.
