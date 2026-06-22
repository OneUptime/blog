# Validation Summary: How to Debug Redis Lua Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Lua scripting
- Redis commands: EVAL, EVALSHA, SCRIPT LOAD, SCRIPT KILL, CONFIG GET, CONFIG SET, GET, SET, INCR, EXPIRE, MGET, HSET, LRANGE
- Redis Lua API: redis.call, redis.pcall, redis.log, redis.status_reply, redis.error_reply
- redis-cli
- Python redis-py
- pytest
- Lua 5.1

## Sources Consulted
- Redis Scripting with Lua: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis EVAL command reference: https://redis.io/docs/latest/commands/eval/
- Redis EVALSHA command reference: https://redis.io/docs/latest/commands/evalsha/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis Lua debugging documentation: https://redis.io/docs/latest/develop/programmability/lua-debugging/
- Redis SCRIPT KILL command reference: https://redis.io/docs/latest/commands/script-kill/
- Redis SCAN command reference: https://redis.io/docs/latest/commands/scan/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html
- Lua 5.1 Reference Manual: https://www.lua.org/manual/5.1/

## Issues Found
- The "Return Debug Information" example used `tonumber(value) + 1`, which fails if the key is missing or contains a non-numeric value. Changed it to `(tonumber(value) or 0) + 1`.
- The "Wrong Number of Keys" section described using `ARGV` for a key as a wrong-number-of-keys error. Redis documentation instead requires all accessed keys to be passed as key arguments via `KEYS`. Renamed the section to "Undeclared Key Arguments" and corrected the comment.
- The script timeout example showed `SCRIPT KILL` without mentioning its write limitation. Added that it applies to a running script that has not performed writes.
- The data type example hard-coded Redis key names inside the Lua script, which conflicts with Redis scripting guidance that accessed keys should be provided through `KEYS`. Changed the example to use `KEYS`.
- The large return value example used `KEYS` and a full `SCAN` loop inside a Lua script. Replaced it with a bounded `LRANGE` pagination example against an explicitly provided key.

## Review Notes
Redis 7.4 introduced least-recently-used eviction for scripts loaded with `EVAL`/`EVAL_RO` when the script cache reaches a limit. The post's EVALSHA/NOSCRIPT fallback guidance remains valid, but future updates could mention this newer cache behavior.
