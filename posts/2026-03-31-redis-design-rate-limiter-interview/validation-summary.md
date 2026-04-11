# Validation Summary: How to Design a Rate Limiter Using Redis in a System Design Interview

## Status
validated

## Post Type
Tutorial / Interview Preparation Guide

## Technologies Covered
- Redis (INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, HMGET, HSET, EXPIRE)
- Redis Lua scripting
- Rate limiting algorithms (Fixed Window Counter, Sliding Window Log, Token Bucket)
- Redis Cluster (mentioned for distributed rate limiting)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis EXPIRE command documentation: https://redis.io/commands/expire
- Redis ZADD command documentation: https://redis.io/commands/zadd
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/commands/zremrangebyscore
- Redis ZCARD command documentation: https://redis.io/commands/zcard
- Redis HSET command documentation (variadic form since Redis 4.0): https://redis.io/commands/hset
- Redis HMGET command documentation: https://redis.io/commands/hmget
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- Redis benchmarks: https://redis.io/docs/management/optimization/benchmarks/

## Issues Found
1. **Throughput claim overstated (line 78)**: The post claimed "A single Redis node can handle millions of operations per second." For a rate limiter workload where each API request triggers one Redis call (no pipelining), Redis benchmarks show ~100K–500K ops/sec on a single node. "Millions" is only achievable with pipelining or multi-threaded I/O configurations. Changed "millions" to "hundreds of thousands" to accurately reflect non-pipelined, single-request throughput.

## Review Notes
- The Fixed Window Counter example calls EXPIRE on every request, which resets the TTL each time. Since the key name includes the window timestamp, this is not a correctness issue (old windows won't be queried), but in production you would only set EXPIRE when INCR returns 1 (key was just created) to avoid the unnecessary call. This is an optimization detail, not an error.
- The Fixed Window INCR + EXPIRE sequence is not atomic. If the process crashes between the two commands, the key could persist without a TTL. In production, a Lua script or checking INCR's return value (set EXPIRE only when it returns 1) would be safer. The post presents this as a starting point and upgrades to Lua later, so this is acceptable in context.
- The variadic HSET in the Lua script (setting multiple field-value pairs in one call) requires Redis 4.0+, released in 2017. This is standard for any modern Redis deployment.
- The sliding window timestamp arithmetic is correct: 1711900045.123 - 60 = 1711899985.123.
- The token bucket Lua script correctly handles first-run initialization via `or capacity` / `or now` fallbacks when HMGET returns nil values.
