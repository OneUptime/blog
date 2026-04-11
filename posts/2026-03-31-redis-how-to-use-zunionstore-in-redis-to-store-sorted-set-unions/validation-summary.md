# Validation Summary: How to Use ZUNIONSTORE in Redis to Store Sorted Set Unions

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (ZUNIONSTORE, ZADD, ZRANGE sorted set commands)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for ZUNIONSTORE: https://redis.io/commands/zunionstore/
- Redis official documentation for ZRANGE: https://redis.io/commands/zrange/
- redis-py library API documentation: https://redis-py.readthedocs.io/
- redis-py source code for `zunionstore` / `_zaggregate` internals: https://github.com/redis/redis-py

## Issues Found

1. **ZRANGE output ordering incorrect (Basic Usage section):** The example output showed member `d` (score 20) listed before member `b` (score 12). Since `ZRANGE` returns members in ascending score order, `b` (12) must come before `d` (20). Fixed the output ordering.

2. **All four Python `zunionstore` calls used incorrect API (all Practical Examples):** The code passed `numkeys` as a separate integer argument followed by individual key names (e.g., `r.zunionstore('dest', 3, 'key1', 'key2', 'key3')`), mimicking the raw Redis command syntax. However, redis-py's `zunionstore` signature is `zunionstore(dest, keys, aggregate=None)` where `keys` is a list of key names (or a dict mapping keys to weights). The `numkeys` value is computed internally. Fixed all four calls to pass a list of keys instead.

3. **Comment ordering incorrect (Merge Segment Lists example):** The inline comment listing descending-order results showed `user:1` (score 130) before `user:2` (score 135). Since the query uses `desc=True`, `user:2` (135) must appear before `user:1` (130). Fixed the comment ordering.

## Review Notes
- The `zrange` calls with `desc=True` parameter require redis-py 4.x+ (which maps to Redis 6.2+ ZRANGE REV option). This is current and correct for modern versions but would not work with redis-py 3.x (where `zrevrange` was needed instead).
- The ZUNIONSTORE command itself has been available since Redis 2.0.0 and remains current with no deprecation.
