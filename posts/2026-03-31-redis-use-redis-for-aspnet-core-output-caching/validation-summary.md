# Validation Summary: How to Use Redis for ASP.NET Core Output Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- ASP.NET Core Output Caching middleware
- Microsoft.AspNetCore.OutputCaching.StackExchangeRedis NuGet package
- C# / .NET 8+
- Minimal API endpoints

## Sources Consulted
- Microsoft Docs: Output caching middleware in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output
- Microsoft Docs: OutputCachePolicyBuilder API — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.outputcachepolicybuilder
- Microsoft Docs: OutputCacheOptions API — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.outputcacheoptions
- Microsoft Docs: OutputCacheAttribute API — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.outputcacheattribute
- Microsoft Docs: IOutputCacheStore.EvictByTagAsync API — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.ioutputcachestore.evictbytagasync
- NuGet: Microsoft.AspNetCore.OutputCaching.StackExchangeRedis — https://www.nuget.org/packages/Microsoft.AspNetCore.OutputCaching.StackExchangeRedis

## Issues Found

### 1. Incorrect version claim for Redis output cache store package
- **What was wrong:** The description said "ASP.NET Core 7+" and the introduction implied that the Redis output cache store (`Microsoft.AspNetCore.OutputCaching.StackExchangeRedis`) was available with ASP.NET Core 7. The Redis package was first published with .NET 8 (version 8.0.0, November 2023). Output Caching itself was introduced in .NET 7, but the Redis store requires .NET 8+.
- **What was changed:** Updated the description from "ASP.NET Core 7+" to "ASP.NET Core 8+" and rewrote the introduction to clarify that Output Caching was introduced in .NET 7 while Redis support was added in .NET 8.
- **Why:** Readers targeting .NET 7 would find the package unavailable, causing confusion.

### 2. PerUser caching policies would not cache authenticated requests
- **What was wrong:** The "Custom Cache Key Policy" section defined `PerUser` and `PerUserAndQuery` policies using `SetVaryByHeader("Authorization")`, but the default output caching policy explicitly skips caching for requests that include an `Authorization` header. Without overriding this default, these policies would silently fail to cache anything for authenticated users.
- **What was changed:** Added `excludeDefaultPolicy: true` parameter to both `AddPolicy` calls for the `PerUser` and `PerUserAndQuery` policies, along with a comment explaining why it is required.
- **Why:** The default policy checks for the `Authorization` header and sets `AllowCacheLookup = false` and `AllowCacheStorage = false`. The `excludeDefaultPolicy` parameter tells the middleware to skip the default policy for endpoints using these named policies, allowing the vary-by-header configuration to work as intended.

## Review Notes
- The `SetVaryByQuery("*")` wildcard pattern (used in the `PerUserAndQuery` policy) is not explicitly documented in the `SetVaryByQuery` API reference, but it works because the builder sets `CacheVaryByRules.QueryKeys` internally and `"*"` is the recognized wildcard value at that level. The more explicit documented approach is setting `context.CacheVaryByRules.QueryKeys = "*"` in a custom policy.
- The PerUser caching pattern (caching by Authorization header) should be used with caution. Token-based auth with many unique tokens can lead to high cache cardinality and excessive Redis memory usage.
- All other API usages (`AddOutputCache`, `AddStackExchangeRedisOutputCache`, `AddBasePolicy`, `AddPolicy`, `OutputCacheAttribute`, `CacheOutput`, `IOutputCacheStore.EvictByTagAsync`, `Expire`, `SetVaryByQuery`, `Tag`) were verified as correct against the official Microsoft documentation.
