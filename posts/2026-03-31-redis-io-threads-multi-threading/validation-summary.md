# Validation Summary: How to Configure Redis IO Threads for Multi-Threading

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (6.0+, with notes on 7.x and 8.0 differences)
- Redis IO threads (`io-threads`, `io-threads-do-reads`)
- redis-benchmark
- redis-cli

## Sources Consulted
- Redis 6.2 redis.conf reference: https://github.com/redis/redis/blob/6.2/redis.conf
- Redis 7.0 redis.conf reference: https://github.com/redis/redis/blob/7.0/redis.conf
- Redis 8.0 redis.conf reference: https://github.com/redis/redis/blob/8.0/redis.conf
- Redis GitHub PR #13695 (Async IO threads, TLS support): https://github.com/redis/redis/pull/13695
- Redis GitHub Issue #11119 (Threaded IO + TLS): https://github.com/redis/redis/issues/11119
- Redis latency documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/

## Issues Found

1. **Inconsistent thread count recommendations**: The post stated "rule of thumb: set io-threads to number of CPU cores minus 1" but then gave examples that contradicted this (8-core: 6, not 7). Additionally, two other sections recommended `io-threads 7` for 8 cores while the first section said 6. Fixed to use the official Redis documentation recommendations consistently: 2-3 for 4 cores, 6 for 8 cores. Removed the incorrect "cores minus 1" formula.

2. **Excessive thread count for 16-core**: The post recommended `io-threads 12` for a 16-core server. The Redis documentation states that "using more than 8 threads is unlikely to help much." Removed this recommendation along with the inaccurate rule of thumb.

3. **Outdated TLS claim**: The post stated that "IO threads are automatically disabled when TLS is enabled" as a blanket statement. This is true for Redis 6.x and 7.x, but Redis 8.0 introduced full TLS support for IO threads (via PR #13695). Fixed to specify the version-dependent behavior.

4. **Missing `redis-cli` prefix on INFO commands**: The `INFO stats`, `INFO cpu`, and `INFO server` commands were shown without the `redis-cli` prefix, making them non-functional when run from a shell prompt. Added `redis-cli` prefix to all three commands.

5. **Example config inconsistency**: The example redis.conf used `io-threads 7` for an 8-core server, contradicting the earlier recommendation of 6. Fixed to `io-threads 6` to match Redis documentation.

## Review Notes
- Redis 8.0 introduced a fundamentally redesigned async IO threading model (event-loop based instead of synchronous fan-out). The `io-threads-do-reads` directive is effectively deprecated in Redis 8.0 as reads are threaded by default. The post could benefit from a note about Redis 8.0 changes in the future.
- The Redis 8.0 redis.conf updated its recommendations to "3 for 4 cores, 7 for 8 cores" (shifted up by 1 from 6.x/7.x). The post targets Redis 6.0+ so the 6.x/7.x recommendations are appropriate.
- The `redis-benchmark --pipeline` long form flag works in modern Redis versions but older versions may only support `-P`. This is minor and left as-is.
