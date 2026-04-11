# Validation Summary: How to Estimate Redis Memory for Sorted Sets Workload

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (sorted sets / ZSETs)
- Redis listpack and skiplist+hashtable internal encodings
- Redis CLI commands: `CONFIG GET`, `ZADD`, `OBJECT ENCODING`, `MEMORY USAGE`
- Python (memory estimation script, redis-py client usage)

## Sources Consulted
- Redis documentation on sorted set encoding: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis source code (`t_zset.c`, `listpack.c`, `server.h`) for internal memory layout of skiplist nodes, dict entries, and listpack entries
- Redis configuration documentation for `zset-max-listpack-entries` and `zset-max-listpack-value` defaults (128 and 64 respectively, renamed from ziplist variants in Redis 7.0)
- Redis `MEMORY USAGE` command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis `OBJECT ENCODING` command documentation: https://redis.io/docs/latest/commands/object-encoding/
- Python arithmetic verification by executing the estimation function directly

## Issues Found
1. **Unused `import math`**: The Python estimation script imported `math` but never used it. Removed the unused import.
2. **Incorrect expected output for listpack example**: The comment showed `'total_mb': 189.2` but the actual computed value is `189.3` (3970 * 50000 / 1024 / 1024 = 189.304..., rounds to 189.3). Fixed the comment.
3. **Incorrect expected output for skiplist example**: The comment showed `'total_mb': 3488.7` but the actual computed value is `3488.5` (73160 * 50000 / 1024 / 1024 = 3488.541..., rounds to 3488.5). Fixed the comment.

## Review Notes
- The memory overhead estimates (~70 bytes base for listpack, ~160 bytes base for skiplist, ~29 bytes per listpack element, ~136 bytes per skiplist element) are reasonable approximations. Actual memory varies by Redis version, platform (32-bit vs 64-bit), jemalloc allocation granularity, and SDS string header sizes. The post correctly advises measuring with `MEMORY USAGE` on representative data.
- The sharding example uses Python's built-in `hash()`, which is non-deterministic across sessions due to hash randomization (Python 3.3+). For production use, `hashlib` or a consistent hashing function would be more appropriate. As an illustrative example this is acceptable.
- The post uses `zset-max-listpack-entries` / `zset-max-listpack-value` config names, which are correct for Redis 7.0+. In Redis 6.x and earlier, these were `zset-max-ziplist-entries` / `zset-max-ziplist-value`. The post does not specify a Redis version, but the listpack terminology implies Redis 7.0+.
- The claim that sorted sets are "Redis's most memory-intensive data structure" is a reasonable generalization for common workloads, though streams with consumer groups can also be quite heavy.
