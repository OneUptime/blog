# Validation Summary: How to Configure Redis as a Cache with TTL on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Redis Open Source
- Redis CLI
- Redis configuration
- Redis TTL and eviction policies
- redis-py
- Python
- Bash

## Sources Consulted
- Redis command documentation: SET - https://redis.io/docs/latest/commands/set/
- Redis command documentation: SETEX - https://redis.io/docs/latest/commands/setex/
- Redis command documentation: EXPIRE - https://redis.io/docs/latest/commands/expire/
- Redis key eviction reference - https://redis.io/docs/latest/develop/reference/eviction/
- Redis configuration documentation - https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis CLI documentation - https://redis.io/docs/latest/develop/tools/cli/
- Redis command documentation: SCAN - https://redis.io/docs/latest/commands/scan/
- Redis command documentation: INFO - https://redis.io/docs/latest/commands/info/
- Redis command documentation: DEBUG - https://redis.io/docs/latest/commands/debug/
- redis-py guide - https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- The `volatile-ttl` policy was described as evicting "oldest" data. Redis evicts keys with the shortest remaining TTL, so the wording was corrected to "soonest-expiring data."
- The `EXAT` timestamp for `promo:summer2026` was `1751328000`, which is July 1, 2025 UTC. It was corrected to `1782864000`, July 1, 2026 UTC.
- The post used `SETEX` in Redis CLI, Python, and cache-warming examples. Redis documentation marks `SETEX` as deprecated in favor of `SET` with `EX`, so examples were changed to `SET ... EX ...` and `redis-py` `set(..., ex=...)`.
- The SQL cache helper was described as "decorator-style" even though it is a direct helper function. The docstring was corrected.
- The cache-warming Bash script stored the `redis-cli` command in a string, which can cause shell word-splitting issues. It now uses a Bash array and `SET ... EX`.
- The monitoring section said a healthy cache should have a greater than 80% hit rate. This is workload-dependent, so the wording now frames 80% as a common target rather than a universal health rule.
- The batch TTL section claimed `DEBUG SLEEP 0` deletes expired keys immediately. `DEBUG` is an internal testing command, and Redis handles expiration passively and actively. The example was replaced with checking `expired_keys`.
- The pattern-delete example used `xargs`, which can split keys on whitespace and can run unexpectedly with empty input. It now uses a `while IFS= read -r key` loop.
- The XFetch example used `math.log(random.random())`, which can fail if `random.random()` returns `0.0`. It now uses `math.log(1.0 - random.random())`.

## Review Notes
The core Redis cache configuration, TTL commands, eviction policy list, redis-py connection usage, and monitoring commands are technically sound after the corrections. The examples remain illustrative and still assume application-specific database helper functions exist.
