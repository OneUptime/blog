# Validation Summary: How to Monitor Redis Memory Usage in Real Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (INFO memory, MEMORY STATS, MEMORY USAGE, --bigkeys)
- redis-cli
- Python (redis-py library)

## Sources Consulted
- Redis official documentation for INFO command: https://redis.io/commands/info
- Redis official documentation for MEMORY STATS: https://redis.io/commands/memory-stats
- Redis official documentation for MEMORY USAGE: https://redis.io/commands/memory-usage
- redis-py library documentation: https://redis-py.readthedocs.io/
- Redis memory optimization guide: https://redis.io/docs/management/optimization/memory-optimization/

## Issues Found
1. **Incorrect comment on `used_memory_human` field (line 22)**: The inline comment described `used_memory` as "RSS-equivalent, actual data." This is incorrect — `used_memory` reports the total bytes allocated by Redis's memory allocator (jemalloc, tcmalloc, or libc), not the OS-level RSS. The RSS is separately reported by `used_memory_rss`. The fragmentation ratio (`mem_fragmentation_ratio`) is specifically the ratio of these two distinct values (`used_memory_rss / used_memory`). Changed the comment to "total bytes allocated by Redis."

## Review Notes
- The `mem_allocator` example shows `libc`, but Redis defaults to `jemalloc` on most platforms. This is not an error since `libc` is valid when Redis is compiled without jemalloc, but readers should be aware that `jemalloc` is far more common in production.
- The MEMORY STATS command was introduced in Redis 4.0 and MEMORY USAGE in Redis 4.0 as well. The post does not mention version requirements, which could confuse users on very old Redis versions. This is a minor concern since Redis 4.0+ is standard at this point.
- The Python script is correct and functional with current redis-py APIs. The `r.info("memory")` call correctly returns a dictionary with the expected keys.
- All CLI commands (`INFO memory`, `MEMORY STATS`, `MEMORY USAGE`, `--bigkeys`) are correct and current.
- The alert thresholds (85% memory usage, fragmentation ratio > 1.5) are reasonable industry-standard recommendations.
