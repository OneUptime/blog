# Validation Summary: How to Implement the Bulkhead Pattern to Isolate Failures in Azure Microservices

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Azure microservices
- .NET / C#
- Polly bulkhead and retry policies
- IHttpClientFactory
- Kubernetes / Azure Kubernetes Service
- Kubernetes ResourceQuota and container resource requests/limits
- SemaphoreSlim
- Azure Application Insights / Azure Monitor custom metrics

## Sources Consulted
- Polly v8 migration guide, including v7 bulkhead API and v8 ConcurrencyLimiter replacement: https://www.pollydocs.org/migration-v8.html
- Polly bulkhead documentation for v7 API, exposed state, and `BulkheadAvailableCount` / `QueueAvailableCount`: https://github-wiki-see.page/m/App-vNext/Polly/wiki/Bulkhead
- Microsoft Learn, `IHttpClientFactory` and Polly-based handlers: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn, resilient HTTP requests with `IHttpClientFactory` and Polly: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests
- Kubernetes documentation, resource management for pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation, ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Microsoft Learn, `SemaphoreSlim.WaitAsync`: https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.waitasync
- Microsoft Learn, Application Insights custom metrics and `GetMetric`: https://learn.microsoft.com/en-us/azure/azure-monitor/app/get-metric

## Issues Found
- The post described Polly bulkheads as separate isolated thread pools. Polly v7 bulkhead policies limit concurrent executions and optional queued actions; they do not create dedicated .NET thread pools. Updated the wording, heading, diagram, and comments to use concurrency budgets and request capacity instead.
- The `HttpPolicyExtensions.HandleTransientHttpError()` sample omitted the `Polly.Extensions.Http` namespace. Added `using Polly.Extensions.Http;`.
- The monitoring example used `orderBulkhead.QueuedCount`, which is not a Polly v7 bulkhead property. Replaced it with `10 - orderBulkhead.QueueAvailableCount` to compute queue depth from the configured queue size.
- The monitoring example used `TelemetryClient.TrackMetric()`, which Azure Monitor documentation says is no longer the preferred method for custom metrics. Replaced it with `GetMetric(...).TrackValue(...)` to use SDK preaggregation.
- The Kubernetes comments said resource requests guarantee minimum resources and that a service cannot steal CPU from other services. Updated the wording to clarify that requests reserve scheduling capacity and CPU limits cause throttling when reached.
- The sizing guidance referred to allocating application server threads to one service. Updated it to refer to concurrent outbound call slots, matching the corrected Polly bulkhead behavior.

## Review Notes
The Polly examples use the v7-style `Policy.BulkheadAsync` API, which remains accurate for projects using Polly v7 or the legacy API surface. For new Polly v8-first code, Polly documents the replacement as a `ConcurrencyLimiter` strategy from `Polly.RateLimiting` / `System.Threading.RateLimiting`.
