# Validation Summary: Redis OSS vs Redis Stack: Feature Comparison

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- Redis OSS (core data structures: strings, hashes, lists, sets, sorted sets, streams, pub/sub, HyperLogLog)
- Redis Stack
- RediSearch (full-text search, secondary indexing, vector search)
- RedisJSON (native JSON storage and path queries)
- RedisTimeSeries (time-series data with aggregations)
- RedisBloom (Bloom filters, Count-Min Sketch, Top-K)
- RedisGraph (mentioned as deprecated)
- Docker (for running Redis Stack)
- Python redis-py client

## Sources Consulted
- Redis official command documentation: https://redis.io/docs/latest/commands/
- Redis ZRANGE documentation (replacement for deprecated ZREVRANGE): https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE deprecation notice: https://redis.io/docs/latest/commands/zrevrange/
- RedisJSON JSON.SET and JSON.NUMINCRBY documentation: https://redis.io/docs/latest/commands/json.set/ and https://redis.io/docs/latest/commands/json.numincrby/
- RedisBloom documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/
- RedisTimeSeries documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- RediSearch FT.CREATE and FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis Stack Docker images: https://hub.docker.com/r/redis/redis-stack
- redis-py client documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Deprecated `ZREVRANGE` command (line 35)
- **What was wrong:** The post used `ZREVRANGE leaderboard 0 9 WITHSCORES`, which has been deprecated since Redis 6.2.0.
- **What was changed:** Replaced with `ZRANGE leaderboard 0 9 REV WITHSCORES`, the modern equivalent using the `REV` option of `ZRANGE`.
- **Why:** `ZREVRANGE` is deprecated and should not be shown in new content. The `ZRANGE` command with `REV` flag is the recommended replacement per official Redis documentation.

### 2. `JSON.NUMINCRBY` on non-existent path (line 61/64)
- **What was wrong:** The `JSON.SET` command created a document `{"name":"Alice","address":{"city":"NYC"},"tags":["admin"]}` without a `score` field, but a subsequent `JSON.NUMINCRBY user:123 $.score 10` attempted to increment `$.score`. With JSONPath syntax in RedisJSON 2.x, `NUMINCRBY` on a non-existent path returns `[null]` rather than creating the field, making the example misleading.
- **What was changed:** Added `"score":0` to the initial `JSON.SET` payload so the document includes the `score` field before the increment operation.
- **Why:** The example should demonstrate a working sequence of commands. Without the field present, the `NUMINCRBY` operation silently fails to produce a meaningful result.

## Review Notes
- The post correctly notes that RedisGraph is deprecated. RedisGraph was deprecated in January 2023 and removed from Redis Stack 7.2+.
- The comparison table parenthetical "BF.*" for the "Bloom / CMS / TopK" row is slightly imprecise since CMS commands use `CMS.*` prefix and Top-K uses `TOPK.*` prefix, not `BF.*`. However, they are all part of the RedisBloom module, and the Redis Stack column correctly attributes them to "RedisBloom", so this is acceptable.
- All other Redis CLI commands (SET, HSET, LPUSH, ZADD, XADD, FT.CREATE, FT.SEARCH, TS.CREATE, BF.RESERVE, CMS.INITBYDIM, TOPK.RESERVE, PFADD, etc.) are syntactically correct with valid arguments.
- The Python redis-py code uses the correct `r.json()` interface methods.
- Docker image names (`redis/redis-stack:latest`, `redis/redis-stack-server:latest`) and port mappings (6379 for Redis, 8001 for Redis Insight) are correct.
- The `loadmodule` directive and `--loadmodule` CLI flag for loading individual modules are correct.
