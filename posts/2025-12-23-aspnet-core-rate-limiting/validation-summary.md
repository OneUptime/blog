# Validation Summary: How to Set Up Rate Limiting in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core (built-in rate limiting middleware, introduced in .NET 7)
- C# / .NET
- `System.Threading.RateLimiting` primitives (Fixed Window, Sliding Window, Token Bucket, Concurrency limiters)
- Minimal APIs and MVC Controllers
- RedisRateLimiting.AspNetCore (community package for distributed rate limiting)
- StackExchange.Redis (`ConnectionMultiplexer`)

## Sources Consulted
- Microsoft Learn — Rate limiting middleware in ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
- Microsoft Learn — `RateLimiterOptions` / `RateLimiterOptionsExtensions` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.ratelimiting
- Microsoft Learn — `System.Threading.RateLimiting` (FixedWindow/SlidingWindow/TokenBucket/Concurrency options): https://learn.microsoft.com/en-us/dotnet/api/system.threading.ratelimiting
- Microsoft Learn — `EnableRateLimitingAttribute` / `DisableRateLimitingAttribute`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.ratelimiting.enableratelimitingattribute
- NuGet — RedisRateLimiting.AspNetCore: https://www.nuget.org/packages/RedisRateLimiting.AspNetCore/
- GitHub — cristipufu/aspnetcore-redis-rate-limiting: https://github.com/cristipufu/aspnetcore-redis-rate-limiting

## Issues Found
- **Incorrect NuGet package name for distributed Redis rate limiting.** The "Distributed Rate Limiting with Redis" section instructed `dotnet add package RedisRateLimiting`, but the `AddRedisFixedWindowLimiter` extension method used in the example is provided by the `RedisRateLimiting.AspNetCore` package. The base `RedisRateLimiting` package only ships the core limiter primitives and does not include the `RateLimiterOptions` extension methods. Changed the install comment to `dotnet add package RedisRateLimiting.AspNetCore`.

## Review Notes
- The claim that ASP.NET Core 7.0 introduced built-in rate limiting middleware is correct.
- The four algorithms (Fixed Window, Sliding Window, Token Bucket, Concurrency) and all their option property names (`PermitLimit`, `Window`, `SegmentsPerWindow`, `TokenLimit`, `ReplenishmentPeriod`, `TokensPerPeriod`, `AutoReplenishment`, `QueueProcessingOrder`, `QueueLimit`) match the official API.
- `AddRateLimiter`, `GlobalLimiter`, `PartitionedRateLimiter.Create<HttpContext, string>`, `RateLimitPartition.GetFixedWindowLimiter`, `AddPolicy`, `RequireRateLimiting`, `EnableRateLimiting`/`DisableRateLimiting` attributes, and `app.UseRateLimiter()` placement are all used correctly.
- The `OnRejected` callback, `OnRejectedContext.Lease.TryGetMetadata(MetadataName.RetryAfter, ...)`, the strongly-typed `Response.Headers.RetryAfter`, and `IRateLimiterFeature` / `MetadataName.ReasonPhrase` usages are accurate.
- Caveat (not an error): `MetadataName.RetryAfter` is only populated by replenishing limiters (e.g., token bucket, sliding window) and not always by every limiter, so the post's fallback-to-60 pattern is the right defensive approach.
- The `RateLimitHeadersMiddleware` example is illustrative; for it to take effect it must be registered with `app.UseMiddleware<RateLimitHeadersMiddleware>()`, which the post does not show — acceptable for a focused snippet.
