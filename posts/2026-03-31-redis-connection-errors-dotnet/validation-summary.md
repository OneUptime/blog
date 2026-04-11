# Validation Summary: How to Handle Redis Connection Errors in .NET

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (StackExchange.Redis client library)
- .NET / C#
- Polly (resilience and retry library, v7 API)
- ASP.NET Core Health Checks (`Microsoft.Extensions.Diagnostics.HealthChecks`)

## Sources Consulted
- StackExchange.Redis official documentation: https://stackexchange.github.io/StackExchange.Redis/
- StackExchange.Redis GitHub source for exception types (`RedisConnectionException`, `RedisTimeoutException`, `RedisServerException`, `RedisException`): https://github.com/StackExchange/StackExchange.Redis
- StackExchange.Redis `ConfigurationOptions` API reference for `ConnectTimeout`, `SyncTimeout`, `AsyncTimeout`, `AbortOnConnectFail`, `ReconnectRetryPolicy`, and `ExponentialRetry`
- Polly v7 documentation for `Policy.Handle<T>().Or<T>()` syntax: https://github.com/App-vNext/Polly
- .NET `TimeSpan` API reference for `TotalMilliseconds` property: https://learn.microsoft.com/en-us/dotnet/api/system.timespan
- ASP.NET Core health checks documentation for `IHealthCheck` interface: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks

## Issues Found

### 1. Incorrect Polly API: `.Handle()` should be `.Or()` (line 54)
- **What was wrong:** The code chained two `.Handle<T>()` calls: `Policy.Handle<RedisTimeoutException>().Handle<RedisConnectionException>()`. In Polly v7, `Policy.Handle<T>()` returns a `PolicyBuilder`, which does not have a second `.Handle<T>()` method. This would not compile.
- **What was changed:** Replaced `.Handle<RedisConnectionException>()` with `.Or<RedisConnectionException>()`.
- **Why:** `.Or<T>()` is the correct `PolicyBuilder` method for specifying additional exception types to handle.

### 2. Non-existent `TimeSpan` property: `TotalMs` should be `TotalMilliseconds` (line 59)
- **What was wrong:** The interpolated string used `delay.TotalMs`, but `System.TimeSpan` has no `TotalMs` property. This would not compile.
- **What was changed:** Replaced `delay.TotalMs` with `delay.TotalMilliseconds`.
- **Why:** `TotalMilliseconds` is the correct property name on `TimeSpan`.

## Review Notes
- The Polly example uses the v7 API (`Policy.Handle<T>().WaitAndRetryAsync()`). Polly v8 introduced a new resilience pipeline API. The v7 API is still functional and widely used, but authors may want to add a note about the newer Polly v8 API in the future.
- The health check class uses C# 12 primary constructor syntax, which requires .NET 8+. This is fine for a modern guide but worth noting for readers on older SDK versions.
