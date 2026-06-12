# Validation Summary: How to Build Custom Action Filters in ASP.NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- ASP.NET Core MVC
- Action filters
- Dependency injection
- IMemoryCache
- xUnit
- Moq

## Sources Consulted
- Microsoft Learn: Filters in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0
- Microsoft Learn: Create web APIs with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0
- Microsoft Learn: ActionFilterAttribute Class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.filters.actionfilterattribute?view=aspnetcore-10.0
- Microsoft Learn: Cache in-memory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/memory?view=aspnetcore-10.0
- Microsoft Learn: AddMemoryCache API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.memorycacheservicecollectionextensions.addmemorycache

## Issues Found
- The rate limiting examples refreshed the memory-cache expiration on every successful request by calling `_cache.Set(cacheKey, requestCount + 1, window)`. That made the stated fixed window behave like an extending window under steady traffic. I changed both rate-limiting snippets to cache a `RateLimitCounter` object with the expiration set only when the entry is created, then increment the cached counter with `Interlocked.Increment`.
- The edited rate-limiting snippet now explicitly imports `System.Threading` so the `Interlocked` usage is self-contained.

## Review Notes
- The filter lifecycle, filter ordering, `IActionFilter` and `IAsyncActionFilter` usage, short-circuiting with `context.Result`, `ServiceFilter`, `TypeFilter`, `IFilterFactory`, and `ActionFilterAttribute` guidance match current ASP.NET Core documentation.
- The validation filter is technically correct, but ASP.NET Core controllers using `[ApiController]` already get automatic HTTP 400 responses for invalid model state via `ModelStateInvalidFilter`.
- The in-memory rate-limiting and response-caching examples are suitable as simple single-server demonstrations. Production systems should account for distributed deployments, concurrency details, cache key design, memory growth, and built-in ASP.NET Core rate limiting or response caching features where appropriate.
