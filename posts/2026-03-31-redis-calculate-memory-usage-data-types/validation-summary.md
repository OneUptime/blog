# Validation Summary: How to Calculate Memory Usage for Redis Data Types

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (7.0+ with listpack encodings)
- Python (redis-py client library)
- Redis CLI commands (MEMORY USAGE, OBJECT ENCODING, SET, HSET)

## Sources Consulted
- Redis official documentation: MEMORY USAGE command (https://redis.io/docs/latest/commands/memory-usage/)
- Redis official documentation: OBJECT ENCODING command (https://redis.io/docs/latest/commands/object-encoding/)
- Redis official documentation: Memory optimization (https://redis.io/docs/latest/develop/reference/optimization/memory-optimization/)
- Redis official documentation: Lists data type (https://redis.io/docs/latest/develop/data-types/lists/)
- redis-py source code for `memory_usage()` API signature

## Issues Found

1. **Unused `import sys`**: The string memory estimation code block imported `sys` but never used it. Removed the unused import.

2. **Incorrect embstr description**: The string encoding table described embstr as "~56 bytes (key + value in one alloc)". The embstr optimization stores the redisObject header and SDS value in one contiguous allocation — the key is stored separately in the dictionary. Changed to "~56 bytes (object + value in one alloc)".

3. **Wrong quicklist default node size**: The lists encoding table claimed quicklist uses "nodes of 128 entries by default". The actual default for `list-max-listpack-size` is `-2`, which means 8 KB per node, not 128 entries. Changed to "nodes limited to 8 KB by default".

4. **Bulk estimation script bug**: The `estimate_total_memory()` function used `r.dbsize()` to get the total key count for extrapolation, but `dbsize()` returns the count of ALL keys in the database, not just those matching the given pattern. When called with a pattern like `"user:*"`, this would grossly overestimate memory. Fixed the function to scan the entire matching keyspace to count `total_matching` keys accurately, while still only sampling `sample_size` keys for memory measurements.

## Review Notes
- The set `listpack` encoding was introduced in Redis 7.2, not 7.0. The post doesn't specify exact Redis versions, so this is not strictly an error but worth noting for readers on Redis 7.0-7.1.
- The per-type memory overhead numbers are approximations and will vary by Redis version, platform, and jemalloc allocator behavior. The post appropriately uses "~" to indicate these are estimates.
- The corrected bulk estimation script now does a full SCAN of the keyspace to count matching keys, which is accurate but may be slow on very large databases. This is an acceptable trade-off for a tutorial example.
