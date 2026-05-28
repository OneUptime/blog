# Validation Summary: Use Redis Pub/Sub Messaging Patterns on Memorystore for Real-Time Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Redis Pub/Sub
- Google Cloud Pub/Sub
- Redis Streams
- redis-py
- FastAPI WebSockets
- Google Cloud CLI

## Sources Consulted
- Google Cloud Memorystore for Redis supported versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud Memorystore create and manage Redis instances: https://cloud.google.com/memorystore/docs/redis/create-manage-instances
- Google Cloud Memorystore Redis tier capabilities: https://cloud.google.com/memorystore/docs/redis/redis-tiers
- Google Cloud Memorystore supported environments: https://cloud.google.com/memorystore/docs/redis/supported-environments
- Google Cloud Pub/Sub exactly-once delivery: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Redis Pub/Sub documentation and delivery semantics: https://redis.io/docs/latest/develop/pubsub/
- Redis PUBSUB CHANNELS and NUMSUB command references: https://redis.io/docs/latest/commands/pubsub-channels/ and https://redis.io/docs/latest/commands/pubsub-numsub/
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- Redis XADD command reference: https://redis.io/docs/latest/commands/xadd/
- Redis redis-py Pub/Sub guide: https://redis.io/docs/latest/develop/use-cases/pub-sub/redis-py/
- Redis redis-py asyncio guide: https://redis.io/docs/latest/develop/clients/redis-py/async/

## Issues Found
- The Memorystore create command used `--tier=STANDARD_HA`, which is not the documented tier value for Memorystore for Redis. Changed it to `--tier=STANDARD`.
- The Google Cloud Pub/Sub comparison described exactly-once processing as a general property. Changed it to durable storage, at-least-once delivery by default, and optional exactly-once delivery for pull subscriptions.
- The post claimed typical sub-millisecond regional latency as a Memorystore-specific guarantee. Reworded this to a more accurate low-latency Redis Pub/Sub fan-out statement.
- The chat room example started a new listener thread every time `join()` was called on the same `ChatRoom`, which could put multiple threads in competition over one Pub/Sub listener. Added a stored listener thread and only starts it once.
- The monitoring example treated `pubsub_numsub()` with no channel arguments as a total subscriber count. Changed it to use `INFO clients` for `pubsub_clients`, and to call `pubsub_numsub(*channels)` when printing per-channel subscriber counts.
- The scaling notes said the failover replica also handles Pub/Sub. Changed this to explain that Standard tier promotes a replica during automatic failover and clients should reconnect.
- The Streams example said it kept the last 1000 messages, but redis-py stream trimming is approximate by default when using `maxlen`. Added `approximate=False` for exact trimming.

## Review Notes
The Python snippets were extracted from the Markdown and checked with `py_compile` after edits. The local environment did not have `gcloud` or the `redis` Python package installed, so CLI and client API behavior was verified against official documentation rather than executed locally.
