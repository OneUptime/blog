# Validation Summary: How to Implement In-Game Currency System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, HGET, HINCRBY, LPUSH, LTRIM, SET with EX, DECRBY, INCR, EVAL)
- Redis Lua scripting (redis.call, redis.error_reply)
- Python (redis-py client library)

## Sources Consulted
- Redis HSET command documentation — https://redis.io/docs/latest/commands/hset/
- Redis HGET command documentation — https://redis.io/docs/latest/commands/hget/
- Redis HINCRBY command documentation — https://redis.io/docs/latest/commands/hincrby/
- Redis DECRBY command documentation — https://redis.io/docs/latest/commands/decrby/
- Redis EVAL command documentation — https://redis.io/docs/latest/commands/eval/
- Redis Lua API reference — https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis Lua scripting type conversion (RESP2 nil → Lua false) — https://redis.io/docs/latest/develop/programmability/lua-api/#type-conversion
- Lua 5.1 reference manual (tonumber behavior) — https://www.lua.org/manual/5.1/manual.html
- redis-py documentation (eval method signature) — https://redis.readthedocs.io/en/stable/
- Redis LPUSH / LTRIM command documentation — https://redis.io/docs/latest/commands/ltrim/

## Issues Found
No technical issues found.

## Review Notes
- Multi-field `HSET` syntax requires Redis 4.0+. The post does not specify a minimum Redis version, which is fine since Redis 4.0 was released in 2017 and is widely deployed.
- The Currency Expiry section uses plain `DECRBY` for event coins, which can go negative — the same problem the post correctly identifies earlier for regular currency. This is not a technical error (the commands work as shown), but a design inconsistency worth noting: production code would likely want a Lua guard here too.
- The `tonumber(false)` path in the Lua scripts (when HGET returns nil for a non-existent field) correctly evaluates to `nil`, making the `balance == nil` check valid. This is a subtle but correct detail.
- The redis-py `eval()` API and argument ordering (numkeys, keys, then args) is used correctly throughout.
