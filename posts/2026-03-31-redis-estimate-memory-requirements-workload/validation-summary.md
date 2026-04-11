# Validation Summary: How to Estimate Redis Memory Requirements for Your Workload

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Redis 7.x
- Python (estimation script)
- jemalloc (memory allocator)
- Redis data structures: Strings, Hashes, Lists, Sets, Sorted Sets
- Redis persistence (RDB/BGSAVE)
- Redis replication

## Sources Consulted
- Redis documentation on memory optimization (https://redis.io/docs/management/optimization/memory-optimization/)
- Redis documentation on data types and encodings (https://redis.io/docs/latest/develop/data-types/)
- Redis source code knowledge: redisObject struct (16 bytes), SDS string implementation, dictEntry struct
- Redis configuration defaults: hash-max-listpack-entries (128), set-max-listpack-entries (128), set-max-intset-entries (512), zset-max-listpack-entries (128), list-max-listpack-size (-2)
- Redis INFO memory command documentation (https://redis.io/docs/latest/commands/info/)
- jemalloc size class allocation behavior

## Issues Found

### 1. List encoding description was incorrect (Fixed)
**What was wrong:** The reference table stated that Lists use "listpack" encoding when entries < 512 and switch to "quicklist" when entries > 512. In Redis 7.x, lists always use quicklist encoding internally — quicklist nodes contain listpack data structures. There is no threshold-based switch from pure listpack to quicklist. The `list-max-listpack-size` parameter (default: -2, meaning 8 KB max per node) controls the size of listpack nodes *within* the quicklist, not a switching threshold.

**What was changed:** Updated the reference table to show "quicklist/listpack" encoding for both small and large lists, removing the misleading 512-entry threshold.

### 2. Arithmetic error in practical sizing example (Fixed)
**What was wrong:** The final recommendation said "220 MB" but the math shows 190 MB (with 30% headroom) + 20 MB (2 replicas) = 210 MB.

**What was changed:** Corrected "220 MB" to "210 MB".

## Review Notes
- The replication buffer estimate of ~10 MB per replica is a rough heuristic. The actual replication backlog (`repl-backlog-size`) defaults to 1 MB and is shared across all replicas (not per-replica). Per-replica overhead comes from client output buffers, which vary with write throughput and replica lag. The estimate is acceptable for rough capacity planning but readers should understand it is highly workload-dependent.
- The 500,000 x 282 bytes = "141 MB" calculation uses decimal megabytes (1 MB = 1,000,000 bytes). Using binary mebibytes (1 MiB = 1,048,576 bytes), the result would be ~134.5 MiB. This is inconsistent with the Python estimation template which uses binary division (/1024/1024). For a rough capacity planning guide this is acceptable but worth noting.
- The per-key overhead estimates (~88-90 bytes) are reasonable ballpark figures for Redis 7.x and useful for capacity planning, though actual overhead varies with key length and jemalloc size classes.
- The Python estimation script is syntactically correct and runnable.
- All CLI commands (`redis-cli INFO memory`, `redis-cli --bigkeys`, `OBJECT ENCODING`) are valid Redis commands.
