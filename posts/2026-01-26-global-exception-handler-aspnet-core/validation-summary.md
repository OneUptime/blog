# Validation Summary: How to Build a Global Exception Handler in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core 8
- C#
- ASP.NET Core middleware
- `IExceptionHandler`
- Problem Details for HTTP APIs
- MVC model validation
- xUnit and Moq testing patterns

## Sources Consulted
- Microsoft Learn: Handle errors in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling
- Microsoft Learn: Handle errors in ASP.NET Core APIs - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api
- Microsoft Learn: What's new in ASP.NET Core in .NET 8 - https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-8.0
- Microsoft Learn: `HttpResponseJsonExtensions.WriteAsJsonAsync` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httpresponsejsonextensions.writeasjsonasync
- Microsoft Learn: `PathString` implicit conversion - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.pathstring.op_implicit
- IETF Datatracker: RFC 7807 Problem Details for HTTP APIs - https://datatracker.ietf.org/doc/html/rfc7807
- RFC Editor: RFC 9457 Problem Details for HTTP APIs - https://www.rfc-editor.org/info/rfc9457/

## Issues Found
- `WriteAsJsonAsync(problem, cancellationToken)` was used after setting `Response.ContentType` to `application/problem+json`. The official API documentation states that this overload sets the content type to `application/json; charset=utf-8`, so the sample would not actually return the advertised Problem Details media type. Updated both exception handler examples to use the overload with `contentType: "application/problem+json"`.
- The post said the response structure follows RFC 7807. RFC 7807 has been obsoleted by RFC 9457, and the custom `traceId`, `errors`, and `timestamp` fields are extension members rather than base Problem Details members. Updated the wording to reference the RFC 7807/RFC 9457 shape and clarify the extension members.
- The registration snippet said `AddProblemDetails()` is required for `IExceptionHandler` to work. The more precise behavior is that it is required for the parameterless `UseExceptionHandler()` default problem details service/fallback setup used in the snippet. Updated the comment accordingly.

## Review Notes
- The overall use of `IExceptionHandler`, `AddExceptionHandler<T>()`, `AddProblemDetails()`, and `UseExceptionHandler()` aligns with current ASP.NET Core documentation for .NET 8 and later.
- `IExceptionHandler` implementations are registered as singleton services. The sample constructor dependencies, `ILogger<T>` and `IHostEnvironment`, are safe for that lifetime.
- Mapping `OperationCanceledException` to HTTP 499 is a common convention but not a standard HTTP status code. The code uses a raw integer, which is valid, but teams should document that convention for clients.
