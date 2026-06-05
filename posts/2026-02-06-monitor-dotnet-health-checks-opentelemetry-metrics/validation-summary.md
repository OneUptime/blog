# Validation Summary: How to Monitor .NET Health Checks with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ASP.NET Core health checks
- Microsoft.Extensions.Diagnostics.HealthChecks
- OpenTelemetry .NET metrics
- System.Diagnostics.Metrics
- Prometheus alert rules
- PostgreSQL, Redis, external URL, and custom health checks

## Sources Consulted
- ASP.NET Core health checks documentation: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- .NET metrics instrumentation documentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- .NET metrics collection with OpenTelemetry documentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-collection
- Meter.CreateObservableGauge API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.meter.createobservablegauge
- HealthCheckResult API documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.diagnostics.healthchecks.healthcheckresult
- OpenTelemetry .NET metric instruments documentation: https://opentelemetry.io/docs/languages/dotnet/metrics/instruments/
- OpenTelemetry .NET resources documentation: https://opentelemetry.io/docs/languages/dotnet/resources/
- AspNetCore.Diagnostics.HealthChecks project documentation: https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The initial setup snippet used `HealthCheckOptions` without importing `Microsoft.AspNetCore.Diagnostics.HealthChecks`. Added the missing using directive.
- The readiness endpoint filtered on the `ready` tag, but the health check registrations did not assign that tag. Added `ready` to the relevant health check registrations.
- The liveness endpoint filtered on a `live` tag that was never registered. Changed it to the standard ASP.NET Core pattern of excluding all checks with `Predicate = _ => false`.
- `AddService("order-api", "1.0.0")` passed the version as the service namespace positional argument. Changed it to `AddService("order-api", serviceVersion: "1.0.0")`.
- The OpenTelemetry configuration registered only the `HealthChecks` meter, but later examples created meters named `HealthChecks.Business`, `HealthChecks.Enhanced`, and `HealthChecks.Database`. Added those meter names to `AddMeter`.
- The health status gauge was declared as `ObservableGauge<int>` even though the article and alert examples used `0.5` for degraded status. Changed it to `ObservableGauge<double>` and returned `0.5` for degraded entries and overall status.
- `HealthReport` was stored in a non-nullable field but intentionally started as unset. Changed it to `HealthReport?` and updated the local variable accordingly.
- The custom business health check tested `pendingOrders > 10000` before `pendingOrders > 50000`, making the unhealthy branch unreachable. Reordered the checks so the critical threshold is evaluated first.
- The enhanced publisher, cached health check, and database pool snippets were missing required using directives for the types they used. Added the relevant using directives.
- `HealthCheckResult` is a struct, so the cached health check could not compare a non-nullable field to `null`. Changed the cache field to `HealthCheckResult?`, used pattern matching to read cached values, and unwrapped the value after refreshing it.
- The Prometheus slow-health-check alert compared a histogram metric name directly to a scalar threshold. Changed the expression to use `histogram_quantile` over the histogram bucket rate.

## Review Notes
The code was reviewed against official documentation, but it was not compiled locally because `dotnet` is not installed in the review environment. The examples still assume the application references the appropriate NuGet packages for OpenTelemetry instrumentation/exporters and the Xabaril health check providers.
