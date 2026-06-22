# Validation Summary: How to Use Redis Streams vs Pub/Sub

## Status
validated

## Post Type
Technical guide / comparison with Python and Node.js examples

## Technologies Covered
- Redis Pub/Sub
- Redis Streams
- Redis consumer groups
- redis-py
- ioredis
- Python
- Node.js

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XADD command documentation: https://redis.io/docs/latest/commands/xadd/
- Redis XREAD command documentation: https://redis.io/docs/latest/commands/xread/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XGROUP CREATE command documentation: https://redis.io/docs/latest/commands/xgroup-create/
- Redis XPENDING command documentation: https://redis.io/docs/latest/commands/xpending/
- Redis XCLAIM command documentation: https://redis.io/docs/latest/commands/xclaim/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- redis-py stream examples: https://redis.readthedocs.io/en/stable/examples/redis-stream-example.html
- ioredis documentation and examples: https://github.com/redis/ioredis

## Issues Found
- The feature table described Redis Streams delivery guarantee simply as "At-least-once." Redis Streams can be used with at-most-once reads, while at-least-once behavior comes from consumer groups and acknowledgments. Updated the table to say "At-most-once or at-least-once (with consumer groups)."
- The Streams overview said messages persist until explicitly deleted. Redis Streams can also be trimmed, including via XADD MAXLEN as shown later in the post. Updated the wording to "explicitly deleted or trimmed."
- The decision guide said to choose Streams when "Messages must not be lost." That wording was too absolute because Redis durability still depends on persistence/deployment configuration. Updated it to "Messages need to be retained for later processing."
- The performance section gave fixed local latency and throughput numbers without benchmark context. Replaced those numbers with qualitative, deployment-dependent performance characteristics.

## Review Notes
Python and JavaScript snippets are syntactically valid. The Redis command usage aligns with current Redis, redis-py, and ioredis documentation. The examples assume a reachable local Redis instance and installed client libraries.
