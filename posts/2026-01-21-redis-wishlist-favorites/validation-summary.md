# Validation Summary: How to Implement Wishlist and Favorites with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis sorted sets, hashes, sets, lists, and pipelines
- redis-py
- ioredis
- Python
- Node.js

## Sources Consulted
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis SADD command documentation: https://redis.io/docs/latest/commands/sadd/
- Redis SISMEMBER command documentation: https://redis.io/docs/latest/commands/sismember/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis sets documentation: https://redis.io/docs/latest/develop/data-types/sets/
- redis-py guide and command reference: https://redis.io/docs/latest/develop/clients/redis-py/ and https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://github.com/redis/ioredis and https://redis.github.io/ioredis/classes/Redis.html

## Issues Found
- The original wishlist examples used the full JSON item payload as the sorted-set member. Because Redis sorted-set members are unique by member string, the same product could be added multiple times if the timestamp or metadata changed. Updated the Python and Node.js examples to use `product_id` as the sorted-set member and store item metadata in a Redis hash.
- The original product popularity counters incremented on every `add_item` call, even when the product was already in the wishlist. Updated the examples to use the `ZADD` return value so counters only increment for newly added products and decrement only when removal succeeds.
- The original `is_in_wishlist` examples scanned and decoded every sorted-set member. Updated them to use `ZSCORE` against the stable `product_id` member for direct membership checks.
- The collection example also used JSON payloads as sorted-set members, so duplicate products could appear in a collection. Updated it to use `product_id` as the member and a companion hash for metadata.
- The optimized lookup snippet referenced `data` and `timestamp` without defining them. Added the missing values and aligned the sorted-set member with the corrected wishlist model.
- The examples used `ZREVRANGE`, which Redis documents as deprecated as of Redis 6.2. Updated Python examples to use `zrange(..., desc=True, withscores=True)` and the ioredis example to use `ZRANGE ... REV WITHSCORES`.

## Review Notes
- The examples are appropriate for tutorial purposes, but production systems should also consider atomic Lua scripts or transactions for multi-key counter/index updates and race-sensitive shared wishlist claims.
