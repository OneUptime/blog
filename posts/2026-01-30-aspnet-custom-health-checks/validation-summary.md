# Validation Summary: How to Implement Custom Health Checks in ASP.NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C#
- ASP.NET Core health checks
- Microsoft.Extensions.Diagnostics.HealthChecks
- ASP.NET Core middleware and endpoint routing
- IHttpClientFactory and HttpClient
- JSON response serialization with System.Text.Json
- Kubernetes-style readiness endpoints

## Sources Consulted
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: HTTP requests with IHttpClientFactory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn: HealthCheckOptions.ResultStatusCodes property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.diagnostics.healthchecks.healthcheckoptions.resultstatuscodes
- OneUptime related reading link: https://oneuptime.com/blog/post/2026-01-25-aspnet-core-health-checks/view
- OneUptime related reading link: https://oneuptime.com/blog/post/2026-01-25-aspnet-core-rate-limiting/view

## Issues Found
- The initial `Program.cs` snippet assigned `ResponseWriter = WriteHealthCheckResponse`, but the method is later defined as `HealthCheckResponseWriter.WriteHealthCheckResponse`. Updated the snippet to use the fully qualified static method so it compiles as shown.

## Review Notes
The ASP.NET Core health check concepts, `IHealthCheck` implementation pattern, `AddHealthChecks`, `MapHealthChecks`, tag filtering with `Predicate`, custom response writer shape, and default status-code behavior align with Microsoft documentation. The database example uses synchronous ADO.NET APIs wrapped in `Task.Run`; this can work for a simple illustrative check, but production code should prefer provider-specific async APIs when available. Local compilation was not run because the `dotnet` CLI is not installed in this environment.
