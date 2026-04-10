# Validation Summary: How to Build a Rate Limiter in C# with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- C# / .NET
- StackExchange.Redis (NuGet package)
- ASP.NET Core (middleware)
- Lua scripting (for atomic Redis operations)

## Sources Consulted
- StackExchange.Redis GitHub repository and API documentation: https://github.com/StackExchange/StackExchange.Redis
- StackExchange.Redis `IDatabase` interface — `ScriptEvaluateAsync` overloads: accepts `(string, RedisKey[], RedisValue[])` for raw Lua scripts, or `(LuaScript, object?)` for prepared scripts with `@param` substitution
- StackExchange.Redis `LuaScript.Prepare` documentation — uses `@paramName` syntax, not raw `KEYS[]/ARGV[]`
- Redis commands documentation (INCR, EXPIRE, ZREMRANGEBYSCORE, ZCARD, ZADD, PEXPIRE): https://redis.io/commands
- ASP.NET Core middleware documentation: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware
- HTTP 429 status code and Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429

## Issues Found

### 1. Incorrect use of `LuaScript.Prepare` with KEYS/ARGV-style evaluation (compile error)

**What was wrong:** The sliding window script was declared as `LuaScript SlidingWindowScript = LuaScript.Prepare(...)` using raw `KEYS[1]`/`ARGV[n]` Lua syntax, then passed to `_db.ScriptEvaluateAsync(SlidingWindowScript, new RedisKey[] { key }, new RedisValue[] { ... })`. This would not compile because `IDatabase.ScriptEvaluateAsync(LuaScript, object?, CommandFlags)` does not accept `RedisKey[]` and `RedisValue[]` as the second and third arguments. The `LuaScript.Prepare` API is designed for `@paramName` substitution with anonymous object parameters, not raw KEYS/ARGV indexing.

**What was changed:** Changed `LuaScript SlidingWindowScript = LuaScript.Prepare(@"...")` to `string SlidingWindowScript = @"..."` and removed the closing `);` to just `";`. This makes the code use the `ScriptEvaluateAsync(string, RedisKey[], RedisValue[])` overload, which correctly matches the raw KEYS/ARGV Lua syntax.

## Review Notes
- The fixed window rate limiter key format uses minute-level granularity (`yyyyMMddHHmm`), which works correctly with the demonstrated `windowSeconds: 60` usage but would not behave as expected for other window sizes. The `windowSeconds` parameter only controls the TTL, not the actual window boundary. This is acceptable for the tutorial's scope.
- The fixed window implementation has a minor race condition: if the process crashes between `StringIncrementAsync` (INCR) and `KeyExpireAsync` (EXPIRE), the key persists forever. A Lua script combining both operations would be more robust. This is a known trade-off in simplified examples.
- The rate limit headers section (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) uses undefined variables (`remaining`, `resetTimestamp`), which is intentional — it's an illustrative snippet, not a complete implementation.
- `ConnectionMultiplexer.Connect` (synchronous) is used at startup, which is a common and acceptable pattern, though `ConnectAsync` is available for async-preferred codebases.
