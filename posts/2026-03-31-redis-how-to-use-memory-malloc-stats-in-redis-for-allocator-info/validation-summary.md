# Validation Summary: How to Use MEMORY MALLOC-STATS in Redis for Allocator Info

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (MEMORY MALLOC-STATS, MEMORY DOCTOR, MEMORY PURGE, INFO memory, MEMORY USAGE commands)
- jemalloc memory allocator
- Python redis-py client library
- Active defragmentation (CONFIG SET activedefrag)

## Sources Consulted
- Redis official documentation for MEMORY MALLOC-STATS: https://redis.io/docs/latest/commands/memory-malloc-stats/
- Redis official documentation for MEMORY DOCTOR: https://redis.io/docs/latest/commands/memory-doctor/
- Redis official documentation for MEMORY PURGE: https://redis.io/docs/latest/commands/memory-purge/
- Redis official documentation for INFO: https://redis.io/docs/latest/commands/info/
- jemalloc documentation and stats output format: https://jemalloc.net/
- redis-py source code (v7.0.1) for `memory_malloc_stats()` method signature

## Issues Found
1. **Python API call was incorrect**: The blog used `r.memory('malloc-stats')` to call MEMORY MALLOC-STATS via redis-py. There is no generic `memory()` method on the Redis client in redis-py. The correct method is `r.memory_malloc_stats()`. Fixed the call on the Python example accordingly.

## Review Notes
- The jemalloc output examples (arena stats, bin stats, version info) are representative and consistent with jemalloc 5.x output format.
- The field descriptions for `pactive`, `pdirty`, `pmuzzy`, `mapped`, and `resident` are accurate.
- The fragmentation diagnosis guidance (ratio > 1.5 being high) aligns with commonly accepted Redis operational thresholds.
- The MEMORY DOCTOR example comment shows a paraphrased version of the actual Redis output message; the exact wording varies by Redis version but the concept is correctly conveyed.
- All Redis commands referenced (MEMORY MALLOC-STATS, MEMORY DOCTOR, MEMORY PURGE, MEMORY USAGE, INFO memory, CONFIG SET activedefrag) are valid and correctly described.
