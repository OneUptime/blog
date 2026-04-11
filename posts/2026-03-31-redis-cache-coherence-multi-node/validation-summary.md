# Validation Summary: How to Implement Cache Coherence in Multi-Node Systems with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub, pipelines, key-value operations)
- Python 3.9+ (type hints with `list[str]`)
- redis-py client library
- Threading for background subscription listener

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis PUBLISH command documentation: https://redis.io/docs/latest/commands/publish/
- Redis SUBSCRIBE command documentation: https://redis.io/docs/latest/commands/subscribe/
- Redis SET command documentation (ex parameter): https://redis.io/docs/latest/commands/set/
- Python threading module documentation: https://docs.python.org/3/library/threading.html

## Issues Found
1. **Unused import `lru_cache`**: The line `from functools import lru_cache` was imported but never used anywhere in the code. This dead import is misleading as readers might expect `lru_cache` to play a role in the caching solution. Removed the import.

## Review Notes
- The `list[str]` type hint in `publish_invalidation_batch` requires Python 3.9+. On older Python versions, `typing.List[str]` would be needed. This is not an error but a version-specific caveat.
- The post correctly uses `decode_responses=True` on the Redis client, which ensures `pubsub.listen()` returns string data compatible with `json.loads()`.
- The `update_user` function updates the Redis L2 cache and then broadcasts invalidation. There is a brief window where other nodes could serve stale L1 data between these two operations. This is an inherent limitation of this simple approach and is acceptable for the scope of this tutorial.
- Redis Pub/Sub is fire-and-forget — if a node is temporarily disconnected, it will miss invalidation messages and could serve stale data until the L2 cache TTL (600s) expires. The post does not mention this limitation, but it is not a technical error.
