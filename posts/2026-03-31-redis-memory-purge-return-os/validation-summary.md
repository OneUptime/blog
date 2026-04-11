# Validation Summary: How to Use MEMORY PURGE in Redis to Return Memory to OS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (MEMORY PURGE command, available since Redis 4.0)
- jemalloc memory allocator
- Redis CLI (`redis-cli`)
- Redis INFO memory, MEMORY MALLOC-STATS commands

## Sources Consulted
- Redis official documentation: MEMORY PURGE — https://redis.io/docs/latest/commands/memory-purge/
- Redis official documentation: MEMORY MALLOC-STATS — https://redis.io/docs/latest/commands/memory-malloc-stats/
- Redis official documentation: MEMORY STATS — https://redis.io/docs/latest/commands/memory-stats/
- jemalloc TUNING.md — https://github.com/jemalloc/jemalloc/blob/dev/TUNING.md
- Redis active defragmentation documentation — https://redis.io/docs/latest/operate/rs/references/memtier-benchmark/

## Issues Found

1. **Incorrect jemalloc `muzzy_decay_ms` default**: The post stated "Default for both is 10,000 ms (10 seconds)" for `dirty_decay_ms` and `muzzy_decay_ms`. While `dirty_decay_ms` does default to 10,000 ms, `muzzy_decay_ms` defaults to 0 ms (immediate release). Fixed to state each default separately.

2. **Incorrect description of what MEMORY PURGE reduces**: The post stated "The gap between `resident` and `allocated` is what `MEMORY PURGE` reduces." This is imprecise — MEMORY PURGE reduces the gap between `resident` and `active` (idle pages not backing any live allocation). The gap between `active` and `allocated` represents internal fragmentation within active pages, which MEMORY PURGE cannot address. Fixed to reference `resident` vs `active`.

3. **Active defragmentation incorrectly described as "background thread"**: The comparison table stated active defragmentation runs as a "background thread." In reality, Redis active defragmentation runs incrementally in the main thread (via the server cron), not in a separate background thread. Fixed to "runs incrementally in the main thread."

## Review Notes
- The `MEMORY MALLOC-STATS` output shown is a reasonable simplification of jemalloc's verbose `malloc_stats_print` output, which does include Allocated, active, resident, and retained fields in its summary line. The real output is much more verbose.
- The bash automation script using `xargs redis-cli DEL` works but could be slow for very large key sets; `redis-cli --scan --pattern "cache:*" | xargs -L 100 redis-cli DEL` would batch better. This is a performance optimization rather than a correctness issue, so no change was made.
- The post correctly notes that MEMORY PURGE only works with jemalloc (it is a no-op for other allocators), though this could be mentioned more explicitly.
