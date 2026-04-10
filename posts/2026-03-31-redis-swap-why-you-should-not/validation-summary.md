# Validation Summary: How to Configure Redis Swap (and Why You Should Not)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (in-memory data store)
- Linux swap and virtual memory subsystem (`vm.swappiness`, `swapoff`, `/proc/PID/status`)
- Bash scripting for monitoring
- Redis CLI (`redis-cli INFO memory`, `CONFIG SET`, `LATENCY HISTORY`)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/management/optimization/memory-optimization/
- Redis INFO command documentation (used_memory vs used_memory_rss, mem_fragmentation_ratio): https://redis.io/commands/info/
- Redis CONFIG SET maxmemory documentation: https://redis.io/commands/config-set/
- Linux kernel documentation on vm.swappiness: https://www.kernel.org/doc/Documentation/sysctl/vm.txt
- Linux proc(5) man page for /proc/PID/status VmSwap field
- Redis LATENCY HISTORY command documentation: https://redis.io/commands/latency-history/

## Issues Found
1. **Incorrect relationship between `used_memory_rss` and `used_memory` for swap detection (line 45):**
   - **What was wrong:** The post stated "If `used_memory_rss` significantly exceeds `used_memory`, memory fragmentation or swap pressure is likely." This conflates two opposite conditions. When RSS exceeds used_memory (fragmentation ratio > 1), that indicates memory fragmentation, not swap. Swap pressure is indicated by the opposite: when `used_memory_rss` is *less* than `used_memory` (fragmentation ratio < 1), meaning some allocated pages are not resident in RAM because they have been swapped out.
   - **What was changed:** Corrected the sentence to distinguish the two cases: RSS < used_memory indicates swap, RSS > used_memory indicates fragmentation.
   - **Why:** This is a critical distinction for a post specifically about swap detection. A reader following the original advice would look for the wrong signal when diagnosing swap issues.

## Review Notes
- The `redis-cli LATENCY HISTORY` reference in the "When Swap Cannot Be Avoided" section is used as a general feature reference rather than a copy-paste command. In practice, the command requires an event name argument (e.g., `LATENCY HISTORY command`), and latency monitoring must first be enabled with `CONFIG SET latency-monitor-threshold <ms>`. This is acceptable as-is since it's a brief mention, not a tutorial on latency monitoring.
- The `maxmemory 4gb` format is valid in both redis.conf and via `CONFIG SET`. Redis accepts human-readable size suffixes (kb, mb, gb).
- The `vm.swappiness=0` behavior description is accurate for Linux kernels 3.5+. On older kernels, `vm.swappiness=0` had slightly different semantics. The post does not specify kernel versions, which is fine for a modern audience.
- All bash commands and scripts are syntactically correct and use standard Linux utilities.
