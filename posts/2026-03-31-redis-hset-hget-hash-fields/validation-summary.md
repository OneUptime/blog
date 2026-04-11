# Validation Summary: How to Use HSET and HGET in Redis for Hash Field Operations

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (HSET, HGET commands)
- Redis Hash data structure
- Redis compact encodings (ziplist/listpack)

## Sources Consulted
- Redis official documentation for HSET: https://redis.io/commands/hset
- Redis official documentation for HGET: https://redis.io/commands/hget
- Redis official documentation on hash encoding and `hash-max-listpack-entries` / `hash-max-listpack-value` configuration directives
- Redis 4.0 release notes (variadic HSET addition)

## Issues Found
- **Incorrect threshold phrasing for listpack encoding**: The post stated "fewer than 128 fields and values under 64 bytes each." The default `hash-max-listpack-entries` is 128 and the threshold is inclusive (<= 128), so "fewer than 128" (which means < 128, i.e., up to 127) was off by one. Similarly, "under 64 bytes" (< 64) should be "no longer than 64 bytes" (<= 64). Changed to "no more than 128 fields and values no longer than 64 bytes each."

## Review Notes
- The post correctly notes that variadic HSET was introduced in Redis 4.0.0 and that HMSET was required before that. HMSET is now deprecated but still functional.
- All code examples produce the correct output as shown.
- The ziplist/listpack dual mention is accurate: ziplist was used before Redis 7.0, listpack from 7.0 onward. The configuration parameter names also changed (`hash-max-ziplist-entries` became `hash-max-listpack-entries`), but the post doesn't go into that level of detail, which is fine for a tutorial focused on HSET/HGET usage.
- The O(1) time complexity claim for hash field access is consistent with official Redis documentation.
