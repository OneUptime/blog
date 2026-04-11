# Validation Summary: How to Use FUNCTION LOAD in Redis to Register Function Libraries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (FUNCTION LOAD, FCALL, redis.register_function)
- Lua scripting engine for Redis functions
- Python redis-py client library
- Node.js node-redis (v4+) client library

## Sources Consulted
- Redis official documentation for FUNCTION LOAD command (https://redis.io/docs/latest/commands/function-load/)
- Redis functions introduction documentation (https://redis.io/docs/latest/develop/interact/programmability/functions-intro/)
- Redis source code `src/script.c` for valid function flags
- node-redis GitHub repository for `fCall` and `functionLoad` API signatures (https://github.com/redis/node-redis)

## Issues Found

1. **Persistence claim in intro was incomplete**: The introduction stated functions persist "(when AOF is enabled)" but functions actually persist with both AOF and RDB persistence. The later "Persistence and Replication" section correctly mentioned both. Fixed the intro to say "(when persistence is enabled)" for consistency and accuracy.

2. **Unused `fs` import in Node.js example**: `const fs = require('fs');` was imported but never used in the Node.js code example. Removed the unused import.

3. **Incorrect Node.js `fcall` method name and signature**: The blog used `client.fcall('check_limit', ['rate:api:user:1'], ['10', '60'])` but the correct node-redis v4+ API uses `client.fCall()` (capital C) with an options object: `client.fCall('check_limit', { keys: ['rate:api:user:1'], arguments: ['10', '60'] })`. Fixed to match the actual API.

4. **Misleading variable name `sha` in Loading from File section**: The variable was named `sha` suggesting FUNCTION LOAD returns a SHA hash (like SCRIPT LOAD does), but FUNCTION LOAD actually returns the library name string. Renamed to `library_name` for accuracy.

## Review Notes
- The Node.js example uses top-level `await` with CommonJS `require()` syntax. Technically this requires ESM modules or an async wrapper function. This is a common simplification in code examples but could confuse beginners trying to run the code directly.
- The `invalidate_pattern` function in the multi-function library example uses SCAN to discover and delete keys without declaring them in the KEYS array. This works in standalone mode but would not work in Redis Cluster mode. The post does not claim cluster compatibility, so this is acceptable.
- The Lua function callbacks correctly use the `(keys, args)` signature, which is the correct format for Redis 7.0+ function libraries.
