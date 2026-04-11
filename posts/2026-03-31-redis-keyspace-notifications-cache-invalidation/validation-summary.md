# Validation Summary: How to Use Keyspace Notifications for Cache Invalidation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis keyspace notifications
- Python (redis-py client library)
- Cache invalidation patterns (write-through, read-through)
- Pub/Sub messaging

## Sources Consulted
- Redis official documentation on keyspace notifications: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis `notify-keyspace-events` configuration flag definitions from redis.conf
- redis-py library API documentation for PubSub (`psubscribe`, `listen`)

## Issues Found

1. **Missing `x` flag in `notify-keyspace-events` config**: The setup command used `KE$g` but the listener subscribes to `__keyevent@0__:expired`. The `g` (generic) flag only covers commands like DEL and EXPIRE (the command), not the `expired` lifecycle event when a key's TTL expires. Added the `x` flag to make the config `KE$gx`.

2. **Debounce pattern: `last_flush` never updated**: The `last_flush` variable was set at module level but never updated after flushing, meaning after the first 100ms the debounce condition was always true and every call flushed immediately. Added `global last_flush` declaration and `last_flush = now` after clearing pending invalidations.

3. **Unused `defaultdict` import**: The debounce code imported `defaultdict` from `collections` but only used `set()`. Removed the unused import.

4. **Potential `KeyError` in debounce flush**: `del local_cache[k]` would raise `KeyError` if a key in `pending_invalidations` wasn't present in `local_cache`. Changed to `local_cache.pop(k, None)` for safe removal.

## Review Notes
- The listener uses `psubscribe` for exact channel names where `subscribe` would be more conventional. This works correctly since the channel names contain no glob characters, and the code handles both `message` and `pmessage` types. Not a bug, but worth noting.
- The multi-node diagram shows Node A skipping its own invalidation event, but the code doesn't implement this self-skip logic. This is a conceptual suggestion rather than implemented code, so it's acceptable as-is.
- The recommendation to use `WATCH` + transactions for coordinated invalidation in the Limitations section is reasonable but somewhat vague. It works as a pointer for further research.
