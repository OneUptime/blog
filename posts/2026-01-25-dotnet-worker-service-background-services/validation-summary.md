# Validation Summary: How to Build Background Services with .NET Worker Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET Worker Service
- C#
- BackgroundService and IHostedService
- Generic Host and dependency injection
- ASP.NET Core health checks
- System.Threading.Channels
- Kubernetes Deployments and liveness probes

## Sources Consulted
- Microsoft Learn: Worker services in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/workers
- Microsoft Learn: .NET Generic Host - https://learn.microsoft.com/en-us/dotnet/core/extensions/generic-host
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- Microsoft Learn: Use scoped services within a BackgroundService - https://learn.microsoft.com/en-us/dotnet/core/extensions/scoped-service
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: Interlocked Class - https://learn.microsoft.com/en-us/dotnet/api/system.threading.interlocked
- Microsoft Learn: Unhandled exceptions from a BackgroundService - https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/6.0/hosting-exception-handling
- Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- Clarified the hosted-service lifecycle wording. The host calls `StartAsync` and `StopAsync` on `IHostedService`; for `BackgroundService`, `StartAsync` starts `ExecuteAsync`.
- Updated scoped dependency examples from `CreateScope()` to `CreateAsyncScope()` with `await using`, matching current Microsoft guidance for scoped services in `BackgroundService`.
- Fixed `WorkerHealthState`. `Interlocked.Exchange(ref DateTime, DateTime)` is not valid because `Interlocked` does not provide a `DateTime` overload. The sample now stores UTC ticks in a `long` and uses `Interlocked.Read` / `Interlocked.Exchange`.
- Fixed the health-check endpoint example. `MapHealthChecks` is not available on a plain `IHost` from `Host.CreateApplicationBuilder`; the sample now uses `WebApplication.CreateBuilder`, maps `/health`, and configures Kestrel to listen on port `8080` to match the Kubernetes probe.
- Adjusted the graceful shutdown sample so it stops accepting new channel items and lets `BackgroundService.StopAsync` wait for `ExecuteAsync` instead of waiting before calling `base.StopAsync`, which would delay signaling cancellation to the worker loop.

## Review Notes
The local environment does not have the .NET SDK installed, so `dotnet new worker --help` and compilation checks could not be run locally. The CLI command and code patterns were reviewed against current official Microsoft documentation instead. The related OneUptime links returned HTTP 200 during validation.
