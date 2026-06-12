# Validation Summary: How to Store Event Sourcing Snapshots in Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis
- redis-py
- Python
- Event sourcing
- CQRS
- Snapshotting
- In-memory caching
- zlib compression

## Sources Consulted
- Redis LPUSH command documentation: https://redis.io/docs/latest/commands/lpush/
- Redis LTRIM command documentation: https://redis.io/docs/latest/commands/ltrim/
- Redis LRANGE command documentation: https://redis.io/docs/latest/commands/lrange/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis redis-py pipelines documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Microsoft Azure Architecture Center event sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing

## Issues Found
- The repository example said it appended events to a Redis stream, but the code uses Redis lists with `RPUSH` and `LRANGE`. Changed the comment to say Redis list.
- The snapshot scheduler mapped aggregate classes by class name, so `OrderAggregate` would scan `events:OrderAggregate:*` even though the repository stores events under the aggregate type `Order`. Changed the mapping to use each aggregate's `aggregate_type`.
- `CompressedSnapshotStore` overrode `get_latest` but inherited `get_at_version` from `RedisSnapshotStore`, which would attempt `json.loads` directly on compressed or prefixed payloads and fail for point-in-time loading. Added compressed-aware `get_at_version` and a shared `_decode_snapshot` helper.

## Review Notes
The examples are syntactically valid Python after review. The Redis list index usage for replaying events after a snapshot is consistent with Redis `LRANGE` zero-based inclusive ranges when event version 1 is stored at list index 0. The article remains an illustrative implementation; production systems should still consider optimistic concurrency checks, snapshot schema versioning, Redis persistence settings, and distributed locking or single-writer guarantees for concurrent writers.
