# Validation Summary: How to Debug Lua Scripts with Redis Script Debugger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (3.2+)
- Lua scripting in Redis
- Redis Lua Debugger (LDB)
- redis-cli

## Sources Consulted
- Redis official documentation: Debugging Lua scripts — https://redis.io/docs/latest/develop/programmability/lua-debugging/
- Redis SCRIPT DEBUG command reference — https://redis.io/docs/latest/commands/script-debug/

## Issues Found

1. **Incorrect debugger command "reload"**: The commands table in Step 2 listed `reload - Reload the script from disk`, which is not a valid LDB command. Changed to `restart - Restart the script in debug mode`, which is the actual command available in the Redis Lua debugger.

2. **Inconsistent initial debugger output**: The example debugger session in Step 1 showed `-> 1   local limit = tonumber(ARGV[1])` as the first line when launching with `ratelimit.lua`. However, the actual `ratelimit.lua` script defined later in Step 3 has `local key = KEYS[1]` as line 1. Fixed the initial debugger output to show `-> 1   local key = KEYS[1]` for consistency.

3. **Inaccurate EVAL convention comparison**: The post stated the comma separator is "same as `EVAL` numkeys convention." The `EVAL` command uses an explicit integer numkeys parameter (`EVAL script numkeys key1 key2 arg1 arg2`), while `redis-cli --eval` uses a comma to separate keys from arguments. These are different conventions. Reworded to clarify the distinction.

## Review Notes
- The post omits several valid LDB commands (help, trace, eval, maxlen, abort) and the `redis.breakpoint()` function. These are omissions rather than errors — the post covers the most commonly used commands and is a practical tutorial, not an exhaustive reference.
- The Lua rate-limiting script example is syntactically correct and functional.
- All claims about forked vs synchronous debugging modes are accurate per official documentation.
- The `redis.debug()` behavior (prints in LDB, no-op in production) is correctly described.
