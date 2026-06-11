# Validation Summary: How to Create Event-Based Invalidation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Node.js EventEmitter
- Redis Pub/Sub
- ioredis
- In-memory cache-aside caching
- Prometheus metrics with prom-client

## Sources Consulted
- ioredis README and package type declarations: https://github.com/redis/ioredis
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Node.js EventEmitter documentation: https://nodejs.org/api/events.html
- prom-client README: https://github.com/siimon/prom-client
- TypeScript Handbook, Classes and Object Types: https://www.typescriptlang.org/docs/handbook/2/classes.html and https://www.typescriptlang.org/docs/handbook/2/objects.html

## Issues Found
- The cache manager created a subscriber with its own internal `Map`, so remote invalidation events would not remove entries from the cache manager's local cache. Updated the subscriber constructor to accept a cache map and passed the manager's cache into it.
- Local invalidation in the cache manager deleted exact keys only, even though the post describes wildcard pattern support. Added local wildcard handling consistent with the subscriber example.
- Deduplication was described and implemented as timestamp-based, which could incorrectly drop separate events for the same entity in the same millisecond. Updated the dedupe key to include correlation ID, event type, entity type, entity ID, and timestamp.
- The publisher section claimed a transaction pattern that ensured event publication when the database write succeeds. The sample only publishes after a successful operation and does not make the database write and publish atomic, so the text now notes that a transactional outbox is needed for atomicity.
- A few snippet-local helper types were missing (`InvalidationHandler`, `VersionedEntry`, and `TaggedEntry`). Added them so the examples are clearer and type-correct.
- The introduction and summary described event-based invalidation as providing real-time data consistency too strongly for Redis Pub/Sub, which has at-most-once delivery semantics. Updated the wording to "reduces staleness" and "near real-time cache consistency."

## Review Notes
Redis Pub/Sub is appropriate for lightweight invalidation notifications, but it does not persist messages and can lose events if subscribers are disconnected or fail while processing. The post's TTL safety-net recommendation is therefore important; systems needing stronger delivery guarantees should consider a durable event mechanism such as Redis Streams or another message broker.
