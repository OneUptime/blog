# Validation Summary: How to Implement GraphQL Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, INCR, EXPIRE, Lua scripting, pipelines)
- ioredis (Node.js Redis client)
- Apollo Server 4 (plugin lifecycle API)
- graphql-query-complexity (query complexity analysis)
- GraphQL (rate limiting patterns)

## Sources Consulted
- Apollo Server 4 plugin API documentation: https://www.apollographql.com/docs/apollo-server/integrations/plugins/
- ioredis API documentation: https://github.com/redis/ioredis
- Redis command reference for INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, ZRANGE, EVAL: https://redis.io/commands/
- graphql-query-complexity library: https://github.com/slicknode/graphql-query-complexity

## Issues Found
1. **Apollo Server plugin structure (lines 46-68):** `willSendResponse` was placed as a top-level property on the plugin object, alongside `requestDidStart`. In Apollo Server 4, `willSendResponse` is a request lifecycle hook that must be returned inside the object from `requestDidStart`, not at the plugin's top level. As written, the response header `X-RateLimit-Remaining` would never be set. Moved `willSendResponse` inside the return value of `requestDidStart`.

## Review Notes
- The Lua script accepts a `now` parameter (ARGV[3]) that is assigned but never used within the script. This is dead code but does not affect correctness.
- The fixed window rate limiter calls `EXPIRE` on every request, which is slightly redundant since the key already includes the window bucket. This is functionally correct and a common pattern.
- The complexity rate limiting section uses a non-atomic INCRBY + EXPIRE pattern which has a small race condition (if the process crashes between the two calls, the key may never expire). The post partially addresses this by covering Lua scripts for atomic operations in a later section.
