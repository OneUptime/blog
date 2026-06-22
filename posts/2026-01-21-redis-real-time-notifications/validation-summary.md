# Validation Summary: How to Build Real-Time Notifications with Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Pub/Sub
- Redis Streams
- redis-py
- redis.asyncio
- FastAPI WebSockets
- Server-Sent Events
- Node.js WebSocket server with ws
- ioredis
- Mobile and web push notification queues

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- redis-py asyncio documentation: https://redis.io/docs/latest/develop/clients/redis-py/async/
- redis-py asyncio examples: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- FastAPI WebSocket documentation: https://fastapi.tiangolo.com/advanced/websockets/
- MDN Server-Sent Events documentation: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- ioredis Pub/Sub documentation: https://github.com/redis/ioredis

## Issues Found
- The async Python examples used `aioredis` and awaited `from_url()`. Current Redis Python guidance uses `redis.asyncio`; client construction is synchronous, Redis commands are awaited, and async clients should be closed with `aclose()`. Updated both async examples to use `redis.asyncio`, `decode_responses=True`, `pubsub.aclose()`, and `redis_client.aclose()`.
- The FastAPI WebSocket example created a Redis subscription task for the first connection but never cancelled it after the last WebSocket disconnected. Added per-user task tracking and cancellation, and made the subscription loop exit when the user no longer has active connections.
- The WebSocket broadcast loop iterated directly over a mutable set of sockets. Changed it to iterate over a list copy so cleanup during broadcast cannot mutate the set being iterated.
- The Redis Streams pagination example used `last_id` as the minimum ID in `XREVRANGE`, which returns newer entries instead of the next older page. Changed the cursor to use an exclusive maximum ID: `xrevrange(stream_key, f"({last_id}", "-", count=count)`.
- The SSE JavaScript client manually scheduled reconnects in `onerror`, but browsers already reconnect `EventSource` connections by default. Removed the manual reconnect to avoid creating duplicate EventSource connections.
- The batching helper called `redis.pipeline()` without a Redis client object in scope. Updated it to accept `redis_client` and call `redis_client.pipeline()`.

## Review Notes
- Verified Python code blocks with `ast.parse` and JavaScript code blocks with `node --check`.
- Redis Pub/Sub is correctly described as appropriate for fire-and-forget delivery; official Redis documentation confirms Pub/Sub is at-most-once and Streams are appropriate when durability or stronger delivery guarantees are needed.
- Push delivery methods for FCM, APNS, and web push remain illustrative placeholders because provider client APIs vary by library.
