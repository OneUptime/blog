# Validation Summary: How to Build Custom Hosted Services in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- .NET hosted services
- ASP.NET Core
- `IHostedService`
- `BackgroundService`
- Dependency injection scopes
- `System.Threading.Channels`
- ASP.NET Core health checks
- Cronos
- Polly retry policies

## Sources Consulted
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- Microsoft Learn: `BackgroundService.ExecuteAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.backgroundservice.executeasync
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: `HealthChecksBuilderAddCheckExtensions.AddCheck` API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.healthchecksbuilderaddcheckextensions.addcheck
- Microsoft Learn: Channels in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft Learn: `SemaphoreSlim.WaitAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.waitasync
- Microsoft Learn: `Task.Delay` API reference - https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.delay
- Cronos official GitHub repository - https://github.com/HangfireIO/Cronos
- Polly retry strategy documentation - https://www.pollydocs.org/strategies/retry.html

## Issues Found
- The `GracefulShutdownService` example called `FlushPendingItemsAsync` while already holding the same `SemaphoreSlim`, which would deadlock once the pending item count reached 10. I changed `ProcessNextItemAsync` to release the semaphore before calling `FlushPendingItemsAsync`.
- The `GracefulShutdownService` example could skip final flushing because `Task.Delay(..., stoppingToken)` throws `OperationCanceledException` during shutdown before execution reaches the cleanup call. I wrapped the loop in `try`/`catch`/`finally` so the final flush runs during graceful shutdown.
- The `MonitoredBackgroundService` example set `_isRunning` to `false` only after a normal loop exit, but cancellation from `Task.Delay(..., stoppingToken)` could bypass that assignment. I changed the loop to set `_isRunning` in a `finally` block.
- The health-check registration example manually called `builder.Services.BuildServiceProvider()` during service registration to create `MonitoredBackgroundService`. That creates an early, separate service provider and is not the correct DI pattern. I changed it to register `MonitoredBackgroundService` as a singleton, then reuse that singleton for `IHostedService` and `AddCheck<MonitoredBackgroundService>`.
- The Cronos example used `CreateScope()` without importing `Microsoft.Extensions.DependencyInjection` in that standalone snippet. I added the missing `using`.
- The Polly retry example handled all `Exception` values, which would include `OperationCanceledException` from shutdown cancellation. I changed the retry policy to exclude `OperationCanceledException` and pass the hosted-service cancellation token into `ExecuteAsync`.

## Review Notes
The `dotnet` CLI is not installed in this review environment, so I could not compile the snippets locally. The review was performed by static inspection against official documentation and authoritative project documentation. The timer example remains technically valid, but Microsoft notes that `System.Threading.Timer` does not wait for previous callback executions to finish, so a future improvement could mention overlap behavior or use `PeriodicTimer` for non-overlapping async work.
