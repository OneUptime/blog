# Validation Summary: How to Use Azure Cache for Redis with ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cache for Redis
- ASP.NET Core (.NET 6+ minimal hosting, .NET 8+ output caching)
- StackExchange.Redis (NuGet client library)
- Microsoft.Extensions.Caching.StackExchangeRedis (IDistributedCache implementation)
- Microsoft.AspNetCore.OutputCaching.StackExchangeRedis (output cache store)
- C# / .NET

## Sources Consulted
- Microsoft Docs: ASP.NET Core Distributed Caching — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Docs: ASP.NET Core Output Caching — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output
- Microsoft Docs: OutputCacheAttribute API — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.outputcacheattribute
- Microsoft Docs: Azure Cache for Redis with ASP.NET Core — https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-web-app-aspnet-core-howto
- NuGet: Microsoft.AspNetCore.OutputCaching.StackExchangeRedis — https://www.nuget.org/packages/Microsoft.AspNetCore.OutputCaching.StackExchangeRedis
- StackExchange.Redis GitHub: IBatch interface — https://github.com/StackExchange/StackExchange.Redis/blob/main/src/StackExchange.Redis/Interfaces/IBatch.cs
- StackExchange.Redis Docs: Configuration — https://stackexchange.github.io/StackExchange.Redis/Configuration.html
- StackExchange.Redis Docs: Pipelines and Multiplexers — https://stackexchange.github.io/StackExchange.Redis/PipelinesMultiplexers.html

## Issues Found

1. **Output caching version incorrect (.NET 7+ → .NET 8+)**: The post stated "Output Caching with Redis (.NET 7+)" and "ASP.NET Core 7+ has a built-in output cache middleware that can use Redis." While the output cache middleware itself was introduced in .NET 7, the Redis backing store package (`Microsoft.AspNetCore.OutputCaching.StackExchangeRedis`) was introduced in .NET 8. The earliest version on NuGet is 8.0.0-rc.2. Changed to ".NET 8+" and clarified the text.

2. **Batch tasks not awaited in `SetUserSessionAsync`**: The method was declared `async Task` but never used `await`. The tasks returned by `batch.HashSetAsync()` and `batch.KeyExpireAsync()` were discarded, meaning any Redis errors would go unobserved and the compiler would emit warning CS1998. Fixed by capturing the tasks and awaiting them with `Task.WhenAll()` after `batch.Execute()`, which is the correct StackExchange.Redis batch pattern.

3. **Redundant and confusing `OutputCache` attribute parameters**: The `[OutputCache(Duration = 600, PolicyName = "LongCache")]` attribute set both an inline duration (10 minutes) and referenced the "LongCache" named policy (1 hour). When both are specified, the `Duration` overrides the policy's expiration, making the `PolicyName` reference misleading in a tutorial context. Removed `Duration = 600` so the named policy's configured expiration is used as intended.

## Review Notes
- The `StackExchange.Redis` package is explicitly installed alongside `Microsoft.Extensions.Caching.StackExchangeRedis`, which already depends on it transitively. This is not wrong — it ensures the direct-access APIs are available at a known version — but readers should know the second package is only needed if they use `IConnectionMultiplexer` directly.
- The connection string contains a placeholder `ACCESS_KEY`. In production, this should come from Azure Key Vault or environment variables, not `appsettings.json`. The post mentions Key Vault as an option, which is good.
- The `ConnectionMultiplexer.Connect()` registration as a singleton is a standard pattern, but `ConnectionMultiplexer.ConnectAsync()` would be preferable in an async application startup. This is a minor stylistic point, not an error.
