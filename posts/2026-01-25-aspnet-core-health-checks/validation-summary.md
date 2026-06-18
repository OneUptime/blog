# Validation Summary: How to Build Health Probes with ASP.NET Core Health Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core Health Checks
- C#
- Entity Framework Core
- StackExchange.Redis
- Azure Service Bus
- Kubernetes health probes
- AspNetCore.Diagnostics.HealthChecks community packages
- HealthChecks UI
- Polly circuit breaker

## Sources Consulted
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: HealthCheckOptions.Predicate property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.diagnostics.healthchecks.healthcheckoptions.predicate
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Xabaril AspNetCore.Diagnostics.HealthChecks repository - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks
- Xabaril NpgSql health check extension source - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks/blob/master/src/HealthChecks.NpgSql/DependencyInjection/NpgSqlHealthCheckBuilderExtensions.cs
- Xabaril Uris health check extension source - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks/blob/master/src/HealthChecks.Uris/DependencyInjection/UrisHealthCheckBuilderExtensions.cs
- NuGet: AspNetCore.HealthChecks.NpgSql - https://www.nuget.org/packages/AspNetCore.HealthChecks.NpgSql/
- NuGet: AspNetCore.HealthChecks.AzureServiceBus - https://www.nuget.org/packages/AspNetCore.HealthChecks.AzureServiceBus/
- Polly documentation: Circuit breaker resilience strategy - https://www.pollydocs.org/strategies/circuit-breaker.html

## Issues Found
- The "Using Built-in Health Check Packages" section incorrectly implied that the listed `AspNetCore.HealthChecks.*` dependency packages are built into or maintained by ASP.NET Core. Changed the heading and introduction to identify them as community packages from AspNetCore.Diagnostics.HealthChecks.
- The Kubernetes `Deployment` example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels`.
- The conditional health check example commented that the external API check only runs in production, but the code registered it unconditionally. Changed the example to register the external API health check only inside `builder.Environment.IsProduction()`.
- The Polly circuit breaker example used `_circuitBreaker.GetState()`, but Polly's `CircuitBreakerStateProvider` exposes the state through the `CircuitState` property. Updated the sample to use `_circuitBreaker.CircuitState`.

## Review Notes
The remaining examples are illustrative snippets and assume the usual package references and `using` directives for ASP.NET Core health checks, EF Core, StackExchange.Redis, Azure Service Bus, HealthChecks UI, and Polly. Microsoft documentation notes that AspNetCore.Diagnostics.HealthChecks is not maintained or supported by Microsoft, so future updates should periodically re-check extension method signatures against that project's current release.
