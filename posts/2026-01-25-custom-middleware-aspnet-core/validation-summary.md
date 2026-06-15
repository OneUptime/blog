# Validation Summary: How to Build Custom Middleware in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core
- ASP.NET Core middleware
- C#
- Dependency injection
- Options pattern
- HTTP request and response handling

## Sources Consulted
- Microsoft Learn: ASP.NET Core Middleware, https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/
- Microsoft Learn: Write custom ASP.NET Core middleware, https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write
- Microsoft Learn: Handle errors in ASP.NET Core, https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling
- Microsoft Learn: Options pattern in ASP.NET Core, https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options
- Microsoft Learn: ResponseExtensions.Clear(HttpResponse), https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.responseextensions.clear
- Microsoft Learn: Rate limiting middleware in ASP.NET Core, https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit

## Issues Found
- The exception handling middleware attempted to write a JSON error response even if the response had already started. This is unsafe because ASP.NET Core cannot reliably change headers, status code, or response format after the response starts. I added a `context.Response.HasStarted` guard in the `catch` block and rethrow with `throw;` so the original stack trace is preserved.
- The exception handling middleware did not clear any existing unstarted response before setting the error status and JSON content type. I added `context.Response.Clear()` before writing the error response.
- The response manipulation example was labeled `ResponseCompressionMiddleware.cs` even though the class wraps JSON responses rather than compressing responses. I corrected the comment to `JsonResponseWrapperMiddleware.cs`.
- The response manipulation example did not restore `context.Response.Body` to the original stream in the non-JSON branch or if downstream middleware threw. I restored the original stream before copying the buffered response back and added a `finally` block so the stream is restored reliably.
- The response manipulation example attempted to deserialize the buffered body whenever the content type was JSON, which could fail for an empty JSON response. I added an empty-body check before deserializing.

## Review Notes
- The inline `app.Use(async (context, next) => await next(context))` style is valid for the current ASP.NET Core `RequestDelegate` overload.
- The custom rate-limiting example is technically valid as a teaching example, but production applications should generally prefer ASP.NET Core's built-in rate limiting middleware and should consider distributed storage when running multiple app instances.
