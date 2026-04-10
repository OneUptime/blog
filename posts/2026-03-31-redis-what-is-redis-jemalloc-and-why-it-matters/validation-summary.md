# Validation Summary: What Is Redis Jemalloc and Why It Matters

## Status
validated

## Post Type
Technical explainer / Reference guide

## Technologies Covered
- Redis (memory allocator internals, INFO memory metrics, active defragmentation)
- jemalloc 5.x (size classes, arenas, extents, MALLOC-STATS)
- glibc malloc (ptmalloc2, for comparison)
- Python (capacity estimation script)

## Sources Consulted
- jemalloc official documentation and source: https://github.com/jemalloc/jemalloc
- jemalloc origin history (FreeBSD, Jason Evans): https://github.com/jemalloc/jemalloc/wiki/Background
- Redis source code (zmalloc.c, defrag.c): https://github.com/redis/redis
- Redis INFO memory documentation: https://redis.io/commands/info/
- Redis MEMORY MALLOC-STATS documentation: https://redis.io/commands/memory-malloc-stats/
- Redis active defragmentation documentation: https://redis.io/docs/management/optimization/memory-optimization/
- jemalloc size class layout (5.x): https://jemalloc.net/jemalloc.3.html

## Issues Found

1. **jemalloc origin incorrectly attributed to Facebook** (line 17): The post stated jemalloc was "developed at Facebook." jemalloc was originally created by Jason Evans for FreeBSD and was later further developed at Facebook/Meta. Corrected to reflect the accurate origin.

2. **Arena-to-thread mapping described as 1:1** (line 44): The post stated arenas are maintained "one per CPU thread." In jemalloc 5.x, the default number of arenas is typically 4x the number of CPUs (on 64-bit systems), and threads are distributed across arenas in a round-robin fashion. Corrected to accurately describe the arena-to-thread relationship.

## Review Notes
- The jemalloc version shown (5.3.0) is accurate for recent Redis 7.x builds.
- The Python capacity estimation script uses reasonable approximations (10% jemalloc overhead, 64-byte per-key metadata, 25% RSS overhead) but actual overhead varies significantly depending on key/value sizes and data structures used. The script is appropriate as a rough estimate.
- The `active-defrag-cycle-max` default of 25 is a reasonable tuning value but operators should monitor CPU impact when enabling active defragmentation.
- The size class list is accurate for jemalloc 5.x small allocations.
