# Validation Summary: How to Configure Redis save Intervals for RDB Persistence

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (RDB persistence)
- redis-cli (command-line interface)
- redis.conf (configuration file)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis official documentation on CONFIG SET/GET: https://redis.io/docs/latest/commands/config-set/
- Redis official documentation on BGSAVE: https://redis.io/docs/latest/commands/bgsave/
- Redis official documentation on LASTSAVE: https://redis.io/docs/latest/commands/lastsave/
- Redis official documentation on INFO command: https://redis.io/docs/latest/commands/info/
- Redis default configuration file (redis.conf) for version 6.2+

## Issues Found
1. **Incorrect INFO section for `rdb_last_cow_size`**: The post used `redis-cli INFO memory | grep rdb_last_cow_size`, but `rdb_last_cow_size` is reported under the `persistence` section of INFO output, not the `memory` section. Changed to `redis-cli INFO persistence | grep rdb_last_cow_size`.

## Review Notes
- The default save values shown (`save 3600 1`, `save 300 100`, `save 60 10000`) reflect the Redis 6.2+ defaults. Prior to Redis 6.2, the defaults were `save 900 1`, `save 300 10`, `save 60 10000`. The post does not specify a version, but the values are current.
- The `CONFIG SET save` syntax using a single space-separated string for multiple conditions is correct.
- The explanation of BGSAVE fork behavior and copy-on-write semantics is accurate.
- All other redis-cli commands, configuration directives, and INFO output field names are correct.
