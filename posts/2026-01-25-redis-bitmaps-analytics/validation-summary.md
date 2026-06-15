# Validation Summary: How to Use Redis Bitmaps for Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Bitmaps
- Redis string bitmap commands: SETBIT, GETBIT, BITCOUNT, BITOP
- Redis hash and counter commands: HGET, HSETNX, INCR
- redis-py
- Python

## Sources Consulted
- Redis SETBIT command documentation: https://redis.io/docs/latest/commands/setbit/
- Redis GETBIT command documentation: https://redis.io/docs/latest/commands/getbit/
- Redis BITCOUNT command documentation: https://redis.io/docs/latest/commands/bitcount/
- Redis BITOP command documentation: https://redis.io/docs/latest/commands/bitop/
- Redis HSETNX command documentation: https://redis.io/docs/latest/commands/hsetnx/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- Temporary BITOP destination keys were reused across calls in the retention, feature flag, and real-time statistics examples. This could corrupt results when two requests run concurrently. Changed those keys to include `uuid.uuid4().hex` so each operation writes to a unique temporary key.
- The `BitmapWithMapping.get_bit_position` example used a separate `HGET` / `INCR` / `HSET` sequence, which could assign different bit positions for the same external ID under concurrent creation. Changed it to use `HSETNX` after allocating a position, then read back the winning mapping if another caller created it first.
- The `BITOP NOT` example described the result as "users NOT active", which was too broad because `NOT` only inverts the existing string bitmap range. Updated the comment to say it inverts bits in the existing bitmap range.

## Review Notes
- The Redis bitmap memory claims are accurate for Redis strings: bit offsets must be less than 2^32, which corresponds to a 512 MB maximum string.
- `BITCOUNT` and `BITOP` are O(N) operations over the examined string length, so large production analytics workloads should account for blocking behavior.
- In Redis Cluster, multi-key `BITOP` calls require keys to be in compatible hash slots.
