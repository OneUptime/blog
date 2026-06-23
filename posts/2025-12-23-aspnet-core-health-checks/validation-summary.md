# Validation Summary: How to Configure Health Checks in ASP.NET Core

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ASP.NET Core health checks
- C# and .NET dependency injection
- Microsoft.Extensions.Diagnostics.HealthChecks
- Xabaril AspNetCore.Diagnostics.HealthChecks packages
- Health Checks UI
- Kubernetes liveness and readiness probes
- NuGet / .NET CLI package installation

## Sources Consulted
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: HealthChecksBuilderDelegateExtensions.AddAsyncCheck - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.healthchecksbuilderdelegateextensions.addasynccheck
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Xabaril AspNetCore.Diagnostics.HealthChecks repository - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks
- NuGet: AspNetCore.HealthChecks.UI.Client - https://www.nuget.org/packages/AspNetCore.HealthChecks.UI.Client
- NuGet: AspNetCore.HealthChecks.Uris - https://www.nuget.org/packages/AspNetCore.HealthChecks.Uris
- NuGet: AspNetCore.HealthChecks.System - https://www.nuget.org/packages/AspNetCore.HealthChecks.System
- Stripe API documentation - https://docs.stripe.com/api

## Issues Found
- The Health Checks UI example used `UIResponseWriter.WriteHealthCheckUIResponse` but did not list the `AspNetCore.HealthChecks.UI.Client` package, where the writer is documented. Added the missing package command.
- The complete configuration example used `AddUrlGroup`, `AddDiskStorageHealthCheck`, and `AddProcessAllocatedMemoryHealthCheck` without listing the packages that provide those extension methods. Added package commands for `AspNetCore.HealthChecks.Uris` and `AspNetCore.HealthChecks.System`.
- The complete configuration example referenced `https://api.stripe.com/v1/health`, but Stripe's public API documentation does not document a `/v1/health` endpoint. Replaced it with a configured application-specific payment API health URL.

## Review Notes
- The ASP.NET Core health check registration, `IHealthCheck` implementation pattern, `HealthCheckOptions.ResponseWriter`, tag predicates for liveness/readiness filtering, and Kubernetes probe fields are consistent with official documentation.
- The local environment does not have the `dotnet` SDK installed, so the snippets could not be compiled locally. Validation was performed against official documentation and package documentation/source.
- Current .NET CLI documentation favors `dotnet package add` for .NET 10 SDK and notes `dotnet add package` for .NET 9 SDK or earlier. The blog's `dotnet add package` commands remain broadly recognizable and appropriate for many existing ASP.NET Core projects.
