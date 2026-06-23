# Validation Summary: How to Configure Response Caching in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET / ASP.NET Core
- C#
- Response Caching Middleware (`AddResponseCaching` / `UseResponseCaching`)
- `ResponseCache` attribute and Cache Profiles
- Output Caching (.NET 7+: `AddOutputCache` / `UseOutputCache` / `CacheOutput`)
- Distributed output caching with Redis (`AddStackExchangeRedisOutputCache`)
- HTTP caching concepts: ETags, `Cache-Control`, `Vary`, conditional requests (304 Not Modified)

## Sources Consulted
- ASP.NET Core Response Caching Middleware docs — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/middleware
- `ResponseCache` attribute / response caching in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/response
- Output caching in ASP.NET Core (.NET 7+) — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output
- `IOutputCacheStore` / `EvictByTagAsync` API reference — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.outputcaching.ioutputcachestore
- `CacheProfile` / MVC cache profiles — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.cacheprofile
- `ResponseCachingOptions` API reference — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.responsecaching.responsecachingoptions
- `CacheControlHeaderValue` (Microsoft.Net.Http.Headers) — https://learn.microsoft.com/en-us/dotnet/api/microsoft.net.http.headers.cachecontrolheadervalue
- HTTP caching / Cache-Control / ETag — MDN & RFC 9111

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current, non-deprecated APIs:
- The basic middleware setup, `ResponseCache` attribute usage, `Location`/`NoStore` combinations, `VaryByHeader`, and `VaryByQueryKeys` are accurate.
- Cache profiles via `MvcOptions.CacheProfiles.Add(...)` with `CacheProfile` (Duration, Location, VaryByHeader, NoStore) are correct.
- `ResponseCachingOptions` properties `MaximumBodySize`, `SizeLimit`, and `UseCaseSensitivePaths` are valid.
- Output caching APIs (`AddOutputCache`, `AddBasePolicy`, `AddPolicy`, `Expire`, `SetVaryByQuery`, `NoCache`, `Tag`, `UseOutputCache`, `CacheOutput`, `OutputCache` attribute) match the .NET 7+ API surface.
- `IOutputCacheStore.EvictByTagAsync(tag, CancellationToken)` and the `default` token argument are correct.
- `AddStackExchangeRedisOutputCache` with `Configuration`/`InstanceName` is the correct distributed output-cache registration.
- The ETag example (`Request.Headers.IfNoneMatch`, `Response.Headers.ETag`, `StatusCode(304)`) and the `CacheControlHeaderValue` usage (`Public`, `MaxAge`, `SharedMaxAge`, `MustRevalidate`) are valid.

## Review Notes
- `GetById` uses `[ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "id" })]` where `id` is a **route** parameter (`[HttpGet("{id}")]`), not a query-string key. `VaryByQueryKeys` only varies by query-string values. In practice the cache already differentiates `/api/products/1` from `/api/products/2` because they are distinct request paths, so this entry is redundant rather than harmful. The code compiles and behaves correctly; the only imprecision is the "Cache varies by ID parameter" comment. Left as-is since it is not a functional error.
- `VaryByQueryKeys` requires the response caching middleware (`UseResponseCaching`) to be registered; the post's basic setup section covers this prerequisite.
- Caching POST endpoints (e.g. `app.MapPost("/orders", ...).CacheOutput("NoCache")`) is fine — output caching only stores GET/HEAD responses by default, and the `NoCache` policy makes the intent explicit.
- Namespaces are omitted from snippets (e.g. `CacheControlHeaderValue` lives in `Microsoft.Net.Http.Headers`, `SHA256`/`JsonSerializer` in `System.Security.Cryptography`/`System.Text.Json`), which is normal for a tutorial focused on configuration.
