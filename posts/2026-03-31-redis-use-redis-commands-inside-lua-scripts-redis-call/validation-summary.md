# Validation Summary: How to Use Redis Commands Inside Lua Scripts (redis.call)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server-side Lua scripting via EVAL)
- Lua (embedded scripting language in Redis)
- redis.call() function
- Redis commands: SET, GET, INCRBY, RPUSH, LLEN, LRANGE, HSET, HGETALL, INCR, EXPIRE

## Sources Consulted
- Redis official documentation on Lua scripting and EVAL: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Redis EVAL command reference: https://redis.io/docs/latest/commands/eval/
- Redis Lua API reference: https://redis.io/docs/latest/develop/interact/programmability/lua-api/
- Redis command flags documentation (for `no-script` flag on blocked commands)

## Issues Found
1. **DEBUG SLEEP description was misleading**: The post described `DEBUG SLEEP` as "only allowed in debug mode," which implies there is a mode that would enable it inside scripts. In reality, `DEBUG SLEEP` is an administrative/debug command that is blocked in Lua scripts via the `no-script` command flag. Redis's `SCRIPT DEBUG` mode (for step-through debugging of Lua scripts) does not enable DEBUG commands within scripts. Changed the description to "administrative debug command" for accuracy.

## Review Notes
- The post correctly covers the Redis-to-Lua type conversion table, which is a common source of confusion (especially nil mapping to `false` rather than Lua `nil`).
- The list of disallowed commands is illustrative, not exhaustive. Other commands like `PUNSUBSCRIBE`, `BLPOP`, `BRPOP`, and `MULTI`/`EXEC` are also blocked in scripts but are not mentioned. This is acceptable since the post says "Some commands" and doesn't claim completeness.
- The "Pipeline Multiple Commands" section heading is slightly misleading since Lua scripts don't use Redis pipelining — the commands execute sequentially within the script's atomic context. However, the body text correctly states they execute "sequentially and atomically," so this is a style choice rather than a technical error.
- All EVAL invocations use correct syntax with proper numkeys arguments and KEYS/ARGV references. The HSET multi-field syntax used is valid for Redis 4.0+, which is standard in current deployments.
