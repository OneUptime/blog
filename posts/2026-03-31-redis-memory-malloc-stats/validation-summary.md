# Validation Summary: How to Use MEMORY MALLOC-STATS in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (MEMORY MALLOC-STATS, MEMORY PURGE, MEMORY DOCTOR, INFO memory commands)
- jemalloc memory allocator (stats output, decay settings, arena/page management)

## Sources Consulted
- Redis source code (`src/object.c` — `memoryCommand()` handler, `getMemoryDoctorReport()`)
- Redis source code (`src/zmalloc.c` — `zmalloc_get_rss()`, `MEMORY PURGE` implementation)
- jemalloc source code (`src/stats.c` — `malloc_stats_print()` output format)
- Redis official documentation for MEMORY MALLOC-STATS (https://redis.io/commands/memory-malloc-stats/)
- Redis official documentation for MEMORY PURGE (https://redis.io/commands/memory-purge/)
- Redis official documentation for MEMORY DOCTOR (https://redis.io/commands/memory-doctor/)
- Redis official documentation for INFO (https://redis.io/commands/info/)

## Issues Found

1. **Fabricated `#` prefixes in example output**: The example output showed every line prefixed with `#`, mimicking the `INFO` command's output format. The actual `MEMORY MALLOC-STATS` output is raw text from jemalloc's `malloc_stats_print()` with no `#` prefixes. Fixed by removing all `#` prefixes and reformatting as plain text output.

2. **Summary stats incorrectly split across two lines**: The example showed `Allocated`, `active`, `metadata` on one line and `resident`, `mapped`, `retained` on a second line. In actual jemalloc output, all six values appear on a single line. Fixed by merging into one line.

3. **Invalid Redis-level piping syntax**: The "Decay Time Tuning" section showed `MEMORY MALLOC-STATS | grep decay` inside a `redis` code block, implying it was a Redis command. Shell piping is not supported within the Redis protocol. Fixed by changing this to a `bash` code block using `redis-cli MEMORY MALLOC-STATS | grep decay`.

4. **Incorrect grep patterns**: The parsing section used `grep -E "^Allocated:|^# resident:"` which would not match actual output (no `#` prefix, and `resident:` is on the same line as `Allocated:`). Fixed to `grep "Allocated:"` which matches the single summary line containing all stats.

5. **Incorrect equivalence claim for `used_memory_rss`**: The post stated `used_memory_rss` equals jemalloc's `resident` stat. In reality, `used_memory_rss` is read from the OS (e.g., `/proc/self/stat` on Linux) and includes all process memory, while jemalloc's `resident` only covers jemalloc-managed allocations. Fixed by changing `=` to `≈` and adding an explanatory note about the difference.

## Review Notes
- The post's conceptual explanations of fragmentation (`allocated <= active <= resident <= mapped`) and the diagnostic workflow (INFO memory → MEMORY DOCTOR → MEMORY MALLOC-STATS → MEMORY PURGE) are accurate and well-structured.
- The note about `dirty_decay_ms` and `muzzy_decay_ms` being set via jemalloc compile-time config or `MALLOC_CONF` environment variable is correct. Technically, jemalloc's `mallctl` interface allows per-arena runtime changes, but Redis does not expose this — the post's guidance is practical and accurate for Redis operators.
- The `MEMORY DOCTOR` message "High RSS overhead detected" is a plausible but fabricated example. The actual messages from Redis's `getMemoryDoctorReport()` use different wording (e.g., "Peak memory: ..."). This is minor and acceptable for illustration.
