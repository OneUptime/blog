# Validation Summary: How to Listen for Key Deletion Events in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (keyspace notifications, Pub/Sub)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation on keyspace notifications: https://redis.io/docs/manual/keyspace-notifications/
- Redis DEL command documentation: https://redis.io/commands/del/
- Redis UNLINK command documentation: https://redis.io/commands/unlink/
- Redis CONFIG SET documentation: https://redis.io/commands/config-set/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect example in generic command comment (line 19):** The comment `"g" includes DEL, EXPIRE, RENAME, LPUSH, etc.` listed LPUSH as a generic command. LPUSH is a list command covered by the `l` flag, not the `g` (generic) flag. Generic commands are non-type-specific operations like DEL, EXPIRE, RENAME, TYPE, and PERSIST. Fixed the comment to list correct generic commands.

2. **Missing `e` (evicted events) flag in reference table (lines 25-38):** The event flag reference table omitted the `e` flag, which covers evicted events (keys evicted due to maxmemory policy). This flag is part of the `A` alias (`g$lshzxet`) which was already listed in the table, making the table inconsistent with itself. Added the missing `e` flag entry.

## Review Notes
- The practical example uses `psubscribe` on a literal (non-glob) channel string. While this works correctly (and the code properly checks for `pmessage` type), using `subscribe` would be more idiomatic for a fixed channel name. This is a style preference, not a bug.
- The introductory sentence groups expiry with deletion events, then clarifies they are separate event classes. The rest of the post correctly distinguishes `del` from `expired` events. The intro wording is slightly ambiguous but not technically wrong.
- All Python code examples use correct redis-py API calls and would work as written.
- The claim that UNLINK fires the same `del` event as DEL is correct per Redis documentation.
- The claim that FLUSHDB/FLUSHALL fire their own events rather than individual `del` events per key is correct.
