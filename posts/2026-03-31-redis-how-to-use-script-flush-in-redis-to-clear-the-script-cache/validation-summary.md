# Validation Summary: How to Use SCRIPT FLUSH in Redis to Clear the Script Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SCRIPT FLUSH, SCRIPT LOAD, SCRIPT EXISTS, EVALSHA commands)
- Lua scripting in Redis
- Python redis-py client library
- Node.js node-redis (v4) client library
- Redis Cluster

## Sources Consulted
- Redis SCRIPT FLUSH documentation: https://redis.io/docs/latest/commands/script-flush/
- Redis SCRIPT LOAD documentation: https://redis.io/docs/latest/commands/script-load/
- Redis SCRIPT EXISTS documentation: https://redis.io/docs/latest/commands/script-exists/
- Redis EVALSHA documentation: https://redis.io/docs/latest/commands/evalsha/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- redis-py GitHub repository and API reference: https://github.com/redis/redis-py
- node-redis GitHub repository and API reference: https://github.com/redis/node-redis

## Issues Found

1. **Python `script_flush()` async parameter name was incorrect**
   - **What was wrong:** The post used `client.script_flush(asynchronous=True)` and `client.script_flush(asynchronous=False)` in the "Practical Example with Async Flush in Python" section.
   - **What was changed:** Corrected to `client.script_flush(sync_type="ASYNC")` and `client.script_flush(sync_type="SYNC")`.
   - **Why:** The redis-py library's `script_flush()` method accepts a `sync_type` parameter with string values `"ASYNC"` or `"SYNC"`, not an `asynchronous` boolean parameter. The `asynchronous` parameter was used by `flushall()` and `flushdb()` in older redis-py versions but was never the parameter name for `script_flush()`.

2. **Node.js `scriptExists` return type comments were incorrect**
   - **What was wrong:** Comments showed `// [1]` and `// [0]` as return values from `client.scriptExists()`.
   - **What was changed:** Corrected to `// [true]` and `// [false]`.
   - **Why:** In node-redis v4, `scriptExists()` returns `Promise<boolean[]>`, mapping the Redis integer responses (0/1) to JavaScript booleans (false/true).

## Review Notes
- The `used_memory_scripts` INFO field referenced in the "Memory Impact" section is correct for Redis 7.0+. In Redis 6.x, the equivalent field was `used_memory_lua`. Since the blog discusses Redis 6.2 features (ASYNC/SYNC options), readers on Redis 6.x should look for `used_memory_lua` instead. This is a minor version-specific caveat, not an error.
- The Redis Cluster section correctly notes that script caches are per-node. The redis-py `RedisCluster.script_flush()` example works as shown because redis-py defaults to sending the command to all primary nodes.
- All Lua script examples are syntactically correct and use valid Redis commands.
- The ASYNC/SYNC behavior and `lazyfree-lazy-user-flush` configuration details are accurate per Redis 6.2.0 release notes.
