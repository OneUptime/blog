# Validation Summary: How to Configure Istio for .NET Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes Deployments, Services, probes, lifecycle hooks
- ASP.NET Core
- Kestrel
- ASP.NET Core health checks
- HttpClient and IHttpClientFactory
- gRPC for .NET
- Envoy trace header propagation

## Sources Consulted
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: Configure endpoints for the ASP.NET Core Kestrel web server - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/endpoints
- Microsoft Learn: Troubleshoot gRPC on .NET - https://learn.microsoft.com/en-us/aspnet/core/grpc/troubleshoot
- Microsoft Learn: Use the IHttpClientFactory - https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory
- Microsoft Learn: .NET Generic Host in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/generic-host
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Istio documentation: Protocol Selection - https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio documentation: Distributed tracing overview - https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio documentation: Destination Rule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- NuGet Gallery: AspNetCore.HealthChecks.NpgSql - https://www.nuget.org/packages/AspNetCore.HealthChecks.NpgSql/

## Issues Found
- The `preStop` YAML fragment placed `spec` under the container list, which would be invalid if copied into a Pod template. I changed the snippet so `containers` and `terminationGracePeriodSeconds` are both under `spec`, matching Kubernetes pod spec structure.
- The Kestrel HTTP/1.1 plus HTTP/2 explanation implied that HTTP/2 without TLS is generally negotiated automatically. Microsoft documentation notes that HTTP/2 without TLS requires h2c prior knowledge when multiple protocols are enabled. I updated the wording and pointed gRPC users to a dedicated HTTP/2-only port.
- The gRPC port naming example showed container ports, but Istio protocol selection is based on Kubernetes Service port names or `appProtocol`. I changed the example to Service ports with `grpc-api` and named `targetPort` values.
- The HTTP/2 without TLS client switch was presented as generally required. Microsoft documentation says `System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport` is only required for .NET Core 3.x gRPC clients; .NET 5 or later should use `Grpc.Net.Client` 2.32.0 or later with an `http://` address. I updated the text accordingly.

## Review Notes
The post is technically relevant and the remaining examples are consistent with current ASP.NET Core, Kubernetes, and Istio guidance. The health check database examples rely on third-party `AspNetCore.HealthChecks.*` packages, including `AspNetCore.HealthChecks.NpgSql`, which are valid but not maintained or supported by Microsoft.
