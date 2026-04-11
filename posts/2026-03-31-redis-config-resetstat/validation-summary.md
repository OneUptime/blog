# Validation Summary: How to Use CONFIG RESETSTAT in Redis to Reset Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (CONFIG RESETSTAT command)
- Redis CLI (`redis-cli`)
- Redis INFO stats output
- `redis-benchmark` tool
- Bash shell scripting

## Sources Consulted
- Official Redis documentation for CONFIG RESETSTAT: https://redis.io/docs/latest/commands/config-resetstat/
- Redis source code (`resetServerStats()` in server.c) for verifying which counters are actually reset
- Official Redis documentation for INFO command: https://redis.io/docs/latest/commands/info/

## Issues Found
1. **`migrate_cached_sockets` incorrectly listed as reset by CONFIG RESETSTAT.** This field represents the current number of cached sockets used by the MIGRATE command. It is a live gauge reflecting current state, not a cumulative statistic counter, and is not reset by CONFIG RESETSTAT. Replaced with `aof_delayed_fsync`, which is a cumulative counter that IS reset by CONFIG RESETSTAT (confirmed in the official documentation).

2. **`slave_expires_tracked_keys` incorrectly listed as reset by CONFIG RESETSTAT.** This field represents the current number of keys tracked for expiration on replicas. Like `migrate_cached_sockets`, it is a live gauge of current state, not a cumulative counter, and is not reset by CONFIG RESETSTAT. Removed from the list.

## Review Notes
- The term `slave_expires_tracked_keys` has been renamed to `replica_expires_tracked_keys` in Redis 7.0+ as part of the broader terminology update, but since the field was removed from the list entirely, this is moot.
- All other technical claims are accurate: the command syntax, return value, remaining counters in the "What Gets Reset" list, the "What Is NOT Reset" section, the cache hit rate calculation, and the shell script are all correct.
- The shell script uses `redis-benchmark -n 100000 -q` which is valid syntax.
