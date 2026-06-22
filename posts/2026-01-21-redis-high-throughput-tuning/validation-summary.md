# Validation Summary: How to Tune Redis for High Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Open Source
- redis-benchmark and redis-cli
- Redis configuration
- Linux kernel sysctl tuning
- systemd file descriptor limits
- redis-py synchronous and asyncio clients
- ioredis for Node.js
- Prometheus Python client
- Redis replication and Redis Cluster

## Sources Consulted
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis 8.0 redis.conf reference: https://raw.githubusercontent.com/redis/redis/8.0/redis.conf
- Redis 7.4 redis.conf reference: https://raw.githubusercontent.com/redis/redis/7.4/redis.conf
- Redis administration documentation for Linux overcommit memory and Transparent Huge Pages: https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- Redis redis-benchmark source/help text: https://raw.githubusercontent.com/redis/redis/8.0/src/redis-benchmark.c
- Redis INFO stats implementation: https://raw.githubusercontent.com/redis/redis/8.0/src/server.c
- redis-py connection and asyncio documentation: https://redis.readthedocs.io/en/stable/connections.html
- redis-py asyncio source: https://github.com/redis/redis-py/tree/master/redis/asyncio
- ioredis documentation: https://github.com/redis/ioredis
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.0/networking/ip-sysctl.html
- Linux tcp(7) manual: https://man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found
- The Redis memory configuration used Redis 6-era `hash-max-ziplist-*` and `zset-max-ziplist-*` directive names alongside Redis 7+/8 `listpack` settings. Updated them to `hash-max-listpack-*` and `zset-max-listpack-*`.
- The `ignore-warnings ARM64-COW-BUG` comment incorrectly described it as disabling the memory overcommit check. Reworded the comment to accurately describe warning suppression.
- The redis-py asyncio example incorrectly awaited `aioredis.from_url()`, which returns a client object synchronously, and used deprecated `close()`. Updated it to call `aioredis.from_url()` directly and `await r.aclose()`.
- The INFO stats comments described `expired_keys` and `evicted_keys` as per-second values, but Redis exposes them as cumulative counters. Updated the comments to say they are totals since start.
- The Prometheus example declared a rejected-connections counter but never updated it. Added tracking for `rejected_connections` deltas.
- The latency helper used fixed percentile indexes that only worked for the default iteration count. Updated the indexes to derive from the `iterations` argument.

## Review Notes
Redis throughput targets are workload- and hardware-dependent, so the performance table should be treated as broad guidance rather than a guaranteed benchmark. The TCP sysctl values are valid Linux settings, but production values should still be load-tested because aggressive TIME_WAIT and buffer tuning can have environment-specific effects.
