# Validation Summary: How Redis Object Encoding System Works

## Status
validated

## Post Type
Reference / Technical Explainer

## Technologies Covered
- Redis (7.0+ / 7.2+ for set listpack encoding)
- Redis CLI (`OBJECT ENCODING`, `CONFIG GET/SET`, `MEMORY USAGE`)
- ioredis (Node.js Redis client)
- JavaScript (Node.js)

## Sources Consulted
- Redis official documentation on OBJECT ENCODING command: https://redis.io/commands/object-encoding/
- Redis official documentation on data types and encodings: https://redis.io/docs/latest/develop/data-types/
- Redis source code (`src/object.c`, `src/t_set.c`) for encoding conversion behavior
- Redis configuration documentation for `hash-max-listpack-entries`, `set-max-intset-entries`, `set-max-listpack-entries`, `zset-max-listpack-entries`, `list-max-listpack-size`
- ioredis documentation for the `object()` method API

## Issues Found
1. **Set encoding after adding non-integer to intset (line 137)**: The post claimed that adding a non-integer member ("string") to a small intset (containing 5 integers) would convert it to `hashtable`. This is incorrect for Redis 7.2+, which the post targets (evidenced by its use of `listpack` encoding for sets and the `set-max-listpack-entries` config parameter). In Redis 7.2+, when a non-integer is added to an intset and the total element count (6) is still below `set-max-listpack-entries` (default 128), the encoding converts to `listpack`, not `hashtable`. Fixed the expected output from `hashtable` to `listpack` with a clarifying comment.

## Review Notes
- The post consistently uses Redis 7.0+ terminology (`listpack` instead of `ziplist`), which is correct for modern Redis. Readers using Redis 6.x or earlier would see `ziplist` instead of `listpack` for compact encodings of lists, hashes, and sorted sets, and would not have `listpack` encoding for sets at all.
- The `list-max-listpack-size` description is slightly simplified. The config controls the max size of each listpack node within a quicklist, and a list reports as `listpack` when it fits in a single node. The post's description is functionally accurate from the user's perspective.
- The memory usage values (~120 bytes for listpack, ~400-600 bytes for hashtable) are reasonable approximations but will vary by Redis version, platform, and allocator.
