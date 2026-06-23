# Validation Summary: How to Fix 'DbContext disposed' Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- .NET / C#
- Entity Framework Core
- ASP.NET Core
- Dependency Injection (DI) lifetimes (Scoped, Singleton, Transient)
- `IDbContextFactory<T>`, `IServiceScopeFactory`, `BackgroundService`

## Sources Consulted
- EF Core DbContext lifetime, configuration, and initialization — https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/
- Using DbContext with dependency injection / `AddDbContextFactory` / `AddDbContextPool` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.entityframeworkservicecollectionextensions
- ASP.NET Core dependency injection and service lifetimes (captive dependency) — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- EF Core async query / `AsAsyncEnumerable` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.entityframeworkqueryableextensions
- EF Core logging / `EnableSensitiveDataLogging`, `EnableDetailedErrors`, `LogTo` — https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/
- `async void` vs `async Task` guidance — https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/

## Issues Found
No technical issues found.

The post's diagnosis and remediation patterns are all accurate:
- The reproduced `ObjectDisposedException` message matches EF Core's actual wording.
- `async void` being fire-and-forget (so the request scope disposes the context before the operation completes) is correctly identified as a primary cause.
- The scoped-into-singleton captive dependency problem and the `IDbContextFactory` fix are correct.
- `IDbContextFactory<T>.CreateDbContextAsync(CancellationToken)`, `AddDbContextFactory`, `AddDbContextPool(..., poolSize:)`, and `IServiceScopeFactory.CreateScope()` are all real, current APIs used correctly.
- `EnableSensitiveDataLogging`, `EnableDetailedErrors`, `LogTo(Console.WriteLine, LogLevel.Information)`, `ChangeTracker.HasChanges()`, `AsAsyncEnumerable()`, and `Enumerable.Chunk` are all valid.

## Review Notes
- A few snippets rely on `using` directives that are not shown (e.g. `System.Runtime.CompilerServices` for `[CallerMemberName]` and `[EnumeratorCancellation]`, `System.Linq` for `Chunk`). This is normal for illustrative blog snippets and not an error.
- `Enumerable.Chunk` requires .NET 6+; the broader code style (`await using`, file-scoped patterns) is consistent with modern .NET 6/7/8. No version is explicitly pinned in the post, which keeps it broadly applicable.
- Several action methods are typed `Task<Order>` / `Task<OrderDto>` while returning the result of `FirstOrDefaultAsync()`, which can be null. This is a nullability nuance, not a correctness bug, and matches common real-world code.
- The `AddDbContextPool` default pool size changed across EF Core versions (128 in early versions, 1024 from EF Core 6); the post explicitly passes `poolSize: 128`, so it is unaffected by the default change.
