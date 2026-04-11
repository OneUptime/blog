# Validation Summary: How to Extend Redis with Custom Commands via Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Module API (C)
- Redis server (4.0+)
- C programming language

## Sources Consulted
- Redis Module API reference documentation (redis.io/docs/latest/develop/reference/modules/)
- Redis source code on GitHub — `src/module.c` and `src/redismodule.h` (github.com/redis/redis)
- Redis Module API function index for string key operations, reply functions, and command registration

## Issues Found
1. **Non-existent API function `RedisModule_StringGet`** (ThresholdIncrCommand example): The code used `RedisModule_StringGet(key, &val)` to read the current string value from an open key handle. This function does not exist in the Redis Module API. **Fix:** Replaced with the correct approach using `RedisModule_StringDMA(key, &len, REDISMODULE_READ)` to get the raw string pointer, then `RedisModule_CreateString(ctx, str, len)` to wrap it in a `RedisModuleString` for parsing with `RedisModule_StringToLongLong`. The DMA pointer itself is not freed (it points into the key's internal buffer), while the created `RedisModuleString` wrapper is properly freed.

## Review Notes
- `RedisModule_ReplyWithCString` was introduced in Redis 6.0. The post does not specify a minimum Redis version, but since Redis 6.0+ is well-established by 2026, this is not an issue.
- `RedisModule_ReplyWithDouble` was introduced in Redis 6.0 as well.
- All other API functions used (`RedisModule_CreateCommand`, `RedisModule_OpenKey`, `RedisModule_KeyType`, `RedisModule_StringSet`, `RedisModule_Call`, etc.) have been available since Redis 4.0 when the Module API was first introduced.
- The command flag descriptions are accurate. The `RedisModule_Call` format string usage (`"sl"` for RedisModuleString + long long) is correct.
