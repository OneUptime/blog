# Validation Summary: How to Use DBSIZE in Redis to Count Keys

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (DBSIZE, SELECT, SET, HSET, FLUSHDB, INFO keyspace commands)
- Bash scripting with redis-cli

## Sources Consulted
- Redis official documentation for DBSIZE command (https://redis.io/commands/dbsize/)
- Redis official documentation for INFO command (https://redis.io/commands/info/) — specifically the keyspace section and avg_ttl unit (milliseconds)
- Redis official documentation for key expiration behavior (https://redis.io/docs/latest/develop/use/keyspace/)
- redis-cli documentation for output modes (raw vs human-readable based on TTY detection)

## Issues Found

1. **Code block language label for shell command**: The first code block in the "Using DBSIZE in Shell Scripts" section was labeled as `redis` but contained a shell command (`redis-cli DBSIZE`). Changed the label to `bash`.

2. **Incorrect avg_ttl values in INFO keyspace example**: The `avg_ttl` field in Redis INFO keyspace output is reported in milliseconds. The original values `86400` and `3600` represent ~86 seconds and ~3.6 seconds respectively, but appear to have been intended as 1 day and 1 hour (common TTL values). Changed to `86400000` (1 day in ms) and `3600000` (1 hour in ms) to be accurate and realistic.

## Review Notes
- The HSET multi-field syntax (`HSET key field1 value1 field2 value2`) requires Redis 4.0+. The post doesn't specify a version, which is fine since Redis 4.0 was released in 2017 and is the standard modern usage.
- The bash script correctly relies on redis-cli's automatic raw output mode when stdout is not a TTY (command substitution), so the integer comparison works without needing `--raw` or output parsing.
- The explanation of expired keys and DBSIZE is accurate: Redis uses both lazy expiration (on access) and active expiration (periodic background sweep), and DBSIZE may include expired-but-not-yet-evicted keys.
