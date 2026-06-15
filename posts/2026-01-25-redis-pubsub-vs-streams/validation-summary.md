# Validation Summary: How to Choose Between Pub/Sub and Streams in Redis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Pub/Sub
- Redis Streams
- Redis Streams consumer groups
- redis-py
- Python

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XPENDING command documentation: https://redis.io/docs/latest/commands/xpending/
- Redis XCLAIM command documentation: https://redis.io/docs/latest/commands/xclaim/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The quick comparison table said Streams are not at-most-once and are simply at-least-once. Redis documentation states that Streams support at-most-once consumption and at-least-once semantics when using consumer groups and acknowledgments. Updated the table to reflect both modes.
- The Streams order-processing example said a failed message would be redelivered to another consumer. Redis keeps messages read by a consumer group in the Pending Entries List until acknowledged, retried by the same consumer, or claimed by another consumer using XCLAIM/XAUTOCLAIM. Updated the comment to avoid implying automatic redelivery.
- The hybrid EventBus example used `time.time()` without importing `time`. Added the missing import.

## Review Notes
The Python examples were syntax-checked after the edits. The examples are suitable as illustrative snippets, but production code should add shutdown handling, connection error handling, explicit pending-message recovery loops, and Redis persistence or replication settings appropriate for the required durability guarantees.
