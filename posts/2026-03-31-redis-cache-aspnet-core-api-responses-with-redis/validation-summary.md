# Validation Summary: How to Cache ASP.NET Core API Responses with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- ASP.NET Core
- C#
- Microsoft.Extensions.Caching.StackExchangeRedis (NuGet package)
- IDistributedCache interface
- System.Text.Json
- ASP.NET Core Middleware

## Sources Consulted
- Microsoft official docs: Distributed caching in ASP.NET Core (https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed)
- Microsoft official docs: DistributedCacheEntryOptions class (https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.distributedcacheentryoptions)
- Microsoft official docs: IDistributedCache interface (https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.idistributedcache)
- Microsoft official docs: ASP.NET Core Middleware (https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware)
- NuGet: Microsoft.Extensions.Caching.StackExchangeRedis (https://www.nuget.org/packages/Microsoft.Extensions.Caching.StackExchangeRedis)
- StackExchange.Redis connection string documentation (https://stackexchange.github.io/StackExchange.Redis/Configuration)

## Issues Found
No technical issues found.

## Review Notes
- The `GetOrSetAsync<T>` method in `RedisCacheService` has a subtle limitation: for value types (e.g., `int`), `default` returns 0 rather than null, so the `cached != null` check would always pass and return the default value instead of calling the factory when the key doesn't exist. This is a known limitation of this common pattern and works correctly for reference types, which is the typical use case for cached API responses.
- The `StreamReader` on the MemoryStream in the middleware is not explicitly disposed, which is intentional — disposing it with the default `leaveOpen: false` would also close the underlying MemoryStream prematurely. The MemoryStream itself is properly disposed via the `using` declaration.
- The post does not show how to register the middleware (e.g., `app.UseMiddleware<ResponseCacheMiddleware>()`), but this is a minor completeness concern rather than a technical error.
