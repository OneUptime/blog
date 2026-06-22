# Validation Summary: How to Debug Redis 'OOM command not allowed' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Redis Open Source
- redis-cli
- Redis memory management and eviction policies
- Redis configuration
- redis-py
- Python

## Sources Consulted
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis CONFIG SET command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis MEMORY STATS command documentation: https://redis.io/docs/latest/commands/memory-stats/
- Redis MEMORY DOCTOR command documentation: https://redis.io/docs/latest/commands/memory-doctor/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CLI documentation for --bigkeys and --memkeys: https://redis.io/docs/latest/develop/tools/cli/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis 7.4 redis.conf reference for active defragmentation and listpack encoding: https://raw.githubusercontent.com/redis/redis/7.4/redis.conf
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The Python examples used `setex`, which maps to Redis `SETEX`. Redis documentation recommends `SET` with the `EX` option for new code, so the examples now use `set(..., ex=ttl_seconds)` and `set(..., ex=ttl)`.
- The memory monitoring example called `r.info('memory')` and then attempted to read `evicted_keys` from that result. `evicted_keys` is a stats metric, so the example now also calls `r.info('stats')` and reads `evicted_keys` from the stats response.
- The data-structure optimization example referred to hash `ziplist` encoding. Modern Redis uses listpack configuration for compact hashes, so the wording now says compact listpack encoding in modern Redis.
- The `--bigkeys` command was described as finding memory-consuming keys. Redis CLI documentation describes `--bigkeys` as finding the largest keys by type/cardinality, while `--memkeys` provides memory-size estimates, so the command comments now distinguish the two.
- `MEMORY DOCTOR` was described as memory analysis with sampling. Redis documents it as a memory diagnostics report, so the comment was corrected.

## Review Notes
The post is technically relevant and accurate after the fixes. `redis-cli` was not installed in the local environment, so CLI verification was performed against official Redis documentation rather than local `--help` output.
