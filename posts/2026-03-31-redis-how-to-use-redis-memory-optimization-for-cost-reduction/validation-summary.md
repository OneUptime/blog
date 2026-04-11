# Validation Summary: How to Use Redis Memory Optimization for Cost Reduction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (7.x with notes on 6.x compatibility)
- Python (redis-py client library)
- zlib compression
- Redis CLI commands (INFO, MEMORY USAGE, OBJECT ENCODING, CONFIG SET, --bigkeys)
- Redis configuration directives (listpack thresholds, active defragmentation)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis 7.2 default redis.conf for config directive names and defaults
- redis-py source code (GitHub): https://github.com/redis/redis-py — verified `object()` method API
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis OBJECT command documentation: https://redis.io/docs/latest/commands/object-idletime/
- Redis active defragmentation documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/#active-defragmentation

## Issues Found

1. **`hash-max-listpack-entries` default was stated as 128, but it is 512 in Redis 7.x.** The post claimed the default was 128, which is only correct for Redis 6.x (`hash-max-ziplist-entries`). Updated the comment and description to note both defaults (128 for Redis 6.x, 512 for Redis 7.x).

2. **Duplicate list encoding config directives.** The post listed both `list-max-listpack-size -2` and `list-max-ziplist-size -2` in the same config block. These are the same setting under different names (old vs. new). Removed the duplicate and added a parenthetical noting the old name for pre-7.0 Redis.

3. **`r.object_idletime(key)` does not exist in redis-py.** The standard redis-py API uses `r.object("idletime", key)`. Fixed the method call in the Step 8 code example.

4. **Unused `import time` in Step 8.** The `time` module was imported but never used in the code block. Removed the unused import.

5. **Division by zero in TTL audit script.** If no keys matched the scan pattern, `total` would be 0 and the final `100*no_ttl/total` expression would raise a `ZeroDivisionError`. Added a guard to check `total > 0` before calculating the percentage.

## Review Notes
- The `OBJECT IDLETIME` command used in Step 8 requires that Redis is not using an LFU-based eviction policy (`allkeys-lfu` or `volatile-lfu`). This is a valid caveat that could be mentioned but is not incorrect as written.
- The `set-max-listpack-entries` and `set-max-listpack-value` directives were introduced in Redis 7.2. The post does not specify a minimum Redis version, which could cause confusion for users on older versions.
- Compression ratios of "4:1 to 10:1" for JSON are reasonable but will vary widely depending on data characteristics. The claim is acceptable as a general guideline.
- The memory savings percentages in the summary table are reasonable approximations consistent with Redis documentation and community benchmarks.
