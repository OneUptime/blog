# Validation Summary: How to Choose the Right Redis Eviction Policy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (eviction policies, memory management, configuration)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis CONFIG command documentation: https://redis.io/commands/config-set/
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis SET command documentation: https://redis.io/commands/set/
- redis-py library documentation: https://redis-py.readthedocs.io/

## Issues Found
- **Line 102: Missing `redis-cli` prefix on `INFO stats` command.** The monitoring section had `INFO stats | grep evicted_keys` inside a bash code block. `INFO` is a Redis command, not a shell command, so it cannot be run directly in bash. Fixed to `redis-cli INFO stats | grep evicted_keys`. The next command in the same block (`redis-cli --stat | grep evicted`) already correctly used the `redis-cli` prefix, confirming the omission was unintentional.

## Review Notes
- All eight Redis eviction policies are correctly listed and described. The table is accurate for Redis 4.0+ (when LFU policies were introduced).
- The decision tree logic is sound and provides good practical guidance.
- The `CONFIG SET maxmemory 4gb` syntax is correct — Redis accepts kb, mb, gb suffixes.
- The default `maxmemory-samples` value of 5 is correctly stated.
- The Python monitoring code using `r.info("stats")` and `info.get("evicted_keys", 0)` is correct for redis-py.
- The post does not specify a minimum Redis version for LFU policies (`allkeys-lfu`, `volatile-lfu`). These were added in Redis 4.0. A version note could be helpful for readers on older Redis versions, but this is not an error.
