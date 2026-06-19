# Validation Summary: How to Implement Idempotency Keys in .NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- .NET / C#
- ASP.NET Core middleware
- ASP.NET Core MVC action filters
- StackExchange.Redis
- Entity Framework Core
- System.Text.Json
- System.Net.Http.Json
- HTTP idempotency semantics

## Sources Consulted
- RFC 9110, HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- RFC 5789, PATCH Method for HTTP: https://www.rfc-editor.org/rfc/rfc5789.html
- ASP.NET Core middleware documentation: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/
- ASP.NET Core HttpMethods API documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httpmethods
- ASP.NET Core IAsyncActionFilter API documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.filters.iasyncactionfilter
- EF Core indexes documentation: https://learn.microsoft.com/en-us/ef/core/modeling/indexes
- JsonContent.Create API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.net.http.json.jsoncontent.create
- ReadFromJsonAsync API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.net.http.json.httpcontentjsonextensions.readfromjsonasync
- StackExchange.Redis basic usage documentation: https://stackexchange.github.io/StackExchange.Redis/Basics.html

## Issues Found
- The in-memory idempotency example defined an entry lifetime but did not apply it, and failed entries were never replayed as the comments claimed. I added expiry removal and explicit handling for failed entries so retries receive the stored failure instead of a misleading processing conflict.
- The middleware example introduced `TryLockAsync` on the store but did not use it, so concurrent requests with the same idempotency key could both execute before either response was cached. I added lock acquisition, conflict handling, and a second cache check after the lock is acquired.
- The Redis store and interface used a fixed default expiry even though the attribute exposed a `CacheSeconds` setting. I added an optional expiry parameter to `SetAsync` and passed `CacheSeconds` from the attribute.
- The Redis store comment described the example as production-ready even though the lock release is simplified and not owner-token checked. I changed the comment to "Redis-backed idempotency store" to avoid overstating the example.

## Review Notes
The examples are technically valid as tutorial snippets, but a production implementation should also hash and compare request payloads in middleware and attribute-based paths, store enough response metadata for non-JSON responses, and use an owner-token-based Redis lock release pattern if lock expiry might be shorter than operation duration.
