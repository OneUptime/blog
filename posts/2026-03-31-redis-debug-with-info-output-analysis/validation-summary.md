# Validation Summary: How to Debug Redis with INFO Output Analysis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (INFO command, memory diagnostics, replication, persistence, eviction)
- Bash scripting (grep, awk, cron)
- redis-cli

## Sources Consulted
- Redis official documentation for the INFO command (https://redis.io/commands/info/)
- Redis official documentation for MEMORY PURGE (https://redis.io/commands/memory-purge/)
- Redis official documentation for CLIENT LIST (https://redis.io/commands/client-list/)
- Redis memory optimization documentation (https://redis.io/docs/management/optimization/memory-optimization/)

## Issues Found
- **`used_memory_human` incorrectly described as RSS memory**: The comment on line 36 stated `used_memory_human` is "Current RSS memory." This is wrong — `used_memory_human` reports the total bytes allocated by Redis's memory allocator (jemalloc or libc), not the resident set size (RSS). RSS memory is reported by the separate field `used_memory_rss_human`. The `mem_fragmentation_ratio` is specifically the ratio of RSS to allocator memory (`used_memory_rss / used_memory`), so getting this distinction right is important for understanding fragmentation. Fixed the comment to "Current allocator memory usage."

## Review Notes
- The `latencystats` INFO section referenced in the overview requires Redis 7.0+. The post does not specify a minimum Redis version, which could confuse users on older versions.
- The replication lag section shows comparing `master_repl_offset` and `slave_repl_offset` on a single replica. While the field names are correct, in practice these values on a replica are typically very close since both reflect the replica's perspective. For measuring true master-to-replica replication lag, checking from the master's INFO replication output (which includes per-replica offset and lag in `slave0:` lines) is more reliable. This is not strictly wrong but could be misleading.
- The `maxclients` field in INFO clients output is available in Redis 7.0+ but may not appear in older versions.
- The CLIENT LIST awk parsing (`awk -F'[= ]' '{print $4}'`) works for extracting client addresses but is fragile if the CLIENT LIST output format changes across Redis versions.
