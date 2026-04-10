# Validation Summary: How to Use Redis as a SignalR Backplane in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub)
- ASP.NET Core SignalR
- Microsoft.AspNetCore.SignalR.StackExchangeRedis NuGet package
- StackExchange.Redis client library
- Docker Compose
- .NET minimal APIs

## Sources Consulted
- Microsoft Learn: Redis backplane for ASP.NET Core SignalR — https://learn.microsoft.com/en-us/aspnet/core/signalr/redis-backplane
- NuGet: Microsoft.AspNetCore.SignalR.StackExchangeRedis — https://www.nuget.org/packages/Microsoft.AspNetCore.SignalR.StackExchangeRedis/
- StackExchange.Redis Configuration docs — https://stackexchange.github.io/StackExchange.Redis/Configuration.html
- StackExchange.Redis GitHub source (RedisDependencyInjectionExtensions, RedisHubLifetimeManager) — https://github.com/dotnet/aspnetcore/tree/main/src/SignalR/server/StackExchangeRedis/src
- StackExchange.Redis LinearRetry source — https://github.com/StackExchange/StackExchange.Redis/blob/main/src/StackExchange.Redis/LinearRetry.cs

## Issues Found
1. **Health check endpoint missing IConnectionMultiplexer DI registration**: The "Checking Backplane Health" section injected `IConnectionMultiplexer` from DI via a minimal API endpoint, but `AddStackExchangeRedis` for SignalR does NOT register `IConnectionMultiplexer` in the service collection — it manages its own internal Redis connection. This would cause a runtime DI resolution failure. **Fix**: Added a note explaining that `IConnectionMultiplexer` must be registered separately, along with the registration code (`builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(...))`) before the health check endpoint.

## Review Notes
- The Docker Compose file uses `version: "3.9"`. The `version` key is deprecated in Docker Compose V2 (now the standard) and is silently ignored. It does not cause errors, but could be removed in a future update for cleanliness.
- All other code examples (hub definition, `AddStackExchangeRedis` configuration, `IHubContext` injection, `RedisChannel.Literal` for channel prefix, `ConfigurationOptions` with `LinearRetry`) are syntactically correct and use current, non-deprecated APIs.
- The explanation of how the Redis backplane works (Pub/Sub broadcasting across instances) is accurate.
