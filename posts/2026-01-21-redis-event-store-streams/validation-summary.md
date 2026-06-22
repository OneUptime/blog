# Validation Summary: How to Build an Event Store with Redis Streams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Streams
- Redis transactions with WATCH/MULTI/EXEC
- redis-py
- Python
- Event sourcing
- CQRS
- Consumer groups

## Sources Consulted
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis redis-py pipelines and transactions guide: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- Redis streaming with redis-py guide: https://redis.io/docs/latest/develop/use-cases/streaming/redis-py/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The optimistic concurrency example read the aggregate version before calling `WATCH`, leaving a race window where another writer could update the version before the key was watched. Moved the version read to happen after `pipe.watch(version_key)` and before `pipe.multi()`, matching Redis' documented WATCH pattern.
- The event store appended to the global stream with `maxlen=1000000`, which can trim entries from a stream that is presented as part of the event store. Removed the cap so the global stream does not silently lose historical events.
- The append method stated that all events should be for the same aggregate but did not enforce it. Added a validation check so mixed-aggregate batches fail instead of being written to the wrong aggregate stream.
- The subscription example acknowledged messages even when handlers failed, which contradicts the consumer-group acknowledgment model where successfully processed messages are acknowledged with XACK. Changed dispatching to return success and only acknowledge when all handlers complete.
- The snapshot example serialized `aggregate.__dict__` including `_uncommitted_events`, which could restore internal bookkeeping as JSON data and corrupt later saves. Excluded `_uncommitted_events` from snapshot state.
- The post described Redis Streams as an "immutable append-only log" and claimed "sub-millisecond writes and reads" without qualification. Adjusted the wording to reflect Redis Streams' append-only-log behavior while acknowledging that entries can be deleted or trimmed, and softened the latency claim to "low-latency."

## Review Notes
The Python code blocks were checked with Python's `ast` parser and are syntactically valid. The local environment did not have the `redis` Python package installed, so redis-py snippets were validated against official Redis and redis-py documentation rather than executed against a Redis server.
