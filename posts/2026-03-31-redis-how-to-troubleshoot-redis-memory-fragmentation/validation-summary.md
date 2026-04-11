# Validation Summary: How to Troubleshoot Redis Memory Fragmentation

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis (4.0+ for active defragmentation and MEMORY PURGE)
- jemalloc memory allocator
- redis-cli command-line tool
- Python redis-py client library
- systemd (systemctl)

## Sources Consulted
- Redis official documentation on INFO memory command (https://redis.io/docs/latest/commands/info/)
- Redis official documentation on CONFIG SET for active defragmentation parameters (https://redis.io/docs/latest/commands/config-set/)
- Redis official documentation on MEMORY PURGE (https://redis.io/docs/latest/commands/memory-purge/)
- Redis official documentation on active defragmentation configuration (https://redis.io/docs/latest/operate/rs/references/memtier-benchmark/)
- jemalloc documentation on arena purging behavior

## Issues Found
1. **Step 2, point 4 - Incorrect cause of fragmentation**: The post listed "Redis restart after heavy churn" as a cause of high fragmentation. A Redis restart actually *reduces* fragmentation because reloading data from an RDB snapshot results in fresh, compact memory allocations. The real cause is sustained key churn on a long-running instance without a restart. Changed to: "Sustained key churn over a long-running instance without restart."

2. **Step 3, incorrect comment on `active-defrag-threshold-upper`**: The inline comment said "Stop defrag when fragmentation drops below 5%" for the `active-defrag-threshold-upper 100` setting. This is incorrect. The `active-defrag-threshold-upper` parameter controls the fragmentation percentage at which the defragmentation process uses its maximum CPU effort (`active-defrag-cycle-max`). Defrag effort scales linearly between `cycle-min` (at `threshold-lower`) and `cycle-max` (at `threshold-upper`). Defragmentation stops when fragmentation drops below `active-defrag-threshold-lower`, not `threshold-upper`. Changed the comment to: "Use maximum defrag effort when fragmentation reaches 100%."

## Review Notes
- The fragmentation ratio formula (`used_memory_rss / used_memory`) and the interpretation guidelines (1.0-1.5 normal, >1.5 high, <1.0 swap) are all accurate.
- The `mem_fragmentation_bytes` calculation in the example output is consistent: 4.0G RSS - 2.5G used = 1.5G = 1,610,612,736 bytes.
- All CONFIG SET parameter names for active defragmentation are correct and use current naming conventions.
- The MEMORY PURGE description accurately reflects its behavior (jemalloc arena purge returning dirty pages to OS).
- The Python monitoring script uses correct redis-py API calls and field names.
- Active defragmentation requires Redis to be compiled with jemalloc (the default). The post mentions this dependency implicitly but could note it more explicitly in a future revision.
