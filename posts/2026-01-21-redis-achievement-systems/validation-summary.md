# Validation Summary: How to Build Achievement Systems with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis hashes, sets, strings/counters, bitmaps, Pub/Sub, pipelines, and sorted sets
- Python
- redis-py
- Node.js
- ioredis

## Sources Consulted
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis SETBIT command documentation: https://redis.io/docs/latest/commands/setbit/
- Redis BITCOUNT command documentation: https://redis.io/docs/latest/commands/bitcount/
- Redis INCRBY command documentation: https://redis.io/docs/latest/commands/incrby/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZREVRANK command documentation: https://redis.io/docs/latest/commands/zrevrank/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis ioredis guide: https://redis.io/docs/latest/develop/clients/ioredis/
- ioredis official repository documentation: https://github.com/redis/ioredis

## Issues Found
- Python achievement unlocks were not idempotent under concurrent unlock attempts. The original code checked set membership before awarding points, but two workers could pass the check and both increment points. Changed `_unlock_achievement` to use `SADD` as the gate and only award points, write unlock metadata, and publish notifications when the set add reports a new member.
- Node.js achievement unlocks had the same duplicate-award race. Changed `unlockAchievement` to use `SADD` before the pipeline and return `false` when the achievement was already unlocked.
- The Node.js ioredis example used `hset(key, object)`. ioredis documents object argument transformation for `hmset` and `mset`, while Redis `HSET` takes field/value pairs. Changed the example to call `hset(key, ...Object.entries(achievementData).flat())`.
- Collection completion status used `BITCOUNT` across the entire bitmap even though the method receives `total_items`. This could overcount stray bits beyond the collection size. Changed the status count to use the bounded item scan already performed by the method.
- Tiered achievement status read `player:{player_id}:progress:{base_id}`, but `update_tiered_progress` never wrote that key. Changed the update path to store the base progress value.
- Tiered achievement code assumed redis-py returned byte-string hash keys. That fails when a client is configured with `decode_responses=True`. Added a small helper so the example works with either bytes or string hash keys.

## Review Notes
The code examples are syntactically valid after the fixes. For production systems, consider using Lua scripts or Redis transactions for larger multi-key invariants, and consider timezone-aware streak boundaries instead of UTC epoch-day boundaries if achievements are based on a player's local day.
