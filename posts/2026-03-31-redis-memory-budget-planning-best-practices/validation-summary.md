# Validation Summary: Redis Memory Budget Planning Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (7.0+ / 7.2+)
- Redis CLI (`redis-cli`, `INFO memory`, `MEMORY USAGE`, `OBJECT ENCODING`)
- Redis configuration (`redis.conf`)
- Redis replication and memory management

## Sources Consulted
- Official Redis `redis.conf` for 7.0 and 7.2 branches (https://github.com/redis/redis/blob/7.2/redis.conf)
- Redis `INFO memory` documentation (https://redis.io/docs/latest/commands/info/)
- Redis `MEMORY USAGE` documentation (https://redis.io/docs/latest/commands/memory-usage/)
- Redis `OBJECT ENCODING` documentation (https://redis.io/docs/latest/commands/object-encoding/)
- Redis `client-output-buffer-limit` documentation (https://redis.io/docs/latest/commands/config-set/)
- Redis data types and encodings internals (https://redis.io/docs/latest/develop/use/memory-optimization/)

## Issues Found

1. **`used_memory_rss` described as "always higher"**: Changed to "typically higher due to fragmentation." RSS can be lower than `used_memory` in cases where the OS swaps Redis memory to disk or certain allocator behaviors return memory differently.

2. **`OBJECT ENCODING` comment referenced "ziplist"**: Changed example comment from `(ziplist, hashtable, etc.)` to `(listpack, hashtable, etc.)`. In Redis 7.0+, ziplist was replaced by listpack, and `OBJECT ENCODING` returns "listpack" for compact hashes, sorted sets, etc.

3. **Invalid config directive `replica-output-buffer-size`**: Changed to `client-output-buffer-limit replica 256mb 64mb 60`. The directive `replica-output-buffer-size` does not exist in Redis. The correct directive for controlling replica output buffers is `client-output-buffer-limit replica <hard> <soft> <seconds>`.

4. **Hash encoding listed as "ziplist"**: Changed to "listpack" in the encoding thresholds table. This is consistent with Redis 7.0+ (where ziplist was replaced by listpack) and matches the `hash-max-listpack-entries` config directive shown later in the same section.

5. **List encoding thresholds were incorrect**: The original described lists as "listpack (up to 128 elements, each up to 64 bytes) vs quicklist" — the 128/64 values are hash and sorted set thresholds, not list thresholds. Lists in Redis 7.0+ use listpack for small lists and quicklist with listpack-encoded nodes for larger ones. The threshold is controlled by `list-max-listpack-size` (default -2, meaning 8kb per node). Updated to reflect accurate behavior.

6. **Sorted Set encoding missing value size limit**: Added "each up to 64 bytes" to the sorted set listpack description for completeness. The threshold is controlled by both `zset-max-listpack-entries` (128) and `zset-max-listpack-value` (64 bytes).

7. **Peak usage math had unexplained gap**: The calculation showed 3GB + 750MB = 3.75GB but jumped to ~5GB total without explanation. Added a "System and Redis overhead: ~1GB" line to account for OS memory, internal Redis overhead, and AOF rewrite buffers, making the math explicit.

## Review Notes
- The post targets Redis 7.0+ based on the use of `listpack` config directive names. The set-related `listpack` encoding (`set-max-listpack-entries`) is only available in Redis 7.2+. This is not explicitly noted in the post but is a minor version caveat.
- The 4GB RAM breakdown in the "Set maxmemory with a Safety Margin" section sums to exactly 4GB (500MB OS + 3GB data + 200MB overhead + 300MB AOF), leaving zero headroom. While the 70-75% guidance is sound, the specific example is tight. This is a presentation choice rather than a technical error.
- The `mem_fragmentation_ratio` threshold of 1.5 is a reasonable rule of thumb. Some sources use lower thresholds (e.g., 1.2-1.3) to trigger investigation, but 1.5 as a "indicates fragmentation" threshold is commonly cited.
