# Validation Summary: How to Build a Real-Time Multiplayer Game Lobby with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sets, sorted sets, Pub/Sub, pipelines, TTL)
- Python 3 (type hints, f-strings, uuid, time)
- redis-py client library

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis command reference for HSET, HGET, HGETALL, SADD, SREM, SCARD, SMEMBERS, ZADD, ZREM, EXPIRE, PUBLISH, SUBSCRIBE: https://redis.io/docs/latest/commands/

## Issues Found

1. **Missing TTL on player-related keys**: The `join_lobby` function created `lobby:{lobby_id}:players` (set) and `lobby:{lobby_id}:player:{player_id}` (hash) keys without setting a TTL. Only the main `lobby:{lobby_id}` hash had an expiration set in `create_lobby`. This contradicted the summary's claim that "TTL on lobby keys ensures abandoned lobbies clean up automatically" — the player keys would have persisted indefinitely as orphans after the main lobby hash expired. **Fix:** Added `pipe.expire()` calls for both the players set and per-player hash keys in `join_lobby`, using the same `LOBBY_TTL` constant.

2. **Unused variable and wasted Redis call in `check_all_ready`**: The line `lobby = r.hgetall(f"lobby:{lobby_id}")` fetched the full lobby hash but the resulting `lobby` variable was never used in the subsequent condition or anywhere else in the function. This was dead code that added an unnecessary Redis round trip. **Fix:** Removed the unused `r.hgetall()` call.

## Review Notes
- The `join_lobby` function has a check-then-act race condition: it reads the player count and max_players outside the pipeline, then adds the player inside a separate pipeline. Two concurrent joins could both pass the capacity check and exceed `max_players`. A production implementation would use a Lua script or Redis transaction with WATCH for atomicity. This is acceptable for a tutorial but worth noting.
- The `lobbies:open` sorted set entries are not cleaned up when a lobby expires via TTL. Only explicit game starts (via `check_all_ready`) remove entries with `ZREM`. A production system would need periodic cleanup of stale entries or a Lua script that checks lobby existence before returning results.
- The summary claims "O(1) reads and writes" for hashes and sets, which is true for individual field/member operations (HSET, HGET, SADD, SREM, SCARD), but the code also uses SMEMBERS (O(N)) and HGETALL (O(N)). For typical small lobby sizes this distinction is negligible, but it is a simplification.
