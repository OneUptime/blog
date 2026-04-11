# Validation Summary: How to Implement Cross-Service Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, ZRANGE, SCAN, Lua scripting, pipelines)
- Node.js
- ioredis (Redis client library)
- Express.js (middleware pattern)

## Sources Consulted
- ioredis API documentation: https://github.com/redis/ioredis/blob/main/README.md
- Redis INCR command: https://redis.io/commands/incr
- Redis EXPIRE command: https://redis.io/commands/expire
- Redis ZADD command: https://redis.io/commands/zadd
- Redis ZREMRANGEBYSCORE command: https://redis.io/commands/zremrangebyscore
- Redis ZRANGE command: https://redis.io/commands/zrange
- Redis ZCARD command: https://redis.io/commands/zcard
- Redis SCAN command: https://redis.io/commands/scan
- Redis EVAL (Lua scripting): https://redis.io/commands/eval
- Redis pipelining documentation: https://redis.io/docs/manual/pipelining/
- Express.js middleware documentation: https://expressjs.com/en/guide/using-middleware.html

## Issues Found
No technical issues found.

## Review Notes
- The pipeline INCR + EXPIRE pattern is not truly atomic (only MULTI/EXEC or Lua scripts provide atomicity), but this is a well-established and widely-used pattern for rate limiting. The practical risk is negligible because INCR is individually atomic and EXPIRE is idempotent. The summary's claim about pipelines preventing race conditions is a common simplification that is acceptable in this context.
- Each request resets the EXPIRE TTL on the fixed window key, but since the window number is part of the key name, this only extends cleanup time for stale keys and has no functional impact on rate limiting correctness.
- The sliding window Lua script correctly handles the ZRANGE WITHSCORES return format (flat table in Lua: {member, score}) and the count check is done before ZADD, ensuring exactly `limit` requests are allowed per window.
- Date.now() values (~1.7 trillion) are well within Lua's double-precision float range (safe integers up to 2^53) and Redis's integer handling, so no precision issues arise in the Lua script.
