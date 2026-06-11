# Validation Summary: How to Build Redis Transaction Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (MULTI / EXEC / WATCH / UNWATCH / DISCARD)
- Redis Lua scripting (EVAL / EVALSHA, `redis.call`, error replies)
- Redis sorted-set commands used inside Lua (ZADD, ZCARD, ZREMRANGEBYSCORE, EXPIRE)
- Node.js with the `ioredis` client (`multi()`, `pipeline.exec()`, `defineCommand`)
- Python with the `redis-py` client (`Redis.pipeline()`, `Pipeline.watch/multi/execute`, `WatchError`)

## Sources Consulted
- Redis transactions reference: https://redis.io/docs/latest/develop/interact/transactions/
- Redis Lua scripting / EVAL: https://redis.io/docs/latest/commands/eval/ and https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- ioredis README (transactions, defineCommand): https://github.com/redis/ioredis#transaction and https://github.com/redis/ioredis#lua-scripting
- redis-py pipeline / WATCH docs: https://github.com/redis/redis-py/blob/master/docs/advanced_features.rst
- redis-py source (`Pipeline.watch`, deprecated base-client `watch`): https://github.com/redis/redis-py/blob/master/redis/client.py and https://github.com/redis/redis-py/blob/master/redis/commands/core.py
- redis-py top-level exception exports: https://github.com/redis/redis-py/blob/master/redis/__init__.py
- Redis ZADD / ZCARD / ZREMRANGEBYSCORE references on redis.io

## Issues Found
1. **Broken Python `compare_and_set` example (incorrect WATCH usage).** The original code called `r.watch(key)` / `r.unwatch()` directly on the `redis.Redis()` client. In `redis-py`, `WATCH` must be issued from inside a `Pipeline`; the base-client method is a no-op that emits a `DeprecationWarning` (`"Call WATCH from a Pipeline object"`). As written, no WATCH was ever sent to the server, the freshly-created pipeline had no watch attached, and `pipe.execute()` could therefore never raise `redis.WatchError`. The function would silently overwrite the value without any optimistic-lock protection.

   **Fix:** Rewrote the example to follow the canonical redis-py pattern — open a `with r.pipeline() as pipe:` block, call `pipe.watch(key)`, do the read via `pipe.get(key)` (executed immediately while watching), call `pipe.multi()` to switch to buffered mode, queue the `pipe.set(...)`, and call `pipe.execute()` to run MULTI/EXEC. The `except redis.WatchError` now correctly catches the abort-on-concurrent-modification case.

## Review Notes
- The MULTI/EXEC explanation, the "queue-time vs exec-time error" distinction, and the claim that Redis transactions have no rollback are all accurate per the official Redis transactions documentation.
- The ioredis examples are correct: `redis.multi().<cmd>...exec()` returns an array of `[err, result]` tuples on success and `null` when a watched key was modified before EXEC. Calling `redis.watch(key)` / `redis.unwatch()` directly on the ioredis client is supported (ioredis manages connection affinity internally), unlike redis-py.
- `redis.defineCommand({ numberOfKeys, lua })` and invocation via `redis.<commandName>(...keys, ...args)` match the current ioredis API.
- The Lua transfer script's `tonumber(redis.call('GET', KEYS[1]) or '0')` correctly handles the missing-key case (Redis returns `false` to Lua for nil bulk replies, and `false or '0'` yields `'0'`).
- The rate-limiter Lua script is correct; in modern Redis (>= 5) `math.random` in scripts is permitted without an explicit `redis.replicate_commands()` call, since script-effects replication is the default.
- The phrasing "MULTI/EXEC guarantees atomicity but not isolation from reads" is slightly imprecise — Redis does isolate the commands inside the MULTI/EXEC block, but it does not protect a read that happened *before* MULTI. The author's intent (motivating WATCH) is clear from context, so I left the wording alone per the "only fix technical errors" instruction.
- The `withRetry` example's error-message string check (`'WATCHERROR'`, `'aborted'`) is illustrative rather than tied to any Redis-defined error code; in ioredis, EXEC aborts surface as a `null` return from `pipeline.exec()`, so callers must throw explicitly to feed the retry loop (as the `validateAndTransfer` example does). This is consistent with the pattern shown but worth being aware of.
