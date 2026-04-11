# Validation Summary: How to Use SCRIPT EXISTS in Redis to Check Cached Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SCRIPT EXISTS, SCRIPT LOAD, SCRIPT FLUSH, EVALSHA commands)
- Lua scripting in Redis
- Python (redis-py client library)
- Node.js (node-redis v4 client library)

## Sources Consulted
- Redis official documentation for SCRIPT EXISTS: https://redis.io/commands/script-exists/
- Redis official documentation for SCRIPT LOAD: https://redis.io/commands/script-load/
- Redis official documentation for EVALSHA: https://redis.io/commands/evalsha/
- redis-py documentation for script_exists and script_load methods
- node-redis v4 documentation for scriptExists and scriptLoad methods

## Issues Found
1. **Incorrect SHA1 hash for `return 'hello'`**: The post claimed `SCRIPT LOAD "return 'hello'"` returns SHA1 `2067d915024a3e1657c4169c84f809f8ec75b9a7`. The actual SHA1 of `return 'hello'` is `1b936e3fe509bcbc9cd0664897bbe8fd0cac101b`. Fixed both the SCRIPT LOAD output comment and the subsequent SCRIPT EXISTS command to use the correct hash.

## Review Notes
- The command syntax, return value semantics (1 for cached, 0 for absent), and eviction conditions (SCRIPT FLUSH, server restart, DEBUG RELOAD) are all accurate.
- The Python redis-py API usage is correct: `script_load()` returns the SHA, `script_exists()` accepts variadic SHA arguments and returns a list of booleans, and `evalsha()` takes (sha, numkeys, *args).
- The Node.js node-redis v4 API usage is correct: `scriptLoad()`, `scriptExists()` (accepts array, returns array of booleans), and `scriptLoad()` for reloading.
- The Node.js example uses top-level `await`, which requires ES modules or Node.js 14.8+ with appropriate configuration. This is standard practice for node-redis v4 examples.
- The Lua scripts (rate limiter and compare-and-swap) are syntactically correct and use appropriate Redis commands.
