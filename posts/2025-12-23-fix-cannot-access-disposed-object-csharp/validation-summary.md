# Validation Summary: How to Fix 'Cannot access a disposed object' Errors in C#

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- C#
- .NET
- IDisposable
- IAsyncDisposable
- ObjectDisposedException
- HttpClient and IHttpClientFactory
- ASP.NET Core dependency injection
- BackgroundService
- Entity Framework Core DbContext
- CancellationTokenSource

## Sources Consulted
- Microsoft Learn: ObjectDisposedException class - https://learn.microsoft.com/en-us/dotnet/api/system.objectdisposedexception
- Microsoft Learn: IDisposable.Dispose method - https://learn.microsoft.com/en-us/dotnet/api/system.idisposable.dispose
- Microsoft Learn: Implement a Dispose method - https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose
- Microsoft Learn: Implement a DisposeAsync method - https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync
- Microsoft Learn: C# using statement - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using
- Microsoft Learn: HttpClient guidelines for .NET - https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines
- Microsoft Learn: Use IHttpClientFactory - https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory
- Microsoft Learn: Use scoped services within a BackgroundService - https://learn.microsoft.com/en-us/dotnet/core/extensions/scoped-service
- Microsoft Learn: Dependency injection guidelines - https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines
- Microsoft Learn: EF Core DbContext lifetime, configuration, and initialization - https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/
- Microsoft Learn: CancellationTokenSource.Dispose method - https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.dispose

## Issues Found
- The first `GetDataBadAsync` example declared `response` inside a `using` statement and then referenced it after the block, which would not compile. I changed it to declare `HttpResponseMessage response` before the `using` block and assign it inside the `using`, so the example demonstrates use after disposal.
- The dependency injection section stated that injecting a scoped service into a singleton causes `ObjectDisposedException`. I updated the wording to note that ASP.NET Core DI scope validation may reject this mismatch up front, which matches current Microsoft guidance.
- The background service example described the failure as "disposed after first iteration." I changed the comments to describe the actual problem as a scoped `DbContext` captured by a singleton background service.
- The `HttpClient` bad example awaited `GetStringAsync` before leaving the `using` scope, so it did not demonstrate disposal before completion. I changed it to return the task directly from inside the `using` scope, causing the client to be disposed before the request task completes.
- The async disposal example used an inheritable class but did not include the recommended virtual async dispose pattern for non-sealed classes. I marked the class `sealed`, which is consistent with the simpler sealed-class async dispose pattern.

## Review Notes
The examples are illustrative snippets and assume surrounding application types and imports such as `AppDbContext`, `BackgroundService`, `GetRequiredService`, and EF Core async extension methods. I could not run a local compile check because the `dotnet` CLI is not installed in the review environment.
