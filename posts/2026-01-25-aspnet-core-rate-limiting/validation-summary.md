# Validation Summary: How to Implement Rate Limiting in ASP.NET Core 8

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- ASP.NET Core 8
- Microsoft.AspNetCore.RateLimiting middleware
- System.Threading.RateLimiting
- C#
- Redis / StackExchange.Redis
- xUnit and WebApplicationFactory

## Sources Consulted
- Microsoft Learn: Rate limiting middleware in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
- Microsoft Learn: Rate limiter samples - https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit-samples
- Microsoft Learn: System.Threading.RateLimiting namespace - https://learn.microsoft.com/en-us/dotnet/api/system.threading.ratelimiting
- Microsoft Learn: RateLimitLease.TryGetMetadata - https://learn.microsoft.com/en-us/dotnet/api/system.threading.ratelimiting.ratelimitlease.trygetmetadata
- Microsoft Learn: RateLimiterOptions - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.ratelimiting.ratelimiteroptions
- dotnet/runtime reference source for System.Threading.RateLimiting - https://github.com/dotnet/runtime/blob/main/src/libraries/System.Threading.RateLimiting/ref/System.Threading.RateLimiting.cs
- OneUptime related post: https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view
- OneUptime related post: https://oneuptime.com/blog/post/2026-01-25-aspnet-core-health-checks/view

## Issues Found
- The "Adding Rate Limit Headers" section said the built-in rate limiter middleware stores metadata in `HttpContext.Items` under `RateLimitInfo`. Microsoft documentation describes `OnRejected`, lease metadata such as `RetryAfter`, and built-in metrics, but does not document automatic per-request remaining-limit metadata in `HttpContext.Items`. Updated the text and code comment to make clear that applications must populate that item from their own policy or custom limiter.
- The Redis fixed-window example incremented the Redis counter before checking the permit limit, so rejected requests consumed permits and pushed the counter beyond the configured limit. Updated the Lua script to atomically check the current count, reject without incrementing when the request would exceed the limit, and use `INCRBY` with `permitCount` when a lease is acquired.

## Review Notes
- The core ASP.NET Core examples use current documented APIs: `AddRateLimiter`, `AddFixedWindowLimiter`, `AddSlidingWindowLimiter`, `AddTokenBucketLimiter`, `AddConcurrencyLimiter`, `RateLimitPartition`, `RequireRateLimiting`, `EnableRateLimiting`, `DisableRateLimiting`, `OnRejected`, and `MetadataName.RetryAfter`.
- Microsoft documentation notes that the default rejection status is 503 unless `RejectionStatusCode` is changed; the post correctly sets 429 where it needs that behavior.
- I could not compile the snippets locally because the `dotnet` CLI is not installed in this environment.
