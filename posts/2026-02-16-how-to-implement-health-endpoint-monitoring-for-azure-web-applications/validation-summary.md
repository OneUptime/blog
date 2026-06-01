# Validation Summary: How to Implement Health Endpoint Monitoring for Azure Web Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core health checks
- Xabaril AspNetCore.HealthChecks dependency checks and HealthChecks UI
- Azure Application Gateway health probes
- Azure Load Balancer health probes
- Azure Service Bus
- Kubernetes liveness, readiness, and startup probes
- Azure Application Insights

## Sources Consulted
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: HealthCheckOptions class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.diagnostics.healthchecks.healthcheckoptions
- Microsoft Learn: Azure CLI `az network application-gateway probe` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe
- Microsoft Learn: Azure CLI `az network application-gateway http-settings` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Microsoft Learn: ServiceBusAdministrationClient.GetQueueRuntimePropertiesAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.servicebusadministrationclient.getqueueruntimepropertiesasync
- Microsoft Learn: ServiceBusClient class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusclient
- Microsoft Learn: Monitor .NET applications and services with Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/dot-net
- Xabaril AspNetCore.Diagnostics.HealthChecks README - https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks

## Issues Found
- The first code example used dependency health check extension methods without saying they come from separate `AspNetCore.HealthChecks.*` packages. Added the required package context so the sample is not mistaken for pure built-in ASP.NET Core API surface.
- The custom response writer returned HTTP 503 for both `Degraded` and `Unhealthy`, while the comment only mentioned unhealthy responses and ASP.NET Core's default mapping treats `Degraded` as HTTP 200. Updated the status-code logic and comment to return 200 for `Healthy` or `Degraded`, and 503 only for `Unhealthy`.
- The Application Gateway CLI example created a custom probe but did not associate it with backend HTTP settings, so the probe would not be used by a backend setting. Added the `az network application-gateway http-settings update --probe` command and narrowed the section title to Application Gateway.
- The HealthChecks UI sample pointed the UI at the custom `/health/detail` JSON response. HealthChecks UI expects monitored endpoints to use `UIResponseWriter.WriteHealthCheckUIResponse` from the UI client package. Added a UI-compatible `/health/ui` endpoint and updated the monitored endpoint URLs.

## Review Notes
The code snippets were reviewed against current documentation, but they were not compiled locally because the `dotnet` CLI is not installed in this environment.
