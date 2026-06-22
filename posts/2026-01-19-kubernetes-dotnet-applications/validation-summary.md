# Validation Summary: How to Set Up Kubernetes for .NET Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Services, probes, ConfigMaps, Secrets, topology spread constraints, Jobs, and HorizontalPodAutoscaler
- .NET 8 and ASP.NET Core
- Docker multi-stage builds
- External Secrets Operator
- ASP.NET Core health checks
- OpenTelemetry metrics and tracing
- Serilog structured logging
- Entity Framework Core migrations

## Sources Consulted
- Microsoft Learn: Default ASP.NET Core port changed from 80 to 8080 in .NET 8 containers - https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Microsoft Learn: Introduction to Docker with .NET - https://learn.microsoft.com/en-us/dotnet/core/docker/introduction
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: DbConnection.OpenAsync method - https://learn.microsoft.com/en-us/dotnet/api/system.data.common.dbconnection.openasync
- Microsoft Learn: .NET globalization runtime configuration - https://learn.microsoft.com/en-us/dotnet/core/runtime-config/globalization
- Kubernetes documentation: Pod lifecycle and probes - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes documentation: ConfigMaps - https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation: Pod topology spread constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes API reference: HorizontalPodAutoscaler autoscaling/v2 - https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- External Secrets Operator documentation: ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/
- OpenTelemetry documentation: .NET exporters and Prometheus exporter - https://opentelemetry.io/docs/languages/dotnet/exporters/

## Issues Found
- The custom `DatabaseHealthCheck` injected `IDbConnection` but called `OpenAsync(cancellationToken)`. `OpenAsync` is defined on `System.Data.Common.DbConnection`, not the `IDbConnection` interface, so the snippet would not compile as written. Changed the field and constructor parameter type to `DbConnection`.

## Review Notes
- The health check examples use extension methods such as `AddRedis`, `AddUrlGroup`, `UIResponseWriter.WriteHealthCheckUIResponse`, and OpenTelemetry instrumentation/exporter methods that require the corresponding NuGet packages and using directives. The APIs are current, but a future revision could list the required packages explicitly.
- The .NET 8 container examples correctly use port 8080. `ASPNETCORE_URLS` still works, though Microsoft documents `ASPNETCORE_HTTP_PORTS` as the simpler .NET 8 container option.
