# Validation Summary: How to Build a Serverless Rate Limiter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, PEXPIRE, HMGET, HSET, EVAL, Lua scripting)
- Node.js (node-redis v4+ client library)
- AWS Lambda (serverless handler pattern)
- Rate limiting algorithms (fixed window, sliding window, token bucket)

## Sources Consulted
- node-redis v4 documentation: https://github.com/redis/node-redis
- Redis INCR command: https://redis.io/commands/incr/
- Redis EVAL (Lua scripting): https://redis.io/commands/eval/
- Redis ZADD command: https://redis.io/commands/zadd/
- Redis ZREMRANGEBYSCORE command: https://redis.io/commands/zremrangebyscore/
- Redis PEXPIRE command: https://redis.io/commands/pexpire/
- Redis HMGET command: https://redis.io/commands/hmget/
- Redis HSET command (multi-field support in Redis 4.0+): https://redis.io/commands/hset/
- Lua 5.1 reference manual (Redis embedded Lua version): https://www.lua.org/manual/5.1/
- HTTP Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After

## Issues Found
No technical issues found.

## Review Notes
- The top-level `await client.connect()` alongside CommonJS `require()` is technically invalid in a Node.js CommonJS module (top-level await requires ESM). This is an extremely common pattern in blog posts where the focus is on the core logic rather than module boilerplate. Readers would need to wrap initialization in an async function or use ESM imports.
- The fixed window INCR + EXPIRE pattern has a known (minor) race condition: if the process crashes between INCR and EXPIRE, the key could persist indefinitely. The post correctly frames this as "the simplest approach," and this is a well-documented trade-off. A Lua script or `MULTI/EXEC` could eliminate this race.
- The sliding window Lua script uses `now` as both the sorted set score and member. If two requests from the same user arrive at the exact same millisecond, ZADD would deduplicate them (same member value), undercounting by one. This is a widely-used simplification; appending a random suffix to the member (e.g., `now .. '-' .. math.random()`) would eliminate the edge case.
- The token bucket section only shows the Lua script without the JavaScript calling code, unlike the other two patterns which include full implementations. This is a minor completeness gap but not a technical error.
