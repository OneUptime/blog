# Validation Summary: How to Create Custom Minimal API Endpoint Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core Minimal APIs
- ASP.NET Core endpoint filters
- ASP.NET Core route groups
- ASP.NET Core dependency injection
- ASP.NET Core distributed caching
- ASP.NET Core authentication and authorization patterns
- DataAnnotations validation

## Sources Consulted
- Microsoft Learn: Filters in Minimal API apps - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters
- Microsoft Learn: Minimal APIs quick reference - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis
- Microsoft Learn: Create responses in Minimal API applications - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses
- Microsoft Learn: Authentication and authorization in Minimal APIs - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/security
- Microsoft Learn: Rate limiting middleware in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn API reference: StringValues equality and inequality operators - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.primitives.stringvalues.op_equality

## Issues Found
- The post said to register endpoint filter classes with the DI container before using `AddEndpointFilter<T>`. Microsoft documentation states that filters can receive constructor dependencies from DI, but the filter instances themselves are not resolved from DI. I removed the misleading scoped filter registrations and clarified the wording.
- The route group example applied `RateLimitFilter`, which requires `IDistributedCache`, without registering an `IDistributedCache` implementation. I added `builder.Services.AddDistributedMemoryCache()` to make the sample runnable as written.
- The response wrapper section claimed the filter wraps successful responses generally, but the code skips all explicit `IResult` values, including `Results.Ok(...)`. I narrowed the explanation to non-`IResult` handler results and removed an unused pattern variable.
- The caching filter factory requested `ILogger<CachingFilter>`, but no `CachingFilter` type is defined in the post. I changed it to create a logger through `ILoggerFactory` with a `"CachingFilter"` category.

## Review Notes
- The custom rate limiter demonstrates the endpoint filter pattern, but ASP.NET Core has built-in rate limiting middleware that should usually be preferred for production systems.
- The sample rate limiter uses a read-modify-write pattern over `IDistributedCache`; a production distributed limiter should use an atomic counter or the built-in rate limiting middleware to avoid concurrency races.
- `AddDistributedMemoryCache()` is suitable for local examples and single-instance apps. Multi-instance deployments should use a real distributed cache such as Redis, as the complete production example does.
