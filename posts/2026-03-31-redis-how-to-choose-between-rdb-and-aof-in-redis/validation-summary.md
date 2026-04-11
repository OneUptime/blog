# Validation Summary: How to Choose Between RDB and AOF in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (general, 7.0+ features mentioned)
- RDB (Redis Database) persistence
- AOF (Append-Only File) persistence
- redis-benchmark CLI tool
- Redis configuration (redis.conf)

## Sources Consulted
- Redis official persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis 7.0 release notes (multi-part AOF): https://github.com/redis/redis/blob/7.0/00-RELEASENOTES
- Redis redis-benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found
No technical issues found.

## Review Notes
- The `ls -lh /var/lib/redis/appendonly.aof` command in the "Comparing File Size" section is correct for Redis 6.x and earlier. In Redis 7.0+ with multi-part AOF, AOF files are stored in a subdirectory (`appendonlydir` by default) rather than as a single file, so users on Redis 7.0+ would need to check that directory instead. The post already mentions multi-part AOF in the recovery section, so this is a minor version-specific caveat rather than an error.
- The "When to Use Both" configuration omits `save 60 10000` compared to the RDB-only example. This is a valid configuration choice (fewer snapshots when AOF provides primary durability) but readers might notice the inconsistency.
- The benchmark comparison section uses the same `redis-benchmark` command for both RDB and AOF testing. This is conceptually correct (you'd run the same benchmark against different Redis configurations), but a note clarifying that the Redis server config should be changed between runs would help less experienced readers.
