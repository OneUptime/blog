# Validation Summary: How to Build a Real-Time Typing Indicator with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TTL keys, Pub/Sub, keyspace notifications)
- Python (redis-py client library)

## Sources Consulted
- redis-py official documentation (https://redis-py.readthedocs.io/) — verified `Redis()`, `setex()`, `exists()`, `delete()`, `keys()`, `mget()`, `publish()`, `pubsub()`, `subscribe()`, `psubscribe()`, `listen()` APIs and parameter orders
- Redis official documentation on keyspace notifications (https://redis.io/docs/latest/develop/use/keyspace-notifications/) — verified `notify-keyspace-events` flag characters (K, E, x), `__keyevent@<db>__:expired` subscription pattern, and message data contents
- Redis official documentation on Pub/Sub (https://redis.io/docs/latest/develop/interact/pubsub/) — verified message types ("message", "pmessage") and subscription semantics

## Issues Found
No technical issues found.

## Review Notes
- The `threading` module is imported in the setup block but never used in any code example. It is likely included because a real implementation would run `watch_typing` and `listen_for_expiry` in separate threads, but no code example demonstrates this. Not a technical error, but could confuse readers.
- The `my_user_id` parameter in `watch_typing` is declared but never referenced in the function body. It appears intended for filtering out the current user's own typing events, but the filtering is not implemented. Readers may find this misleading.
- The `notify-keyspace-events "KEx"` config includes the `K` (Keyspace) flag, but the code only subscribes to a keyevent channel (`__keyevent@0__:expired`). Using `"Ex"` would be sufficient. The current config is not wrong — it just enables additional notifications that are not consumed.
- `r.keys(pattern)` scans the entire keyspace and is O(N). In production with many keys, `SCAN` would be preferred. This is acceptable for a tutorial context.
- There is a minor race condition between `r.exists()` and `r.setex()` in `user_typing()` — the key could expire between the two calls. A Lua script or pipeline would eliminate this, but it is an acceptable simplification for a tutorial.
