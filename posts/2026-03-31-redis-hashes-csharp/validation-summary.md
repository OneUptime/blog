# Validation Summary: How to Use Redis Hashes in C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hash data structure)
- C# (.NET)
- StackExchange.Redis (NuGet client library)

## Sources Consulted
- StackExchange.Redis GitHub repository IDatabase interface: https://github.com/StackExchange/StackExchange.Redis
- StackExchange.Redis API surface for `HashSetAsync`, `HashGetAsync`, `HashGetAllAsync`, `HashIncrementAsync`, `HashDeleteAsync`, `HashExistsAsync`, `HashKeysAsync`, `HashValuesAsync`, `HashLengthAsync`
- Redis HSET, HGET, HMGET, HGETALL, HINCRBY, HINCRBYFLOAT, HDEL, HEXISTS, HKEYS, HVALS, HLEN command documentation: https://redis.io/commands/

## Issues Found
No technical issues found.

All 9 API usage points were verified against the official StackExchange.Redis source:

1. **HashSetAsync(RedisKey, HashEntry[])** - Correct. Accepts `HashEntry[]` for bulk field setting.
2. **HashGetAsync** - Correct. Both single-field (`RedisValue` return) and multi-field (`RedisValue[]` return) overloads used properly.
3. **HashGetAllAsync** - Correct. Returns `HashEntry[]`.
4. **HashIncrementAsync** - Correct. Both `long` and `double` overloads exist and are used correctly.
5. **HashSetAsync with When.NotExists** - Correct. The single-field overload supports `When when = When.Always` parameter; passing `When.NotExists` is valid and returns `bool`.
6. **HashDeleteAsync** - Correct. Single field returns `bool`, multiple fields (`RedisValue[]`) returns `long`.
7. **HashExistsAsync** - Correct. Returns `bool`.
8. **HashKeysAsync, HashValuesAsync, HashLengthAsync** - Correct. All exist with the exact names and return types shown.
9. **HashEntry constructor** - Correct. Takes `(RedisValue name, RedisValue value)` with implicit string conversion.

## Review Notes
- The post uses C# records (`public record Product(...)`) which requires C# 9+ / .NET 5+. This is a reasonable modern baseline but could be noted for readers on older frameworks.
- The `ToDictionary` call on `HashEntry[]` requires `using System.Linq;` which is not shown in the import, but this is a minor stylistic omission common in tutorial snippets.
- The `redis` variable in `redis.GetDatabase()` is used without showing `ConnectionMultiplexer` setup, which is standard practice for focused tutorials that assume connection setup is covered elsewhere.
