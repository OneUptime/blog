# Validation Summary: How Redis jemalloc Memory Allocator Works

## Status
validated

## Post Type
Technical explainer / Guide

## Technologies Covered
- Redis 7.2.0
- jemalloc 5.3.0
- Linux memory management

## Sources Consulted
- jemalloc 5.0.0 release notes — https://github.com/jemalloc/jemalloc/releases/tag/5.0.0 (confirmed "Huge" class removal)
- jemalloc 5.3.0 source: `include/jemalloc/internal/sc.h` — https://github.com/jemalloc/jemalloc/blob/5.3.0/include/jemalloc/internal/sc.h (size class boundaries)
- jemalloc 5.3.0 public API: `include/jemalloc/jemalloc_protos.h.in` — https://github.com/jemalloc/jemalloc/blob/5.3.0/include/jemalloc/jemalloc_protos.h.in (confirmed no `je_mallopt` or `JEMALLOC_PURGE`)
- Redis 7.2.0 source: `src/zmalloc.c` — https://github.com/redis/redis/blob/7.2.0/src/zmalloc.c (confirmed `jemalloc_purge()` uses `je_mallctl`)
- jemalloc Wiki: Heap Profiling — https://github.com/jemalloc/jemalloc/wiki/Use-Case:-Heap-Profiling (profiling requires `--enable-prof`, not a debug build)
- Redis documentation on MEMORY PURGE — https://redis.io/docs/latest/commands/memory-purge/
- Redis documentation on INFO memory — https://redis.io/docs/latest/commands/info/

## Issues Found

1. **jemalloc size classes incorrectly listed three categories including "Huge"**: jemalloc 5.0 merged the "Huge" class into "Large". Since the post references jemalloc 5.3.0, there are only two size classes: Small (8 bytes to ~14KB, slab-allocated) and Large (16KB and above, individually allocated as extents). Fixed the size class table to reflect jemalloc 5.x nomenclature.

2. **Non-existent `JEMALLOC_PURGE` API referenced**: The post claimed "jemalloc exposes `JEMALLOC_PURGE` to return free pages to the OS." No such API exists in jemalloc. The correct mechanism is the `je_mallctl("arena.<N>.purge", ...)` interface. Fixed to reference the actual API.

3. **Non-existent `je_mallopt(M_PURGE, 0)` function call**: The post claimed MEMORY PURGE "calls `je_mallopt(M_PURGE, 0)` internally." Neither `je_mallopt` nor `M_PURGE` exist in jemalloc. Redis's `jemalloc_purge()` function (in `src/zmalloc.c`) calls `je_mallctl("arena.<N>.purge", ...)`. Fixed to reference the actual implementation.

4. **Incorrect prerequisite for jemalloc heap profiling**: The post stated profiling "requires a debug build." jemalloc profiling requires compilation with `--enable-prof`, which is independent of debug builds (`--enable-debug`). Profiling can be used in production/release builds with minimal overhead. Fixed to state the correct requirement.

## Review Notes
- The `MALLOC_CONF` profiling example and `MEMORY MALLOC-STATS` command are correct.
- The active defragmentation config directives are correct and current for Redis 7.x.
- The `make MALLOC=libc` and `make MALLOC=tcmalloc` build options are correct.
- The fragmentation ratio explanation (1.5 threshold) is a reasonable rule of thumb, though the specific threshold is a guideline rather than a hard rule.
- The post could mention that `MEMORY MALLOC-STATS` prints jemalloc's internal statistics but does not produce heap profile dumps (those require `jeprof` or similar tools), though this is a minor clarification rather than an error.
