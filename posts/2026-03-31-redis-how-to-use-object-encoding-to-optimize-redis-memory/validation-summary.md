# Validation Summary: How to Use OBJECT ENCODING to Optimize Redis Memory

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (7.0+ / 7.2+ for set listpack encoding)
- Redis CLI (`OBJECT ENCODING`, `MEMORY USAGE`, `SET`, `HSET`, `RPUSH`, `SADD`, `ZADD`)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for OBJECT ENCODING: https://redis.io/commands/object-encoding/
- Redis official documentation for MEMORY USAGE: https://redis.io/commands/memory-usage/
- Redis documentation on data types and internal encodings: https://redis.io/docs/latest/develop/data-types/
- Redis configuration reference for listpack/intset thresholds: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- redis-py API reference for `object_encoding()` and `scan()` methods: https://redis-py.readthedocs.io/

## Issues Found

### 1. Incorrect encoding claim for quoted integer string
- **What was wrong:** The "Forcing Compact Encodings" section claimed that `SET user:1:age "25"` would result in `embstr` encoding. This is incorrect — Redis automatically detects integer values regardless of shell quoting. Both `SET key "25"` and `SET key 25` send the identical bytes to Redis, and the value is stored with `int` encoding because `25` is parseable as a 64-bit signed integer.
- **What was changed:** Replaced the example with `SET user:1:age "25 years"` (which genuinely produces `embstr` since it's not parseable as an integer) vs `SET user:1:age 25` (which produces `int`). Updated surrounding text to say "stores numeric values as formatted strings" instead of "stores integers but as strings."
- **Why:** The original example would not demonstrate the intended behavior. A reader following along would see `int` for both commands, contradicting the post.

## Review Notes
- The post implicitly targets Redis 7.0+ (listpack for hashes, lists, sorted sets) and Redis 7.2+ (listpack for sets, `set-max-listpack-entries`/`set-max-listpack-value` config parameters). This is reasonable for a 2026 publication but is not explicitly stated. Readers on Redis 6.x would see `ziplist` instead of `listpack` and would not have the set listpack configs.
- The Python audit script uses `redis.Redis()` without `decode_responses=True`, so `object_encoding()` returns bytes (e.g., `b'listpack'`). The script still functions correctly, but output will show byte-string keys like `b'listpack': 42 keys`. Adding `decode_responses=True` to the constructor would produce cleaner output.
- The `list-max-listpack-size` config controls the fill factor for quicklist nodes (max size of each internal listpack node), which effectively determines when lists transition from `listpack` to `quicklist` encoding. The post's description is slightly simplified but not incorrect.
- The memory usage numbers in the "Practical Memory Comparison" section are approximate (prefixed with `~`) which is appropriate since exact values vary by Redis version, platform, and allocator.
