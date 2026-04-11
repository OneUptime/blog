# Validation Summary: How to Use MEMORY PURGE in Redis to Release Memory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MEMORY PURGE command, introduced in Redis 4.0)
- jemalloc (memory allocator, dirty page decay)
- Redis Active Defragmentation
- Python redis-py client library

## Sources Consulted
- Redis official documentation for MEMORY PURGE: https://redis.io/docs/latest/commands/memory-purge/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis redis.conf reference (7.2/7.4): https://github.com/redis/redis/blob/7.2/redis.conf
- jemalloc official documentation (decay time defaults): https://jemalloc.net/jemalloc.3.html
- redis-py source code for memory command mappings: https://github.com/redis/redis-py

## Issues Found
- **Incorrect redis-py API call**: Both Python examples used `r.memory('purge')` to invoke MEMORY PURGE. There is no generic `memory()` method in redis-py; each MEMORY subcommand has its own method. The correct call is `r.memory_purge()`. This would have raised an `AttributeError` at runtime. Fixed on lines 122 and 150.

## Review Notes
- All Redis commands and configuration parameters (`MEMORY PURGE`, `CONFIG SET activedefrag yes`, `CONFIG SET jemalloc-bg-thread yes`, `active-defrag-ignore-bytes`, `active-defrag-threshold-lower`, `active-defrag-threshold-upper`) are verified correct against official documentation.
- The jemalloc default dirty page decay time of 10 seconds is confirmed per jemalloc docs.
- The comparison table between MEMORY PURGE and Active Defragmentation is accurate.
- The MEMORY PURGE command is noted as only effective when jemalloc is the allocator; on other allocators it is a benign no-op. The post mentions "typically jemalloc" which is accurate since jemalloc is Redis's default allocator on Linux.
- The bash grep pattern `grep used_memory:` on line 39 would also match other `used_memory_*` fields, but this is acceptable in a demonstration context where the expected output is shown in comments.
