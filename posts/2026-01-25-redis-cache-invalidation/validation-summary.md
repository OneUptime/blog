# Validation Summary: How to Implement Cache Invalidation with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- redis-py
- Python
- Cache invalidation patterns
- Redis TTLs, sets, pipelines, Pub/Sub, SCAN, and locking

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/

## Issues Found
- The tag-based invalidation example refreshed each tag set to the current entry's TTL, which could shorten an existing tag set when a later cache entry used a smaller TTL. Updated the code to check the existing tag TTL and only extend the tag set expiration when needed.
- The write-through example described database and Redis updates as atomic and performed Redis writes inside the database transaction. Cross-system atomicity is not provided by that code, so the wording was corrected and cache writes were moved after the database transaction block.
- The cache stampede lock released the lock with an unconditional `DEL`, which can delete a newer lock if the original lock expires and another process acquires it. Updated the example to use a random lock token and a Lua compare-and-delete release script, matching the safer Redis locking pattern.

## Review Notes
The examples remain illustrative and depend on application-provided database functions such as `fetch_profile_from_db`, `update_profile_in_db`, and `db.transaction()`. Redis Pub/Sub examples are appropriate for broadcasting invalidation notifications, but Pub/Sub delivery is not durable; systems that require replayable invalidation events should consider Redis Streams or another durable messaging layer.
