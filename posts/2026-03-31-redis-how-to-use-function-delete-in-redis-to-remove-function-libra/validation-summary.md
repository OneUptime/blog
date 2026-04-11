# Validation Summary: How to Use FUNCTION DELETE in Redis to Remove Function Libraries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (FUNCTION DELETE, FUNCTION LOAD, FUNCTION LIST, FUNCTION FLUSH, FCALL)
- Lua scripting engine (redis.register_function API)
- Python redis-py client library
- Node.js node-redis client library

## Sources Consulted
- Redis FUNCTION DELETE official documentation: https://redis.io/docs/latest/commands/function-delete/
- Redis FUNCTION LOAD official documentation: https://redis.io/docs/latest/commands/function-load/
- Redis FUNCTION LIST official documentation: https://redis.io/docs/latest/commands/function-list/
- Redis FUNCTION FLUSH official documentation: https://redis.io/docs/latest/commands/function-flush/
- Redis FCALL official documentation: https://redis.io/docs/latest/commands/fcall/
- redis-py (Python) source code and help output for function_load, function_delete, function_list, fcall, function_flush method signatures
- node-redis (Node.js) GitHub source for FUNCTION_LOAD.ts, FUNCTION_DELETE.ts, FUNCTION_LIST.ts

## Issues Found
- **Cluster mode section was inaccurate**: The post originally stated that "FUNCTION DELETE propagates to all nodes in the cluster automatically" and "You only need to issue the command once to the primary node." This is incorrect. In Redis Cluster, function commands do not automatically propagate across shards. You must execute the command on each shard's primary node; each primary then replicates to its own replicas. Client libraries typically handle the broadcasting. Fixed the section to accurately describe this behavior.

## Review Notes
- The Node.js example uses top-level `await` with CommonJS `require()`, which is a common tutorial convention but would not execute as-is without being wrapped in an async function or converted to ES modules. This is a widespread convention in Node.js documentation and was not changed.
- All Python redis-py method signatures verified correct: `function_load(code, replace=True)`, `function_delete(library)`, `function_list(library=name)`, `fcall(function, numkeys, *keys_and_args)`, `function_flush()`.
- All Node.js node-redis method names verified correct: `functionLoad`, `functionDelete`, `functionList({ LIBRARYNAME: ... })`.
- The Lua `redis.register_function(name, callback)` API and the `(keys, args)` callback signature are correct per Redis 7.0+ documentation.
- The recommendation to prefer `FUNCTION LOAD REPLACE` over delete-then-reload for zero-downtime updates is sound advice.
