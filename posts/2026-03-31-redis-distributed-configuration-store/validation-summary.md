# Validation Summary: How to Build a Distributed Configuration Store with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, HGETALL, SET with NX/EX, Pub/Sub, Lua scripting via EVAL)
- Python (redis-py client library)
- Distributed locking pattern (single-instance SET NX with Lua-based release)

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/ — verified NX and EX options
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/ — verified single and multi field-value syntax
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/ — verified Lua scripting KEYS/ARGV usage
- Redis Pub/Sub documentation: https://redis.io/docs/latest/commands/publish/ and https://redis.io/docs/latest/commands/subscribe/
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `set()` return values with `nx=True` (returns `True` on success, `None` on failure), `hgetall()`, `pubsub()`, `eval()` signatures
- Redis distributed locks pattern: https://redis.io/docs/latest/develop/use/patterns/distributed-locks/ — verified SET NX EX + Lua release pattern

## Issues Found
- **Bug in `watch_config_changes` namespace parsing**: The original code used `msg["data"].split(":")[0]` to extract the namespace from published messages. When a message like `"service:auth:jwt_expiry"` is published, `split(":")[0]` returns only `"service"`, which never matches the expected `"service:auth"` in the filter check. Fixed by changing to `rsplit(":", 1)[0]`, which splits from the right on the last colon, correctly yielding `"service:auth"` as the namespace. This also works correctly for single-segment namespaces like `"global"` and `"features"`.

## Review Notes
- The post refers to the lock as "Redlock-style," but the implementation is a single-instance lock (SET NX + Lua release), which is just the building block of the full Redlock algorithm (which requires multiple independent Redis instances). The term is used loosely and is not incorrect, but readers should understand this is not a full Redlock implementation.
- The `safe_update_config` function does not call `publish_config_change` after writing. The functions are presented as separate building blocks, so readers will need to wire them together for a complete solution.
- The Pub/Sub subscriber in `watch_config_changes` is a blocking loop. In production, this should run in a separate thread or async context to avoid blocking the main application.
- Redis Pub/Sub is fire-and-forget — if a subscriber is disconnected when a config change is published, it will miss that update. For production use, a periodic full-reload fallback or Redis Streams would add reliability.
