# Validation Summary: How to Implement Multi-Level Caching in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core dependency injection
- C#
- `IMemoryCache`
- `IDistributedCache`
- Redis
- StackExchange.Redis
- ASP.NET Core health checks
- Cache stampede protection
- Cache invalidation and Redis pub/sub

## Sources Consulted
- Microsoft Learn: Cache in-memory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/memory
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn: `IDistributedCache` API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.idistributedcache
- Microsoft Learn: `DistributedCacheExtensions.SetStringAsync` API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.distributedcacheextensions.setstringasync
- Microsoft Learn: `dotnet package add` command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- StackExchange.Redis documentation: Basic usage, server access, and pub/sub - https://stackexchange.github.io/StackExchange.Redis/Basics.html
- Redis command documentation: SCAN - https://redis.io/docs/latest/commands/scan/
- Redis documentation: Pub/Sub - https://redis.io/docs/latest/develop/pubsub/

## Issues Found
- The package installation commands used the .NET 9-and-earlier `dotnet add package` form. Updated them to the current .NET 10 `dotnet package add` form and added a compatibility note for .NET 9 SDK or earlier.
- The `StampedeProtectedCache` attempted to remove a per-key `SemaphoreSlim` after release based on `CurrentCount`. That cleanup can race with another request that has already obtained the old semaphore but has not awaited it yet, allowing two factories to run for the same key. Removed the cleanup block so each key keeps a stable semaphore.
- The `CacheInvalidator` snippet declared `readonly` fields for `IConnectionMultiplexer` and `IMemoryCache` without initializing them. Added a constructor so the snippet is syntactically valid and matches dependency injection usage.
- The cache health check wrote to `IMemoryCache` using the `TimeSpan` overload. Because the article configures `MemoryCacheOptions.SizeLimit`, every entry added to that cache must specify a size. Updated the health check to use `MemoryCacheEntryOptions` with `Size = 1`.
- The best-practices list said to always set size limits on in-memory caches. Microsoft documents that applying `SizeLimit` to a shared DI cache can make the app fail if other components add entries without sizes. Narrowed the wording to dedicated in-memory caches.

## Review Notes
The core multi-level caching flow, `AddMemoryCache`, `AddStackExchangeRedisCache`, `IDistributedCache` string APIs, Redis SCAN-based pattern invalidation concept, Redis pub/sub concept, and ASP.NET Core health check pattern are consistent with current documentation. I could not compile the snippets locally because the `dotnet` SDK is not installed in this environment.
