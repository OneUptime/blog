# Validation Summary: How to Build a Streaming View Counter with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis sorted sets
- Redis HyperLogLog
- Redis Pub/Sub
- Redis pipelining
- redis-py
- ioredis
- Python
- Node.js / JavaScript
- ClickHouse

## Sources Consulted
- Redis HyperLogLog documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/
- Redis PFCOUNT command documentation: https://redis.io/docs/latest/commands/pfcount/
- Redis PFMERGE command documentation: https://redis.io/docs/latest/commands/pfmerge/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis ZREMRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zremrangebyscore/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis Cluster specification for multi-key operations and hash tags: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation and API reference: https://github.com/redis/ioredis and https://redis.github.io/ioredis/classes/Redis.html

## Issues Found
- The sharded Python example described Python's built-in `hash()` modulo operation as consistent hashing. Python's `hash()` is randomized between interpreter processes by default, so the example could route the same viewer to different shards after a restart. Changed it to use a stable SHA-256 based hash and updated the docstring.
- The sharded HyperLogLog example attempted to `PFMERGE` keys that live on different Redis client instances. `PFMERGE` is a Redis server-side multi-key command, so it cannot merge keys stored on separate standalone Redis instances. Changed the example to sum per-shard HyperLogLog counts, which is valid because each viewer ID is routed to exactly one shard.
- The Node.js example used top-level `await` in a CommonJS-style snippet that also uses `require()`. Wrapped the usage code in an `async function main()` and called `main().catch(console.error)` so the snippet is syntactically valid CommonJS JavaScript.
- The best-practices section said Redis HyperLogLog provides approximately 2% accuracy. Redis documents a standard error of 0.81%, so the statement was corrected.
- The Python `leave_stream` method read only a byte-string hash field name for `started_at`. That works with redis-py's default response decoding, but fails if the client is configured with decoded responses. Updated the lookup to handle both byte-string and string field names.

## Review Notes
- The examples are illustrative and do not include all production concerns, such as explicit error handling, reconnect behavior, idempotency for repeated joins, or cleanup of the `stream:{stream_id}:windows` sorted set. These are not correctness errors in the context of the tutorial.
- Redis Pub/Sub is appropriate for transient live updates, but durable delivery would require a different pattern such as Redis Streams or an external message broker.
