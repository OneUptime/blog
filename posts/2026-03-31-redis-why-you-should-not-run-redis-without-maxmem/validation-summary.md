# Validation Summary: Why You Should Not Run Redis Without maxmemory Setting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server configuration, memory management)
- Linux OOM killer
- redis-cli (CONFIG GET, CONFIG SET, INFO commands)
- redis.conf configuration file
- Python redis-py client library

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/management/optimization/memory-optimization/
- Redis official documentation on maxmemory configuration directive: https://redis.io/docs/reference/configuration/
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis CONFIG SET command reference: https://redis.io/commands/config-set/
- Redis INFO command reference: https://redis.io/commands/info/
- Linux OOM killer documentation (kernel.org)

## Issues Found
1. **Incorrect grep for swap detection (line 55)**: The original command `redis-cli INFO memory | grep mem_allocator` was incorrect for detecting swap usage. The `mem_allocator` field reports which memory allocator Redis was compiled with (e.g., `jemalloc-5.2.1`), not swap-related information. Changed to `redis-cli INFO memory | grep used_memory_human` so readers can meaningfully compare `used_memory_human` against `used_memory_rss_human` (the next line) to detect potential swap usage. When `used_memory_rss` is significantly lower than `used_memory`, it indicates some Redis memory has been swapped out. Also updated the RSS grep to use `used_memory_rss_human` for consistency, and clarified the comment.

## Review Notes
- The post correctly notes the 64-bit default of maxmemory=0 (unlimited). On 32-bit systems the default implicit limit is 3GB, but this edge case is rarely relevant today and omitting it is reasonable.
- All 8 eviction policies are correctly listed and accurately described.
- The recommendation of 60-75% of available RAM for maxmemory is a sound best practice, accounting for OS overhead, Redis forking (RDB/AOF), and memory fragmentation.
- The Python alert script is functional but uses `python3 -c` with a multiline string, which can be fragile in some shell environments. This is a minor usability concern, not a technical error.
