# Validation Summary: When to Use Redis Pub/Sub vs Redis Streams

## Status
validated

## Post Type
Decision guide / Comparison reference

## Technologies Covered
- Redis Pub/Sub (PUBLISH, SUBSCRIBE, PSUBSCRIBE)
- Redis Streams (XADD, XREADGROUP, XRANGE, XACK)
- Redis consumer groups
- redis-py (Python Redis client)
- Redis CLI (redis-cli --latency, --pipe)
- Redis RESP protocol

## Sources Consulted
- Redis official documentation for Pub/Sub: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis official documentation for Streams: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP command reference: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XADD command reference: https://redis.io/docs/latest/commands/xadd/
- Redis XRANGE command reference: https://redis.io/docs/latest/commands/xrange/
- Redis XACK command reference: https://redis.io/docs/latest/commands/xack/
- Redis PSUBSCRIBE command reference: https://redis.io/docs/latest/commands/psubscribe/
- redis-py documentation for xreadgroup and xadd method signatures

## Issues Found
1. **"exactly once" delivery claim (line 65)**: The use case description for Streams stated "any event that must be processed exactly once," but the comparison table correctly identifies Streams as providing "At-least-once (with ACK)" delivery. Redis Streams do not guarantee exactly-once processing — a consumer can crash after processing a message but before sending XACK, causing the message to be redelivered from the Pending Entries List. Exactly-once semantics require application-level idempotency. Changed "exactly once" to "at least once" to match the table and Redis documentation.

## Review Notes
- The RESP protocol example in the `redis-cli --pipe` command correctly uses `*5` for the 5-element XADD command array.
- The redis-py `xadd` call uses `approximate=True` which is actually the default in redis-py, so it could be omitted, but including it explicitly is not incorrect and improves clarity.
- The post could mention that Redis 7.0+ introduced sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) which is shard-local rather than cross-shard broadcast, but this is an enhancement opportunity rather than an error.
- The comparison table's "Global ordering by ID" for Streams is accurate within a single stream key. Across multiple stream keys, ordering is independent — this nuance is implied by context but not explicitly stated.
