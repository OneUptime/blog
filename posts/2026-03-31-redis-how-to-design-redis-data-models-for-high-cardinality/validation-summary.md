# Validation Summary: How to Design Redis Data Models for High Cardinality

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (7+ with listpack encoding references)
- Python (redis-py client library)
- Redis CLI tools (redis-cli --hotkeys, --bigkeys)
- Redis data structures: Hashes, Sorted Sets, HyperLogLog, Bitmaps
- Redis configuration (active defragmentation, listpack thresholds)

## Sources Consulted
- Redis 7.2 redis.conf (https://raw.githubusercontent.com/redis/redis/7.2/redis.conf) - for default config values
- Redis 7.4 redis.conf (https://raw.githubusercontent.com/redis/redis/7.4/redis.conf) - for listpack/zset defaults
- Redis HSET command documentation (https://redis.io/docs/latest/commands/hset/) - variadic HSET since 4.0
- Redis MEMORY USAGE command documentation (https://redis.io/docs/latest/commands/memory-usage/)
- Redis HyperLogLog documentation (https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/) - 12KB, 0.81% error
- Redis CLI documentation (https://redis.io/docs/latest/develop/tools/cli/) - --hotkeys requires LFU policy
- redis-py client documentation (https://redis.io/docs/latest/develop/clients/redis-py/) - hset mapping parameter

## Issues Found

1. **Hash bucket size contradicted ziplist/listpack claim (Pattern 2)**: `HASH_BUCKET_SIZE` was set to 1000, but the accompanying comment stated "Redis hash compression kicks in for hashes with < 128 fields (ziplist encoding)." With 1000 entries per bucket, hashes would exceed the default `hash-max-listpack-entries` threshold (512 in Redis 7+), so the compact listpack encoding would NOT be used. Changed `HASH_BUCKET_SIZE` from 1000 to 100 so buckets stay below the threshold and actually benefit from compact encoding. Updated the comment from "10,000 hash keys" to "100,000 hash keys" accordingly.

2. **Incorrect listpack threshold in comment**: The comment stated "< 128 fields" as the threshold for compact hash encoding. The default `hash-max-listpack-entries` in Redis 7+ is 512, not 128. Updated the comment to reference "hash-max-listpack-entries (default 512)" for accuracy.

3. **Outdated terminology (ziplist vs listpack)**: Multiple references to "ziplist encoding" were updated to "listpack encoding" since Redis 7+ uses listpack as the internal encoding name. The config directives are `hash-max-listpack-entries` and `hash-max-listpack-value`, not the older ziplist names. Updated the explanatory text and config comments to use correct terminology while noting the older name for context.

4. **Incorrect docstring in `get_time_bucket`**: The docstring said "Round timestamp to nearest bucket boundary" but the function uses floor division (`//`), which floors to the bucket start, not rounds. Changed to "Floor timestamp to bucket boundary."

## Review Notes
- The `redis-cli --hotkeys` command requires `maxmemory-policy` to be set to an LFU policy (`allkeys-lfu` or `volatile-lfu`). The post doesn't mention this prerequisite. This is not incorrect but could cause confusion for readers.
- The `zrangebyscore` method used in Pattern 3 still works in redis-py but is considered legacy; newer redis-py versions prefer `zrange` with `byscore=True`. Not changed since it's not technically wrong.
- The post's recommended config sets `hash-max-listpack-entries 128`, which is below the default of 512. This is a valid tuning choice for memory optimization but readers should be aware they're lowering the default.
