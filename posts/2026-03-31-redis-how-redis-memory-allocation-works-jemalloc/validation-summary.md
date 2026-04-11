# Validation Summary: How Redis Memory Allocation Works (jemalloc)

## Status
validated

## Post Type
Technical Guide / Deep Dive

## Technologies Covered
- Redis (memory subsystem, CLI commands)
- jemalloc 5.x (memory allocator)
- tcmalloc (mentioned as alternative)
- Linux memory management (RSS, mmap)

## Sources Consulted
- jemalloc official documentation and man pages — https://manpages.debian.org/unstable/libjemalloc-dev/jemalloc.3.en.html
- jemalloc GitHub repository and release notes (5.0.0 changelog) — https://github.com/jemalloc/jemalloc/releases
- jemalloc background / history — https://github.com/jemalloc/jemalloc/wiki/Background
- Redis GitHub repository, src/Makefile — https://github.com/redis/redis/blob/unstable/src/Makefile
- Redis active defragmentation PR #3720 — https://github.com/redis/redis/pull/3720
- Facebook Engineering blog on jemalloc — https://engineering.fb.com/2011/01/03/core-infra/scalable-memory-allocation-using-jemalloc/
- Redis official documentation for MEMORY commands — https://redis.io/commands/memory-stats/

## Issues Found

1. **jemalloc origin incorrectly attributed to Facebook**: The post stated jemalloc was "developed at Facebook." jemalloc was originally created by Jason Evans for FreeBSD. Facebook later adopted it and contributed to its development. Fixed to: "originally created by Jason Evans for FreeBSD and later further developed at Facebook (Meta)."

2. **Outdated three-tier allocation model (small/large/huge)**: The post described three allocation categories including a "huge" tier above 4 MB. This was the jemalloc 4.x model. In jemalloc 5.0 (the version Redis bundles, as the post itself shows with "jemalloc-5.3.0"), the huge category was merged into large. Fixed to describe the two-tier model (small/large) with a note about the pre-5.0 history.

3. **Incorrect default arena count**: The post stated "typically one per CPU core." jemalloc defaults to 4x the number of CPUs. Fixed to "typically four per CPU core."

4. **Arena layout diagram showed "huge extents"**: Updated the diagram to remove the nonexistent "huge" tier and reflect the jemalloc 5.x architecture (small bins + large extents).

5. **Incorrect tcmalloc build command**: The post used `make USE_TCMALLOC=yes`, which is a legacy compatibility shim. The canonical command is `make MALLOC=tcmalloc`. Fixed.

6. **Misleading active defragmentation description**: The post said active defrag lets "jemalloc reclaim fragmented memory." In reality, Redis itself scans the keyspace, uses jemalloc APIs to identify fragmented allocations, and reallocates them. jemalloc provides the introspection APIs but Redis is the active agent. Fixed the description.

## Review Notes
- The MEMORY STATS example output is simplified but representative. The actual output includes many more fields.
- The fragmentation ratio threshold of 1.5 is a commonly cited guideline but is context-dependent; some workloads tolerate higher ratios.
- The `MALLOC_CONF` environment variable tuning section is accurate and useful for production deployments.
- All Redis CLI commands (`INFO memory`, `MEMORY DOCTOR`, `MEMORY STATS`, `MEMORY MALLOC-STATS`) are correct and available since Redis 4.0+.
