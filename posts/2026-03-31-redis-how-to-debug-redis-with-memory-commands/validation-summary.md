# Validation Summary: How to Debug Redis with MEMORY Commands

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 4.0+ MEMORY command family (MEMORY USAGE, MEMORY DOCTOR, MEMORY STATS, MEMORY MALLOC-STATS, MEMORY PURGE)
- Python redis-py client library
- jemalloc memory allocator
- Redis active defragmentation configuration

## Sources Consulted
- Redis official documentation for MEMORY STATS: https://redis.io/docs/latest/commands/memory-stats/
- Redis official documentation for MEMORY PURGE: https://redis.io/docs/latest/commands/memory-purge/
- Redis official documentation for MEMORY USAGE: https://redis.io/docs/latest/commands/memory-usage/
- Redis official documentation for MEMORY DOCTOR: https://redis.io/docs/latest/commands/memory-doctor/
- redis-py source code on GitHub (response parsing for memory_stats): https://github.com/redis/redis-py

## Issues Found

### 1. Incorrect description of MEMORY PURGE
- **What was wrong:** The command table described `MEMORY PURGE` as "Force memory defragmentation." `MEMORY PURGE` actually asks the allocator (jemalloc) to release unused dirty pages back to the OS. It is not related to Redis's active defragmentation feature.
- **What was changed:** Updated the table description to "Release unused memory to the OS."
- **Why:** MEMORY PURGE and active defragmentation (`activedefrag`) are distinct mechanisms. Conflating them could lead users to believe MEMORY PURGE addresses fragmentation when it only releases already-free pages.

### 2. Wrong field names in MEMORY STATS Python code
- **What was wrong:** The Python code used `INFO memory` field names (`used_memory`, `used_memory_rss`, `used_memory_peak`, `used_memory_overhead`, `mem_fragmentation_ratio`, `allocator_frag_ratio`, `rss_overhead_ratio`) with `r.memory_stats()`. The `MEMORY STATS` command returns completely different field names using dot/hyphen separators (e.g., `total.allocated`, `peak.allocated`, `fragmentation`, `allocator-fragmentation.ratio`).
- **What was changed:** Replaced all field names with the correct `MEMORY STATS` field names: `total.allocated`, `peak.allocated`, `startup.allocated`, `overhead.total`, `dataset.bytes`, `allocator-fragmentation.ratio`, `rss-overhead.ratio`, `fragmentation`.
- **Why:** The original code would return 'N/A' for every field since none of those keys exist in the `memory_stats()` return value. The code was non-functional as written.

### 3. Misleading comment on MEMORY PURGE in defragmentation section
- **What was wrong:** The bash comment said "Trigger active defragmentation manually (Redis 4.0+)" for `MEMORY PURGE`.
- **What was changed:** Updated to "Release unused memory to the OS (Redis 4.0+, jemalloc only)."
- **Why:** Same issue as #1 — MEMORY PURGE is not active defragmentation. Also added "jemalloc only" since MEMORY PURGE is a no-op with other allocators.

## Review Notes
- The MEMORY DOCTOR sample output references "Sam" which is an authentic Redis quirk (Redis source code includes this greeting). This is correct.
- The fragmentation ratio interpretation table uses commonly cited thresholds that are reasonable guidelines, though not officially specified by Redis.
- The `MEMORY STATS` section could benefit from noting that `dataset.percentage` and `peak.percentage` are returned as string values (e.g., "91.43%") rather than numeric types, but this is a minor enhancement rather than an error.
- Active defragmentation requires jemalloc; the post doesn't explicitly state this but it's implied by context.
