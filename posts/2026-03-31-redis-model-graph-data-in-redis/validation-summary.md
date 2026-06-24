# Validation Summary: How to Model Graph Data in Redis

## Status
validated

## Post Type
Guide / Data Modeling Tutorial

## Technologies Covered
- Redis Sets (SADD, SMEMBERS, SISMEMBER, SINTER, SCARD, SREM) for adjacency lists
- Redis Hashes (HSET) for node properties
- Redis Sorted Sets (ZADD) for weighted edges
- Redis Lua scripting via EVAL
- Python `redis-py` client

## Sources Consulted
- Redis Streams/commands reference and general Redis command behavior — https://redis.io/docs/latest/develop/data-types/streams/ and Redis command docs (verified set command semantics and EVAL `numkeys` argument convention used in the post)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- `SINTER edges:follows:1 edges:follows:2` correctly returns the set of nodes that both user 1 and user 2 follow (common out-neighbours); the comment's "mutual follows" wording refers to commonly-followed accounts, which is what SINTER computes.
- The `EVAL "..." 2 1 2` call is correct: `2` is the numkeys count, then keys `1` and `2`, consumed as `KEYS[1]`/`KEYS[2]` in the Lua body. `redis.call('SADD', 'edges:friends:' .. nodeA, nodeB)` is valid server-side Lua.
- redis-py `r.smembers(...)` returns a Python `set` (of `str` under `decode_responses=True`), so set operations `suggestions -= following` and `suggestions.discard(str(user_id))` in `get_suggestions` behave correctly.
- The BFS implementation is plain application code (uses `r.smembers`); no Redis-side traversal is claimed, consistent with the note that Redis has no native graph traversal.
- Memory-overhead figures (≈50–100 bytes per set entry) are presented as approximate guidance, not an exact documented constant; left as-is.
