# Validation Summary: How to Troubleshoot Redis Intermittent Latency Spikes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (latency monitoring, AOF persistence, slow log, active defragmentation, keyspace notifications, BGSAVE/fork)
- Linux system administration (swap management, transparent huge pages, /proc filesystem)

## Sources Consulted
- Redis official documentation: LATENCY HISTORY, LATENCY LATEST commands — https://redis.io/docs/latest/commands/latency-history/
- Redis official documentation: INFO command (stats section, `latest_fork_usec` field) — https://redis.io/docs/latest/commands/info/
- Redis official documentation: CONFIG SET / CONFIG GET — https://redis.io/docs/latest/commands/config-set/
- Redis official documentation: SLOWLOG — https://redis.io/docs/latest/commands/slowlog-get/
- Redis official documentation: Latency monitoring framework — https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/
- Redis official documentation: activedefrag — https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Linux kernel documentation: transparent huge pages (THP)

## Issues Found

1. **Incorrect Redis INFO field name for fork timing.**
   - **What was wrong:** The post used `redis-cli INFO stats | grep fork_average_us`. The field `fork_average_us` does not exist in Redis INFO output.
   - **What was changed:** Corrected to `redis-cli INFO stats | grep latest_fork_usec`, which is the actual field name for the duration of the latest fork operation.
   - **Why:** `latest_fork_usec` is the documented field in the Redis INFO stats section. `fork_average_us` has never been a valid Redis INFO field.

2. **Contradictory phrasing about transparent huge pages.**
   - **What was wrong:** The post said "enabling transparent huge pages (THP) off", which is self-contradictory.
   - **What was changed:** Corrected to "disabling transparent huge pages (THP)".
   - **Why:** The command shown (`echo never | sudo tee ...`) disables THP. The text should match the action.

3. **`activedefrag` incorrectly presented as swap prevention.**
   - **What was wrong:** The "Memory Pressure and Swap" section suggested `CONFIG SET activedefrag yes` as the primary way to prevent Redis from using swap. Active defragmentation reduces memory fragmentation by reallocating objects within already-used memory pages; it does not prevent swapping.
   - **What was changed:** Replaced with `maxmemory` configuration (the actual Redis-level control for capping memory usage) combined with `vm.swappiness=1` (the OS-level control for reducing swap tendency).
   - **Why:** The correct way to prevent Redis from swapping is to cap its memory with `maxmemory` and an eviction policy, and to tune the OS swap behavior with `vm.swappiness`. These are the approaches recommended in official Redis documentation.

## Review Notes
- The `LATENCY HISTORY event` example uses "event" as a placeholder for an actual event name (e.g., `command`, `fork`, `aof-fsync-always`). This is understandable in context but could confuse readers who might pass the literal string "event". A comment noting this is a placeholder would improve clarity.
- The intrinsic latency threshold of 1ms mentioned in the post is a reasonable rule of thumb, though the official Redis docs don't specify a hard threshold — acceptable values depend on the use case.
- All Redis commands shown (`CONFIG SET`, `CONFIG GET`, `LATENCY LATEST`, `LATENCY HISTORY`, `LATENCY RESET`, `SLOWLOG GET`, `INFO stats`, `--intrinsic-latency`) are valid and current as of Redis 7.x.
