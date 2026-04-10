# Validation Summary: What Is Redis Keyspace and How It Is Organized

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (keyspace, logical databases, SCAN, INFO, DBSIZE, --bigkeys)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation on SELECT command: https://redis.io/commands/select
- Redis official documentation on SCAN command: https://redis.io/commands/scan
- Redis official documentation on INFO command: https://redis.io/commands/info
- Redis official documentation on DBSIZE command: https://redis.io/commands/dbsize
- Redis Cluster specification (database 0 limitation): https://redis.io/docs/reference/cluster-spec/
- Redis source code internals (redisDb struct with `dict` and `expires` hash tables)
- Redis CLI documentation: https://redis.io/docs/ui/cli/
- redis-py client library documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect description of internal key storage (expiration timestamps)**: The post claimed each hash table entry contains the key, value, and expiration timestamp. In reality, Redis maintains two separate hash tables per database: the main dict mapping keys to values, and a separate `expires` dict mapping keys to expiration timestamps. Fixed the section to accurately describe the two-dictionary architecture.

2. **Misleading `--bigkeys` description**: The text said "Check memory per key type" but `--bigkeys` does not show memory usage per type. It finds the biggest keys of each data type and shows key count distribution. Changed the description to "Find the biggest keys and key type distribution."

3. **Invalid `--sleep` flag for redis-cli**: The command `redis-cli --bigkeys --sleep 0.05` used a non-existent `--sleep` flag. The correct flag for adding a delay between scan iterations in redis-cli is `-i`. Fixed to `redis-cli --bigkeys -i 0.05`.

## Review Notes
- The SCAN TYPE option (used in `SCAN 0 TYPE hash COUNT 100`) was introduced in Redis 6.0. The post does not mention version requirements, which is fine for a general guide but readers on older Redis versions should be aware.
- The Python example uses redis-py's `scan()` method correctly. The iteration pattern shown is idiomatic and correct.
- The advice to never use KEYS in production is sound and well-explained.
