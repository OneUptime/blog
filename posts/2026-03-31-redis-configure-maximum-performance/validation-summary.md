# Validation Summary: How to Configure Redis for Maximum Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (6+ and 7.x)
- redis-benchmark CLI
- redis-cli
- Python (redis-py client)
- Linux kernel tuning (sysctl, THP, ulimit)

## Sources Consulted
- Redis official documentation on benchmarks: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis 7.2 default redis.conf: https://github.com/redis/redis/blob/7.2/redis.conf
- Redis Initial Tuning Guide: https://redis.io/learn/operate/redis-at-scale/talking-to-redis/initial-tuning
- Redis I/O threads documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- redis-benchmark source code: https://github.com/redis/redis/blob/unstable/src/redis-benchmark.c

## Issues Found
1. **`tcp-backlog 511` is the Redis default, not an increase.** The section is titled "Increase TCP Backlog and Connection Limits" but `tcp-backlog 511` is the Redis default value. The post already sets the OS-level `net.core.somaxconn=65535`, but the Redis-side backlog was left at the default, creating an inconsistency and making the effective backlog only 511. Changed to `tcp-backlog 65535` to match the OS-level setting and actually increase the backlog as the heading claims.

2. **Invalid `redis-benchmark` syntax for testing a specific command.** The command `redis-benchmark -n 100000 -c 50 -q GET` is incorrect. Placing `GET` at the end without arguments treats it as a custom command, but `GET` requires a key argument and would return an error. Changed to `redis-benchmark -n 100000 -c 50 -q -t get`, which uses the `-t` flag to select the built-in GET test with proper key generation.

## Review Notes
- The `rename-command` directive shown in the "Disable Slow Operations" section is deprecated in Redis 7.0+ in favor of ACLs. The directive still works but users on Redis 7+ should prefer ACL-based command restrictions.
- `vm.swappiness=0` is a valid choice for maximum performance. Some operators prefer `vm.swappiness=1` to avoid OOM kills on newer kernels, but `0` is the more aggressive performance-oriented setting and is acceptable for this guide's goals.
- The `maxclients 10000` value shown is the Redis default. This is not incorrect since the section serves as a reference configuration, but users should be aware it's not an increase from defaults.
