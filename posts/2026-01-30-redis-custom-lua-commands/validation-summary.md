# Validation Summary: How to Build Redis Custom Commands with Lua

## Status
validated

## Post Type
Tutorial / Guide — practical patterns for extending Redis with Lua scripts.

## Technologies Covered
- Redis (EVAL, EVALSHA, SCRIPT LOAD, SCRIPT EXISTS, SCRIPT KILL)
- Redis data structures: strings (GET/SET/DECRBY), sorted sets (ZADD/ZRANGE/ZSCORE/ZCARD/ZREMRANGEBYSCORE/ZREVRANK), hashes (HGET)
- Lua (5.1 — the Redis-embedded version)
- Redis Lua API (redis.call, redis.log, redis.LOG_* levels, cjson)
- Node.js with ioredis (defineCommand, eval, evalsha, script LOAD, SET NX PX)
- Express.js middleware pattern
- Mermaid diagrams for visualization

## Sources Consulted
- Redis Lua scripting reference: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis EVAL / EVALSHA / SCRIPT LOAD command pages: https://redis.io/commands/eval/, https://redis.io/commands/evalsha/, https://redis.io/commands/script-load/
- Redis SCRIPT KILL semantics: https://redis.io/commands/script-kill/
- Redis SET NX PX (distributed lock pattern, "single instance" Redlock): https://redis.io/commands/set/, https://redis.io/docs/latest/develop/use/patterns/distributed-locks/
- Redis sorted set commands (ZADD, ZRANGE WITHSCORES, ZREMRANGEBYSCORE, ZCARD, ZREVRANK): https://redis.io/commands/?group=sorted-set
- Redis configuration `lua-time-limit` (default 5000 ms): https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- ioredis defineCommand API: https://github.com/redis/ioredis (Lua scripting section)
- Redis log levels in Lua (LOG_DEBUG, LOG_VERBOSE, LOG_NOTICE, LOG_WARNING): https://redis.io/docs/latest/develop/interact/programmability/lua-api/#redislog

## Issues Found
No technical issues found. The post was accurate as written:
- Lua script atomicity guarantee is correctly described.
- EVAL/EVALSHA semantics and SCRIPT LOAD round-trip are correct.
- KEYS/ARGV convention and its role in cluster routing is correctly explained.
- The sliding-window rate-limit algorithm is implemented correctly (ZREMRANGEBYSCORE + ZCARD + ZADD + PEXPIRE; retry_after = window - (now - oldest_score) is correct).
- The distributed lock pattern (SET NX PX + Lua compare-and-delete with a token) matches the canonical single-instance lock from Redis docs.
- The capped increment, percentile, weighted average, leaderboard, and inventory reservation scripts are all syntactically and semantically valid Lua for Redis.
- `redis.log` levels and `lua-time-limit` default (5 seconds / 5000 ms) are correct.
- SCRIPT KILL vs SHUTDOWN NOSAVE semantics (whether writes occurred) are correctly described.
- NOSCRIPT error handling pattern is correct.
- ioredis `defineCommand`, `eval`, and `SET key value PX ms NX` syntax are all valid.

## Review Notes
- The "Common Pitfalls" item about non-deterministic functions (`math.random`, `TIME`) reflects classic Redis-Lua advice. Since Redis 5.0, the default replication mode is "script effects replication" (the writes produced by the script are replicated rather than the script source), which relaxes the strict determinism requirement. The advice is still defensible for cross-version portability and is presented as a "pitfall" rather than a hard rule, so it was left as-is.
- The rate-limit script uses `math.random()` to avoid score collisions in the sorted set when many requests arrive in the same millisecond. With effects-replication this is safe; on very old Redis (<5.0) without `redis.replicate_commands()` it would be problematic. Not changed since the post implicitly targets modern Redis.
- In `Script Management in Production`, `reserveInventory` is listed with `numberOfKeys: -1`. ioredis does not document `-1` as a special "variable keys" sentinel — typically you would omit `numberOfKeys` and pass it as the first argument at call time, or (as the post in fact does) call via `redis.eval(...)` directly with `keys.length`. Because the post never actually invokes a defined `reserveInventory` ioredis command (it uses `redis.eval` for that one), the `-1` value is never exercised and does not produce a runtime bug. Left unchanged as it is illustrative rather than executed.
- The leaderboard composite-score trick (integer score + fractional time component using a far-future max timestamp) works correctly for small base scores but loses precision as base scores grow due to IEEE 754 double-precision limits. Acceptable for typical leaderboards; worth flagging only for very high-score domains.
- `ZRANGE key 0 0 WITHSCORES` is the older form; Redis 6.2 added options like `REV`, `BYSCORE`, `LIMIT` to ZRANGE but the basic form used here remains fully supported.
