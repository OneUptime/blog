# Validation Summary: How to Deploy .NET Applications on Windows Nodes in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2 Windows clusters
- Kubernetes Deployments, probes, and HorizontalPodAutoscaler
- Windows containers
- .NET 8
- .NET Framework 4.8
- ASP.NET Core health checks
- Docker

## Sources Consulted
- Microsoft Learn: .NET container images - https://learn.microsoft.com/en-us/dotnet/core/docker/container-images
- Microsoft Learn: Windows and containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Health checks in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0
- Kubernetes: Guide for Running Windows Containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Rancher: Launching Kubernetes on Windows Clusters - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher: RKE1 to RKE2 Windows Migration Guidance - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters/workload-migration-guidance
- Microsoft Container Registry tag listing for `dotnet/aspnet` - https://mcr.microsoft.com/v2/dotnet/aspnet/tags/list?n=10000
- Microsoft Container Registry tag listing for `dotnet/runtime` - https://mcr.microsoft.com/v2/dotnet/runtime/tags/list?n=10000
- Microsoft Container Registry tag listing for `dotnet/sdk` - https://mcr.microsoft.com/v2/dotnet/sdk/tags/list?n=10000
- Microsoft Container Registry tag listing for `dotnet/framework/runtime` - https://mcr.microsoft.com/v2/dotnet/framework/runtime/tags/list?n=10000
- Microsoft Container Registry tag listing for `dotnet/framework/aspnet` - https://mcr.microsoft.com/v2/dotnet/framework/aspnet/tags/list?n=10000

## Issues Found
- The post treated `ltsc2022` images as if they would run on any Windows worker node. I corrected the prerequisites and added `node.kubernetes.io/windows-build: "10.0.20348"` to the Windows workload manifests so the examples match the Windows Server 2022 / LTSC 2022 image build they use.
- The Windows workload manifests included `tolerations` that do not match current Rancher RKE2 Windows scheduling guidance. I removed those tolerations and kept the supported `nodeSelector` approach.
- The .NET 8 Deployment used `/health` for readiness while the app example exposed `/health/ready` and `/health/live`. I changed the readiness probe to `/health/ready` so the manifest matches the application code.
- The ASP.NET Core health-check example relied on unsupported or unexplained third-party APIs (`AddUrlGroup`, `UIResponseWriter`, and the earlier dependency-check pattern). I replaced that snippet with supported built-in ASP.NET Core health-check APIs.
- The .NET Framework and worker Deployment examples were invalid because `.spec.selector.matchLabels` did not match `.spec.template.metadata.labels`. I added the missing pod-template labels.
- The `.NET Framework requires full Windows server features` and `full Windows API surface` wording was too strong for Windows Server Core. I corrected the text to describe Windows-specific APIs, wider API surface, and full .NET Framework support more accurately.
- The `.NET Framework` manifest used `ASPNET_ENV`, which implies framework-managed behavior that classic ASP.NET does not provide. I changed it to a generic custom variable, `APP_ENVIRONMENT`.
- The HPA example omitted the dependency on a metrics provider. I added a note that `metrics.k8s.io` must be available, such as through Metrics Server.

## Review Notes
- The post is now technically correct for Windows Server 2022 / `ltsc2022` examples. If the images are changed to another Windows release, the node build selector and image tags should be updated together.
- The health-check example is intentionally minimal and uses supported built-in APIs. If the post later wants dependency-specific readiness checks, it should either add a supported custom `IHealthCheck` implementation or clearly document any extra packages it introduces.
