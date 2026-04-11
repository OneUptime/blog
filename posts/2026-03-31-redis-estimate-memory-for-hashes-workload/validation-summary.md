# Validation Summary: How to Estimate Redis Memory for Hashes Workload

## Status
validated

## Post Type
Tutorial / Capacity Planning Guide

## Technologies Covered
- Redis (7.0+ with listpack, and earlier versions with ziplist)
- Redis CLI (`HSET`, `MEMORY USAGE`, `OBJECT ENCODING`, `CONFIG GET/SET`)
- Python (estimation script)

## Sources Consulted
- Redis documentation on hash data type and encoding thresholds (https://redis.io/docs/latest/develop/data-types/hashes/)
- Redis configuration documentation for `hash-max-listpack-entries` and `hash-max-listpack-value` (https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/)
- Redis source code for dict/dictEntry structure and SDS string implementation
- Redis `MEMORY USAGE` command documentation (https://redis.io/docs/latest/commands/memory-usage/)

## Issues Found

1. **Incorrect Python function output comment (line 111)**: The expected output claimed `bytes_per_hash: 450` and `total_mb: 429.2`, but the actual function output is `bytes_per_hash: 460` and `total_mb: 438.7`. The correct math is: `70 + 10 * (11 + 8 + 20) = 70 + 390 = 460`. Fixed the comment to match the actual function output.

2. **Incorrect terminology in hashtable per-field cost breakdown (line 61)**: The post described per-field cost as including "16 (key robj) + 16 (val robj)". Redis hash fields stored in hashtable encoding use raw SDS (Simple Dynamic Strings), not `robj` (redisObject) wrappers. redisObject is used for top-level database keys, not for individual hash field entries within a dict. Fixed the description to reference SDS strings and adjusted the sub-component estimates to add up cleanly to the same ~104 byte total.

## Review Notes
- The memory estimates throughout the post (ziplist/listpack overhead ~70 bytes, per-field ~11 bytes; hashtable overhead ~120 bytes, per-field ~104 bytes) are reasonable conservative approximations for capacity planning purposes. Exact numbers vary by Redis version, jemalloc allocation size classes, and string lengths.
- The dictEntry component is listed as "~64 bytes (dictEntry + allocator)" which is on the high side (the struct is 24 bytes on 64-bit, typically allocated as 32 bytes by jemalloc), but as part of a conservative capacity planning estimate this is acceptable.
- The 5-10x memory ratio between hashtable and listpack encoding is a reasonable rule of thumb, though the exact ratio depends on field sizes and count.
- The default threshold values (128 entries, 64 bytes) are correct for both Redis 7+ (`hash-max-listpack-entries/value`) and Redis 6.x and earlier (`hash-max-ziplist-entries/value`).
- The post correctly notes the ziplist-to-listpack transition in Redis 7+.
