# Validation Summary: How to Reduce Redis Memory Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis CLI
- Redis configuration
- Node.js
- ioredis
- zlib
- MessagePack / msgpack-lite

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis MEMORY STATS command documentation: https://redis.io/docs/latest/commands/memory-stats/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis GETEX command documentation: https://redis.io/docs/latest/commands/getex/
- Redis CLI documentation for `--bigkeys` and `--memkeys`: https://redis.io/docs/latest/develop/tools/cli/
- ioredis official GitHub documentation: https://github.com/redis/ioredis
- msgpack-lite official GitHub documentation: https://github.com/kawanet/msgpack-lite

## Issues Found
- The post described small hashes as using `ziplist` encoding and showed `hash-max-ziplist-*` as the active defaults. Redis 7.0+ uses listpack configuration names (`hash-max-listpack-entries` and `hash-max-listpack-value`), while the ziplist names apply to Redis 6.2 and earlier. Updated the explanations and config comments to reflect current Redis versions while preserving the older names as a version note.
- The ioredis `hset()` examples passed a JavaScript object directly. ioredis documents built-in object argument transformation for `hmset`, not `hset`, so this can send incorrect arguments. Updated the examples to pass explicit field/value pairs to `hset()`.
- The TTL refresh example used a pipeline and described it as atomic. ioredis pipelines batch commands but are not the same as a single Redis command or transaction. Replaced the pipeline with Redis `GETEX`, available since Redis 6.2, to fetch the value and refresh expiration in one command.
- The eviction policy list omitted current Redis LRM policies. Added `volatile-lrm` and `allkeys-lrm` to keep the configuration snippet current.

## Review Notes
- The remaining Redis CLI commands, memory introspection commands, `maxmemory` configuration, `maxmemory-policy allkeys-lru`, `maxmemory-samples`, TTL commands, ioredis binary `getBuffer()` usage, Node.js `zlib` usage, and msgpack-lite `encode()` / `decode()` usage are technically correct.
- The quoted memory savings and per-key overhead figures are reasonable directional estimates, but actual savings depend on Redis version, allocator, object sizes, encoding thresholds, persistence/replication buffers, and workload shape.
