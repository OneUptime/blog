# Validation Summary: How to Troubleshoot Redis High Memory Usage

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis (4.0+ through 7.x)
- redis-cli command-line interface
- Python redis-py client library
- Bash scripting

## Sources Consulted
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis MEMORY USAGE command documentation — https://redis.io/docs/latest/commands/memory-usage/
- Redis MEMORY DOCTOR command documentation — https://redis.io/docs/latest/commands/memory-doctor/
- Redis CONFIG SET documentation — https://redis.io/docs/latest/commands/config-set/
- Redis eviction policies documentation — https://redis.io/docs/latest/develop/reference/eviction/
- Redis memory optimization documentation — https://redis.io/docs/latest/develop/use/memory-optimization/
- Redis active defragmentation documentation
- redis.conf default configuration file (Redis 7.x)
- redis-py library source for `memory_usage()` method

## Issues Found

1. **Incorrect version claim for `--bigkeys`**: The post stated `--bigkeys` was introduced in "Redis 4.0+" but it has been available since at least Redis 2.8. Removed the incorrect version annotation from the comment.

2. **Misleading `list-max-listpack-size` value**: The post set `list-max-listpack-size 128` alongside hash/set/zset entry-count thresholds, implying it works the same way. However, this parameter has different semantics — positive values set max entries per quicklist node, while negative values set byte-size limits per node (default is `-2` = 8KB). Changed the value to the default `-2` and added comments explaining the negative-value convention.

## Review Notes
- The Python script in Step 3 uses `r.memory_usage(key)` from redis-py, which is correct and returns `None` for non-existent keys (handled by the `or 0` fallback).
- The bash script for scanning keys over a threshold (Step 2) issues a separate `redis-cli` connection per key, which is very slow on large keyspaces. This is noted implicitly by the post's warning about SCAN being slow, but users with millions of keys should consider using a Python/Lua approach instead. Not changed since the post already warns about performance.
- The `set-max-intset-entries` parameter only applies to sets containing exclusively integer values. For non-integer sets in Redis 7+, `set-max-listpack-entries` controls listpack encoding. The post covers intset only, which is technically correct but incomplete. Not changed to avoid scope creep.
- Active defragmentation requires Redis to be compiled with jemalloc (the default). This precondition is not mentioned but is implied by the `mem_allocator: allocator (jemalloc recommended)` comment in Step 1.
