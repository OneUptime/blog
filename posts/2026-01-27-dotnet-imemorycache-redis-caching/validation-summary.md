# Validation Summary: How to Implement Caching with IMemoryCache and Redis in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- IMemoryCache
- IDistributedCache
- Redis
- StackExchange.Redis
- System.Text.Json

## Sources Consulted
- Microsoft Learn: Cache in-memory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/memory
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn: Caching in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/caching
- StackExchange.Redis documentation: Where are KEYS, SCAN, FLUSHDB etc? - https://stackexchange.github.io/StackExchange.Redis/KeysScan.html
- Redis command documentation: KEYS - https://redis.io/docs/latest/commands/keys/
- Redis command documentation: SCAN - https://redis.io/docs/latest/commands/scan/

## Issues Found
- The post said .NET evicts `IMemoryCache` entries based on priority when memory pressure occurs. ASP.NET Core documentation says the runtime does not limit or trim `IMemoryCache` automatically based on memory pressure. Updated the wording to say priority is used during configured size-limit eviction or manual compaction.
- The `CacheItemPriority.High` example comment still implied memory-pressure eviction. Updated it to refer to compaction instead.
- The `appsettings.json` example included a `// appsettings.json` comment inside a JSON block, making the snippet invalid JSON. Removed the comment from the JSON snippet.
- The Redis pattern invalidation section said Redis supports pattern-based key deletion. Redis does not delete by glob pattern directly; applications typically scan matching keys and delete them. Updated the wording to describe scanning by pattern combined with deletion.
- The memory cache vs Redis table described `IMemoryCache` latency as nanoseconds. Updated it to "in-process, typically microseconds" and described Redis latency as a network round trip, typically milliseconds.
- The Redis usage guidance said to use Redis when a cache must survive restarts. Clarified that Redis is appropriate when cache should survive application restarts or deployments, while Redis server persistence remains optional.

## Review Notes
The code examples are illustrative snippets and assume application-specific types such as `Product`, `IProductRepository`, `IEventBus`, and event classes exist. The manual hybrid caching example is technically valid, but modern .NET also provides `HybridCache` for applications that want a built-in two-level cache with stampede protection.
