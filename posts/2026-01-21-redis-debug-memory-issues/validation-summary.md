# Validation Summary: How to Debug Redis Memory Issues

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Redis Open Source memory commands and INFO output
- redis-cli
- redis-py
- Python
- Redis memory configuration, eviction, active defragmentation, and key expiration

## Sources Consulted
- Redis MEMORY STATS command documentation: https://redis.io/docs/latest/commands/memory-stats/
- Redis MEMORY DOCTOR command documentation: https://redis.io/docs/latest/commands/memory-doctor/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis MEMORY PURGE command documentation: https://redis.io/docs/latest/commands/memory-purge/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis CLI documentation for `--scan`, `--pattern`, `--bigkeys`, and `-i`: https://redis.io/docs/latest/develop/tools/cli/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis 7.2 and 8.0 redis.conf examples: https://raw.githubusercontent.com/redis/redis/7.2/redis.conf and https://raw.githubusercontent.com/redis/redis/8.0/redis.conf
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The fragmentation section described `mem_fragmentation_ratio > 1.5` as Redis allocating more memory than it uses. Redis documents this metric as RSS divided by Redis allocated memory and notes that it includes allocator fragmentation plus other process overhead. Updated the explanation to recommend checking `allocator_frag_ratio` and `mem_fragmentation_bytes`.
- The post stated that `mem_fragmentation_ratio < 1` means Redis is using swap. Redis documents this as a likely sign that part of Redis memory has been swapped out, not an absolute diagnosis. Softened the wording to "may indicate" and added a note to check OS swap usage.
- The `MEMORY PURGE` comment said it immediately releases pages. Redis documents the command as attempting to purge dirty pages, implemented for jemalloc and a no-op for other allocators. Updated the wording to "ask the allocator to release reclaimable pages."
- The `redis-cli --bigkeys` comment said it samples random keys, and the `-i` example was described as more thorough. Redis CLI documentation says `--bigkeys` scans the keyspace using SCAN and `-i` adds delay between SCAN calls. Updated both comments.
- The optimization snippet used Redis <= 6.2 `hash-max-ziplist-*` configuration names. Redis 7.0+ uses `hash-max-listpack-*`. Updated the config keys and related text.
- The `maxmemory-samples` comment called it a warning threshold. It controls eviction sampling accuracy. Updated the comment.
- Several standalone Python snippets relied on imports from earlier code blocks. Added local imports so the snippets can run independently.
- The compression wrapper could return stale data after switching a key between compressed and uncompressed storage. Updated `set()` to delete the alternate representation after writing.

## Review Notes
The examples assume Redis Open Source 7.0+ for listpack configuration names. For Redis 6.2 and older, the equivalent hash tuning directives are `hash-max-ziplist-entries` and `hash-max-ziplist-value`.
