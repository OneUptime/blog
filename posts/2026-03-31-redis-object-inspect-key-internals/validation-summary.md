# Validation Summary: How to Use OBJECT in Redis to Inspect Key Internals

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (OBJECT command family: ENCODING, REFCOUNT, IDLETIME, FREQ, HELP)
- Redis internal data structures (listpack, skiplist, int encoding, shared objects)
- Redis eviction policies (LRU, LFU)

## Sources Consulted
- Redis official documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis official documentation: https://redis.io/docs/latest/commands/object-refcount/
- Redis official documentation: https://redis.io/docs/latest/commands/object-idletime/
- Redis official documentation: https://redis.io/docs/latest/commands/object-freq/
- Redis official documentation: https://redis.io/docs/latest/commands/object-help/
- Redis source code (src/server.h, src/object.c) for shared integer pool and refcount constants

## Issues Found
No technical issues found.

## Review Notes
- The shared integer refcount value of 2147483647 (INT_MAX) is correct for Redis 7.2 and earlier stable releases. In the Redis development branch (post-7.4), `OBJ_SHARED_REFCOUNT` was changed to 8388607 due to an object struct redesign. If this ships in a future stable release, the example output may need updating.
- OBJECT FREQ is described as "only meaningful" with LFU policies. Technically, it returns an error (`ERR An LFU maxmemory policy is not selected`) when an LFU policy is not active. The current wording is acceptable but understates the restriction slightly.
- OBJECT FREQ returns a logarithmic access frequency counter, not a raw access count. The post does not claim otherwise, but readers may benefit from knowing the counter is approximate and logarithmic.
- The `listpack` encodings shown are correct for Redis 7.0+. Readers on Redis 6.2 or earlier would see `ziplist` instead.
- OBJECT IDLETIME (and all OBJECT subcommands) use a `LOOKUP_NOTOUCH` flag internally, meaning they do not update the key's last access time. This is a useful detail not mentioned in the post but not an error.
