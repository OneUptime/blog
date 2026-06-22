# Validation Summary: How to Implement Sliding Window Rate Limiting in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Sliding window rate limiting
- Redis sorted sets
- Redis Lua scripting
- redis-py
- FastAPI
- Starlette middleware
- HTTP rate limit headers

## Sources Consulted
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- FastAPI advanced middleware documentation: https://fastapi.tiangolo.com/advanced/middleware/
- FastAPI error handling documentation: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Starlette exceptions documentation: https://starlette.dev/exceptions/
- RFC 9110 Retry-After header definition: https://datatracker.ietf.org/doc/html/rfc9110

## Issues Found
- The Redis `check()` method claimed to use `MULTI/EXEC` for atomic rate-limit enforcement, but it performed cleanup/count and add/expire in separate pipeline executions. This can race under concurrent requests. I changed the wording to say the method batches cleanup and count operations, and directs readers to `check_lua()` when the check and insert must be atomic.
- The Redis sorted-set member used `f"{now}:{id(self)}"` for uniqueness. That is not a robust unique member value for repeated requests in the same process. I changed it to use `uuid.uuid4()`.
- The Redis Lua script generated members with `math.random()`, which can collide and is not as reliable as passing a unique request ID from the client. I changed the script to use a unique value passed in `ARGV[4]`.
- The Redis Lua script returned floating-point timing values as Lua numbers. Redis converts Lua numeric return values to integer replies, truncating decimals. I changed `reset_after` and `retry_after` returns to strings so redis-py can parse them accurately as floats.
- `SlidingWindowCounter.get_usage()` called `check()`, which consumed a rate-limit slot while trying to report usage. I rewrote it to compute the weighted count directly without incrementing the current window counter.
- The denied-path retry estimate in `SlidingWindowCounter.check()` could return `0.1` seconds when the current fixed-window counter alone was already at the limit, even though another request should wait until the window advances. I adjusted the estimate to handle current-window saturation separately.
- The FastAPI examples converted fractional `retry_after` values with `int()`, which floors the value and can produce a `Retry-After` header that is too short. I changed those header values to use `math.ceil()`.
- The best-practices section described `RedisSlidingWindow` as a Redis counter, but the implementation uses a Redis sorted-set log. I changed the comment to describe it as Redis-backed rate limiting.

## Review Notes
The examples are syntactically valid Python when parsed as standalone snippets. Some snippets are intentionally presented as related files and assume earlier classes such as `RateLimitResult` and `RedisSlidingWindow` are available in the same project or imported from sibling modules.
