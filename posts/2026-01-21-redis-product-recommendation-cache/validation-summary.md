# Validation Summary: How to Build a Product Recommendation Cache with Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis sorted sets
- Redis hashes
- Redis expiration and INFO statistics
- redis-py
- ioredis
- Python
- Node.js
- Recommendation caching patterns

## Sources Consulted
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZINCRBY command documentation: https://redis.io/docs/latest/commands/zincrby/
- Redis ZUNIONSTORE command documentation: https://redis.io/docs/latest/commands/zunionstore/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
- The examples used `ZREVRANGE`/`zrevrange`, which Redis marks deprecated as of Redis 6.2. Updated Python examples to use `zrange(..., desc=True, withscores=True)` and the ioredis example to use `zrange(..., 'REV', 'WITHSCORES')`.
- The recently viewed example stored JSON metadata as the sorted-set member, so viewing the same product with different metadata could create duplicate entries instead of moving the product forward. Updated it to store product IDs in the sorted set and metadata in a Redis hash.
- `record_purchase` incremented trending buckets without setting expiration, so a purchase-only bucket could persist indefinitely. Added matching TTLs for hourly and category hourly purchase buckets.
- The temporary trending union key used `int(time.time())`, which could collide across concurrent requests in the same second. Replaced it with a UUID-based key.
- The cache statistics example called an undefined `calculate_hit_rate()` function. Replaced it with a hit-rate calculation based on Redis `keyspace_hits` and `keyspace_misses` from `INFO stats`.
- Removed an unused `datetime` import after updating the Python import block.

## Review Notes
Python snippets were parsed with `ast.parse`, and the Node.js implementation snippet was checked with Node after quoting template literals correctly. The examples assume Redis 6.2 or newer for the replacement `ZRANGE REV` form.
