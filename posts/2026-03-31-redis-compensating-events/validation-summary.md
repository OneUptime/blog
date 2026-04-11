# Validation Summary: How to Implement Compensating Events with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams (XADD, XREAD)
- Redis Hashes (HSET, HGET, HGETALL)
- Redis Sets (SADD)
- Python (redis-py client library)
- Saga pattern / compensating transactions in distributed systems

## Sources Consulted
- Redis XADD command documentation: https://redis.io/docs/latest/commands/xadd/
- Redis XREAD command documentation: https://redis.io/docs/latest/commands/xread/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis SADD command documentation: https://redis.io/docs/latest/commands/sadd/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/en/stable/
- Redis data types documentation (key type exclusivity): https://redis.io/docs/latest/develop/data-types/

## Issues Found
1. **Redis key collision between Hash and Stream (critical bug)**: The code used the same key pattern `saga:{saga_id}` for both a Redis Hash (saga state tracking via `hset`/`hget`/`hgetall`) and a Redis Stream (event publishing via `xadd` and consuming via `xread`). Redis keys can only hold one data type; attempting to run `XADD` on a key that holds a Hash would produce a `WRONGTYPE Operation against a key holding the wrong kind of value` error. Fixed by appending `:events` to the stream key, making it `saga:{saga_id}:events`, so that the Hash and Stream use separate keys.

2. **Inconsistent key format in bash examples**: The Event Structure bash examples used `saga:order:1001` as the stream key while the saga_id field value was `order-1001` (hyphen, not colon). This was inconsistent with the Python code which constructs stream keys from the saga_id. Fixed the bash examples to use `saga:order-1001:events` for consistency with both the saga_id format and the new `:events` suffix.

## Review Notes
- The redis-py API usage (`hset` with `mapping=`, `xadd`, `xread`, `sadd`) is correct for redis-py 4.x and 5.x.
- The XADD/XREAD bash and Python syntax is correct per Redis documentation.
- The saga pattern implementation logic (reverse-order compensation, idempotency via sets) is architecturally sound.
- The `complete_step` function has a race condition if called concurrently (read-modify-write on `completed_steps` without a lock or Lua script), but this is acceptable for a tutorial-level blog post and does not constitute a factual error.
