# Validation Summary: How Redis Handles maxmemory with Different Data Types

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (7.0+ / 7.2+ features referenced)
- Redis CLI
- Redis memory management and eviction policies
- Redis data type encodings (listpack, intset, quicklist, skiplist, hashtable)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/latest/develop/reference/optimization/memory-optimization/
- Redis official documentation on eviction policies: https://redis.io/docs/latest/develop/reference/eviction/
- Redis official documentation on data types and encodings: https://redis.io/docs/latest/develop/data-types/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis 7.0 release notes (listpack replacing ziplist)
- Redis 7.2 release notes (listpack encoding for sets)
- Redis source code (object.c) for embstr threshold of 44 bytes

## Issues Found

1. **Lists encoding description was incorrect**: The post stated "Lists: use listpack for small lists, quicklist for larger ones." This is wrong. In Redis 7.0+, lists always use quicklist encoding — there is no standalone listpack encoding for lists. Quicklist nodes internally use listpack as their storage format. Changed to: "Lists: use quicklist encoding, which internally stores data in listpack nodes."

2. **Sets encoding description was incorrect**: The post stated "Sets: use listpack for small integer sets, hashtable for larger ones." This conflates listpack with intset. Small integer-only sets use intset encoding, not listpack. In Redis 7.2+, small non-integer or mixed sets use listpack, and larger sets use hashtable. Changed to: "Sets: use intset for small integer-only sets, listpack for small sets (Redis 7.2+), hashtable for larger ones."

## Review Notes
- The eviction policy list is intentionally non-exhaustive (omits `volatile-random`, `volatile-ttl`, and `noeviction`), which is fine since it's illustrative rather than a reference.
- The `DEBUG OBJECT` command may be disabled or restricted in production Redis deployments and Redis Cloud. Users should be aware it requires debug access.
- The monitoring script uses `SAMPLES 0` which performs an exact memory calculation by scanning all elements. This is accurate but can be expensive on large keys. Acceptable for a diagnostic script.
