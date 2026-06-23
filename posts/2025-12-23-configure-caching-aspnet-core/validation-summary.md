# Validation Summary: How to Configure Caching in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- ASP.NET Core
- C#
- IMemoryCache
- IDistributedCache
- Redis / StackExchange.Redis
- Response Caching Middleware
- Output Caching Middleware
- ASP.NET Core health checks
- BackgroundService / hosted services

## Sources Consulted
- Microsoft Learn: Cache in-memory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/memory
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn: Response Caching Middleware in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/middleware
- Microsoft Learn: Response caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/response
- Microsoft Learn: Output caching middleware in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output
- Microsoft Learn: HybridCache library in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/hybrid
- Microsoft Learn: Caching in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/caching
- Microsoft Learn: ControllerBase.CreatedAtAction Method - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.controllerbase.createdataction
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- StackExchange.Redis documentation: Basic Usage - https://stackexchange.github.io/StackExchange.Redis/Basics.html

## Issues Found
- The introduction claimed the guide covers all caching options in ASP.NET Core. Changed this to "the main caching options" because ASP.NET Core also includes related features such as cache tag helpers and newer built-in HybridCache APIs.
- The memory cache size-limit comment described `SizeLimit` as a maximum number of cache entries. Changed it to clarify that `SizeLimit` is unitless and only behaves like an entry count when every entry uses `SetSize(1)`.
- The output cache invalidation example returned `Created()` with no arguments, which is not a valid `ControllerBase` helper overload. Changed it to `CreatedAtAction(nameof(GetProducts), product)`.
- The Redis invalidation example scanned Redis keys directly but removed them through `IDistributedCache.RemoveAsync`. With Redis instance-name prefixes, that can target the wrong key. Changed the example to delete the scanned Redis keys through `IDatabase.KeyDeleteAsync`.
- The `CacheWarmingService` declared readonly dependencies but had no constructor to assign them. Added a constructor that receives `IServiceScopeFactory` and `IDistributedCache`.

## Review Notes
- The examples are illustrative and omit using directives, repository interfaces, model definitions, and full endpoint registration.
- `dotnet` was not available in the local environment, so snippets were not compiled locally. The review was performed against official documentation and API references.
- In modern .NET, the built-in `Microsoft.Extensions.Caching.Hybrid.HybridCache` should be considered for production hybrid caching because it provides stampede protection and a unified API.
