# Validation Summary: How to Use NRedisStack for Redis Modules in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NRedisStack (.NET client for Redis modules)
- StackExchange.Redis
- RedisJSON
- RediSearch
- RedisTimeSeries
- RedisBloom
- .NET / C#
- Docker (Redis Stack)

## Sources Consulted
- NRedisStack GitHub repository: https://github.com/redis/NRedisStack
- NRedisStack JSON interface source: https://github.com/redis/NRedisStack/blob/master/src/NRedisStack/Json/IJsonCommandsAsync.cs
- NRedisStack TimeSeries interface source: https://github.com/redis/NRedisStack/blob/master/src/NRedisStack/TimeSeries/ITimeSeriesCommandsAsync.cs
- NRedisStack TimeSeriesTuple source: https://github.com/redis/NRedisStack/blob/master/src/NRedisStack/TimeSeries/DataTypes/TimeSeriesTuple.cs
- NRedisStack v1.0.0 release notes (RedisGraph removal): https://github.com/redis/NRedisStack/releases
- Redis .NET client documentation: https://redis.io/docs/latest/develop/clients/dotnet/
- StackExchange.Redis documentation: https://stackexchange.github.io/StackExchange.Redis/

## Issues Found

### 1. RedisGraph reference is outdated (line 10)
- **What was wrong:** The intro paragraph listed RedisGraph as a supported module ("RedisJSON, RediSearch, RedisTimeSeries, RedisGraph, and RedisBloom"). RedisGraph was deprecated and completely removed from NRedisStack in v1.0.0.
- **What was changed:** Removed "RedisGraph" from the list of supported modules.
- **Why:** RedisGraph support was dropped in NRedisStack v1.0.0 (released for Redis 8.0). The `db.Graph()` API no longer exists. Mentioning it misleads readers into thinking it is available.

### 2. Non-existent `TsCreateParamsBuilder` class (lines 83-85)
- **What was wrong:** The TimeSeries create example used `new TsCreateParamsBuilder().SetRetentionTime(86400000).Build()`, but this builder class does not exist in NRedisStack. The `CreateAsync` method accepts parameters directly.
- **What was changed:** Replaced the builder pattern with the correct direct parameter call: `await ts.CreateAsync("latency:api", retentionTime: 86400000);`
- **Why:** `TsCreateParamsBuilder` is not a real class in the NRedisStack library. The `CreateAsync` method accepts `retentionTime` as an optional named parameter directly.

## Review Notes
- The `GetAsync<dynamic>` call is technically valid (the generic overload exists), but `System.Text.Json` deserializes `dynamic` as `JsonElement`, which may not behave as readers expect (no dynamic property access). A concrete type or `JsonElement` would be more practical, but this is a style/usability concern rather than a correctness error.
- The TimeSeries `AddAsync` with `"*"` and `RangeAsync` with `"-"` / `"+"` work correctly via implicit conversion from `string` to `TimeStamp` in NRedisStack.
- All other API calls (JSON Set/NumIncrby, FT Create/Search, BF Reserve/Add/Exists, ModuleList) were verified as correct against the NRedisStack source code.
