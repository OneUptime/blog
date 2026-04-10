# Validation Summary: How to Use OBJECT ENCODING in Redis to Check Internal Encoding

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (7.0+ and 7.2+ features)
- OBJECT ENCODING command
- Redis internal data structure encodings (int, embstr, raw, listpack, quicklist, hashtable, intset, skiplist)
- Redis configuration tuning for memory optimization

## Sources Consulted
- Redis official OBJECT ENCODING documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis memory optimization guide: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis 7.2 redis.conf defaults (GitHub): https://github.com/redis/redis/blob/7.2/redis.conf
- Redis source code for encoding thresholds and transition logic

## Issues Found

1. **Incorrect default for `hash-max-listpack-entries`**: The post listed the default as `128`, but the actual Redis default is `512`. The value `128` is the default for `zset-max-listpack-entries` and `set-max-listpack-entries` — the values were confused. Fixed to `512`.

2. **Incorrect list encoding threshold description**: The post stated lists convert from `listpack` to `quicklist` when exceeding "128 elements or 64-byte values by default." This is incorrect — those are hash/zset thresholds. List encoding is controlled by `list-max-listpack-size` (default `-2`, meaning 8 KB per listpack node). Fixed the description to reference the correct threshold.

## Review Notes
- The set `listpack` encoding and its associated config parameters (`set-max-listpack-entries`, `set-max-listpack-value`) were introduced in Redis 7.2, not Redis 7.0. The post does not specify a Redis version for sets, which is acceptable but readers on Redis 7.0 will not see `listpack` encoding for sets.
- The `int` encoding covers the full signed 64-bit range (-2^63 to 2^63-1), not just positive integers. The post says "up to 2^63-1" which is technically correct for the upper bound but omits the negative range. This is a minor simplification, not an error.
- All code examples use correct Redis command syntax and would produce the expected outputs.
- The mermaid diagram accurately represents the encoding relationships.
