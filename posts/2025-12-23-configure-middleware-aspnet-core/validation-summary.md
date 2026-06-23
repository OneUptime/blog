# Validation Summary: How to Configure Middleware in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core
- .NET
- C#
- Middleware
- Dependency injection
- HTTP request/response pipeline
- Kestrel

## Sources Consulted
- Microsoft Learn: ASP.NET Core Middleware - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/
- Microsoft Learn: Write custom ASP.NET Core middleware - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write
- Microsoft Learn: Dependency injection in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn: Test ASP.NET Core middleware - https://learn.microsoft.com/en-us/aspnet/core/test/middleware
- Microsoft Learn: What's new in ASP.NET Core in .NET 8 - https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-8.0
- Microsoft Learn: KestrelServerOptions.AddServerHeader - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.server.kestrel.core.kestrelserveroptions.addserverheader
- Microsoft Learn: Configure options for the ASP.NET Core Kestrel web server - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/options
- MDN Web Docs: X-XSS-Protection header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The response header examples used `context.Response.Headers.Add(...)`. In current ASP.NET Core guidance and analyzers, `IHeaderDictionary.Append` or the indexer is preferred. Updated the examples to use `Append(...)`.
- The security headers middleware attempted to remove the `Server` response header with `context.Response.Headers.Remove("Server")`. Kestrel controls its own `Server` header with `KestrelServerOptions.AddServerHeader`, so the post now shows `builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);`.
- The security headers middleware included `X-XSS-Protection: 1; mode=block`. This is a legacy, non-standard header, and MDN recommends using Content Security Policy instead of XSS filtering. Removed the `X-XSS-Protection` line.

## Review Notes
The middleware ordering guidance is broadly consistent with Microsoft documentation. Some ordering is scenario-specific, especially response caching versus response compression and static files, and rate limiting depends on whether endpoint-specific APIs are used. The Content Security Policy example is intentionally simple for a middleware tutorial; production applications should tune CSP for their actual scripts, styles, and assets.
