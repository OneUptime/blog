# Validation Summary: How to Build a Real-Time Polling System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sets, Pub/Sub, Lua scripting, pipelining, key expiration)
- Python (redis-py client library)

## Sources Consulted
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis SISMEMBER documentation: https://redis.io/docs/latest/commands/sismember/
- Redis HINCRBY documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis HGETALL documentation: https://redis.io/docs/latest/commands/hgetall/
- Redis PUBLISH documentation: https://redis.io/docs/latest/commands/publish/
- Redis EXPIREAT documentation: https://redis.io/docs/latest/commands/expireat/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis cjson library in Lua: https://redis.io/docs/latest/develop/interact/programmability/lua-api/#cjson-library
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-py Script class (register_script): https://redis-py.readthedocs.io/en/stable/advanced_features.html#lua-scripting

## Issues Found
- **Unused `import threading`**: The "Subscribing to Live Results" code block imported `threading` but never used it. Removed the unused import.

## Review Notes
- The voter tracking set (`poll:{id}:voters`) is never given an expiration, unlike the votes hash and metadata hash. This means voter sets persist indefinitely after a poll expires. The summary's claim that "auto-expiring keys handle cleanup without a scheduled job" is slightly overstated. A production implementation should set expiration on the voters key as well (e.g., via `EXPIREAT` in the Lua script after the first `SADD`).
- The `close_poll` function updates the metadata status to "closed" but the Lua script only checks the `expires` timestamp, not the status field. This means votes can still be cast on a "closed" poll if the expiration time hasn't passed yet.
- The `watch_poll` function assumes all messages have `option` and `totals` fields, but `close_poll` publishes a differently structured event (`{"event": "closed", ...}`). This would cause a `KeyError` if a close event is received while watching. A production implementation should check for event type.
- All Redis commands and redis-py API usage is correct and current. The Lua script correctly uses `cjson`, `redis.error_reply()`, and atomic operations.
