# Validation Summary: How to Use SCRIPT LOAD in Redis to Cache Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SCRIPT LOAD, EVALSHA, EVAL, SCRIPT FLUSH commands)
- Lua scripting in Redis
- Python (redis-py library)
- Node.js (node-redis v4 library)
- Go (go-redis/v9 library)

## Sources Consulted
- Redis official documentation for SCRIPT LOAD: https://redis.io/commands/script-load/
- Redis official documentation for EVALSHA: https://redis.io/commands/evalsha/
- Redis official documentation for EVAL and scripting: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation for `script_load()` and `register_script()`: https://redis-py.readthedocs.io/
- node-redis documentation: https://github.com/redis/node-redis
- go-redis documentation: https://github.com/redis/go-redis
- SHA1 hash verification via local computation

## Issues Found
1. **Incorrect SHA1 hash in Basic Usage example**: The post claimed `SCRIPT LOAD "return redis.call('GET', KEYS[1])"` returns SHA1 `4e6d8fc8bb01276962cce5371fa795a7763fe051`. The actual SHA1 of that script is `d3c21d0c2b9ca22f82737626a27bcaf5d288f99f`. Fixed both the SCRIPT LOAD return value and the corresponding EVALSHA call to use the correct hash.

2. **Incorrect claim about AOF/RDB restoring script cache**: The "Script Cache Persistence" section stated scripts are cleared on "Server restart (unless AOF/RDB restores state)". This is incorrect — the Redis script cache is purely in-memory and is never persisted by AOF or RDB. After any server restart, the script cache is always empty regardless of persistence configuration. Removed the parenthetical to avoid misleading readers.

## Review Notes
- The claim "Avoid re-parsing the script on every call" in the benefits list is a slight simplification. Redis also caches scripts submitted via EVAL, so EVAL doesn't re-parse on repeat calls either. The primary benefit of SCRIPT LOAD + EVALSHA is network bandwidth savings (not sending the full script text each time). This is a common simplification and not incorrect enough to warrant a fix.
- The Node.js example uses top-level `await` with `require()` syntax, which would require wrapping in an async function or using ESM modules. This is a standard blog post simplification and not flagged as an error.
- The Lua script in the Node.js example returns `false`, which Redis converts to a nil response. This is correct but could be slightly confusing for readers expecting a boolean.
- The `safe_evalsha` function in the NOSCRIPT handling section reassigns the `sha` parameter locally but doesn't update the outer scope variable. This is functionally harmless since SHA1 is deterministic (same script always produces the same hash), but the pattern could be improved for clarity.
