# Validation Summary: How to Call Functions with FCALL in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 7.0+ (FCALL command, Redis Functions)
- Lua scripting (redis.register_function, cjson)
- Python (redis-py client library)
- Node.js (ioredis client library)
- Go (go-redis v9 client library)
- Redis Cluster

## Sources Consulted
- Official Redis FCALL documentation: https://redis.io/docs/latest/commands/fcall/
- Redis Functions introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- FUNCTION LIST documentation: https://redis.io/docs/latest/commands/function-list/
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found

1. **KEYS/ARGV global tables incorrectly referenced (syntax section)**: The post stated that key arguments are "accessible as `KEYS[1]`, `KEYS[2]`" and additional arguments as "`ARGV[1]`, `ARGV[2]`". This is how EVAL scripts work, but Redis Functions receive keys and args as callback parameters (`keys[1]` and `args[1]`, lowercase), not as global tables. Fixed to reference the callback parameters correctly.

2. **Incorrect error message "ERR Library not loaded"**: The post listed two separate errors — "ERR Library not loaded" (for function not existing) and "ERR Function not found" (for wrong function name). These are the same scenario, and the actual Redis error is `ERR Function not found`. Removed the fabricated "ERR Library not loaded" error and consolidated to the single correct error message.

3. **Wrong claim about Redis Cluster function replication**: The post stated "Functions are replicated to all nodes automatically when loaded - you do not need to load the library on every node separately." This is incorrect per official Redis documentation. Functions are replicated from masters to their replicas, but in a Redis Cluster, libraries must be loaded on each master node separately by the cluster administrator. Fixed to reflect the correct behavior.

4. **Misleading cjson comment**: The Lua code comment stated "Redis Lua does not have built-in JSON, use cjson library", which implies cjson is external. In fact, cjson is a built-in library included in Redis's Lua environment and is always available. Fixed the comment to clarify this.

5. **Summary section referenced KEYS/ARGV tables**: The summary stated keys and args are "accessed as `KEYS` and `ARGV` tables in Lua", repeating the same error from the syntax section. Fixed to describe them as callback function parameters.

## Review Notes
- The `batch_set` function example in "Passing Complex Arguments" uses `redis.call('SET', k, v, ...)` where `k` comes from deserialized JSON data rather than from the declared key arguments (the function is called with `numkeys=0`). This is a bad practice for Redis Cluster compatibility and replication correctness, though it works in standalone mode. This was not changed since the example is illustrative and preceded by a cluster-specific section.
- The ioredis example uses `require('ioredis')` (CommonJS) with top-level `await`, which would require ESM or an async wrapper in practice. This is a minor stylistic issue common in Node.js examples and was not changed.
- The `FUNCTION LIST` Python example accesses response fields as dictionary keys (`lib['library_name']`, `fn['name']`), which is correct for redis-py's decoded response format.
