# Validation Summary: How to Use Redis CLI --stat for Real-Time Statistics

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis
- redis-cli (CLI tool)
- Redis INFO command
- Redis MONITOR command
- Redis SLOWLOG command

## Sources Consulted
- Official Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- redis-cli source code (`redis-cli.c` — `statMode` function) on GitHub: https://github.com/redis/redis/blob/unstable/src/redis-cli.c
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found

### 1. Incorrect description of `mem` column (line 35)
- **What was wrong:** The `mem` column was described as "Memory used by Redis (RSS)". The `mem` column actually displays `used_memory` (the total bytes allocated by Redis's memory allocator), not `used_memory_rss` (Resident Set Size as reported by the OS). These are distinct metrics — RSS includes memory fragmentation overhead and can differ significantly from allocator-reported memory.
- **What was changed:** Updated to "Memory allocated by Redis (used_memory)".
- **Why:** Confirmed by reading the `statMode` function in `redis-cli.c`, which calls `getLongInfoField(reply->str, "used_memory")` and formats it with `bytesToHuman()`.

### 2. Imprecise description of `keys` column (line 34)
- **What was wrong:** The `keys` column was described as "Total number of keys in the database" (singular), implying a single database. The `--stat` mode actually sums keys across all databases (db0 through dbN).
- **What was changed:** Updated to "Total number of keys across all databases".
- **Why:** Confirmed by the source code which iterates over all `db<N>:keys` fields from the INFO keyspace section and sums them.

### 3. Reference to non-existent "Profiler" feature (line 71)
- **What was wrong:** The post recommended investigating spikes with "MONITOR or the Profiler". There is no built-in Redis server or CLI feature called "the Profiler". RedisInsight (a separate GUI tool) has a Profiler tab, but referring to it as a built-in feature is misleading.
- **What was changed:** Replaced "the Profiler" with `SLOWLOG`, which is the actual built-in Redis command for identifying slow commands.
- **Why:** `SLOWLOG` is the standard built-in Redis tool for analyzing command performance alongside `MONITOR`.

## Review Notes
- The `-i` flag correctly accepts fractional values (e.g., `0.1` for 100ms), confirmed by `atof()` usage in the source code.
- The requests delta description says "commands per second" which is only precisely accurate at the default 1-second interval. With a custom interval (e.g., `-i 5`), the delta represents commands over 5 seconds, not per second. This is a minor imprecision but not incorrect enough to warrant changing.
- The memory fragmentation explanation is slightly simplified — memory growing faster than keys could also indicate larger values being stored, not just fragmentation. However, the suggestion to check `mem_fragmentation_ratio` is a reasonable diagnostic step.
