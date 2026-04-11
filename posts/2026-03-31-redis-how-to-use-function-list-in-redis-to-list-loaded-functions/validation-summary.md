# Validation Summary: How to Use FUNCTION LIST in Redis to List Loaded Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (FUNCTION LIST, FUNCTION LOAD, FUNCTION STATS commands)
- Python (redis-py client library)
- Node.js (node-redis / @redis/client v4+)
- Go (go-redis/v9)
- Lua (Redis function scripting engine)

## Sources Consulted
- Redis official documentation for FUNCTION LIST: https://redis.io/commands/function-list/
- redis-py source code (v7.0.1) for `function_list` and `function_load` method signatures: https://github.com/redis/redis-py
- node-redis source code for `functionList`, `functionListWithCode`, and `functionLoad` method signatures: https://github.com/redis/node-redis
- go-redis/v9 source code for `FunctionList`, `FunctionListQuery`, `Library`, and `Function` types: https://github.com/redis/go-redis

## Issues Found

1. **Node.js Lua code bug — wrong variable in `register_function`**: The Lua code inside the `functionLoad` call used `redis.register_function('double', helpers)` where `helpers` is the library name string, not the function. Fixed to `redis.register_function('double', double)` to correctly reference the local function variable.

2. **Node.js `functionList` does not accept `WITHCODE` option**: The blog used `client.functionList({ WITHCODE: true })`, but node-redis v4 exposes a separate method `functionListWithCode()` for retrieving libraries with source code. Fixed the call to `client.functionListWithCode()`.

3. **Node.js property names are snake_case, not camelCase**: The blog used `lib.libraryName` and `lib.libraryCode`, but node-redis returns objects with snake_case keys (`library_name`, `library_code`). Fixed all property accesses in the Node.js example.

## Review Notes
- The Python examples (redis-py) use `withcode=True` and `library='cache'` which are correct per redis-py v7.0.1.
- The Go example correctly uses `redis.FunctionListQuery{}` and the `Library`/`Function` struct field names (`Name`, `Engine`, `Functions`).
- The Redis CLI syntax, output format, and LIBRARYNAME glob-style filtering are all accurate per Redis 7.0+ documentation.
- The FUNCTION STATS mention is accurate as a complementary command for quick overview.
