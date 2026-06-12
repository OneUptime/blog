# Validation Summary: How to Implement Redis Pub/Sub

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis Pub/Sub
- Redis CLI
- Docker Redis image
- Node.js
- node-redis
- Python
- redis-py
- WebSockets with ws
- Redis Streams, RabbitMQ, and Apache Kafka as durable messaging alternatives

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis PSUBSCRIBE command documentation: https://redis.io/docs/latest/commands/psubscribe/
- Redis Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/
- node-redis Pub/Sub guide: https://github.com/redis/node-redis/blob/master/docs/pub-sub.md
- Redis node-redis Pub/Sub guide: https://redis.io/docs/latest/develop/use-cases/pub-sub/nodejs/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py advanced features documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- Redis redis-py Pub/Sub guide: https://redis.io/docs/latest/develop/use-cases/pub-sub/redis-py/
- ws documentation: https://github.com/websockets/ws
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Node.js examples use `import` and top-level `await`, but the setup did not enable ES modules. Added `npm pkg set type=module` so `node publisher.js`, `node subscriber.js`, and the other JavaScript examples run as written.
- The WebSocket notification example imports `ws`, but the setup only installed `redis`. Updated the install command to include `ws`.
- The Python examples import `redis`, but the post did not include the redis-py install command. Added `pip install redis`.
- The Python publisher used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(UTC).isoformat()` and imported `UTC`.
- The resilient node-redis subscriber manually resubscribed all channels on the `ready` event. Current node-redis automatically re-registers active `subscribe` and `pSubscribe` listeners after reconnecting, and subscribing to the same channel more than once creates multiple listeners. Removed the manual resubscribe loop and replaced the comment with the current behavior.

## Review Notes
- Redis Pub/Sub behavior described in the post is accurate: messages are ephemeral, delivery is at-most-once, `PUBLISH` returns the number of clients the message was sent to, and Pub/Sub is not a durable queue.
- Pattern subscription examples are consistent with Redis glob-style `PSUBSCRIBE` behavior.
- The subscriber examples intentionally use dedicated Pub/Sub connections, which remains the correct guidance for RESP2 clients.
