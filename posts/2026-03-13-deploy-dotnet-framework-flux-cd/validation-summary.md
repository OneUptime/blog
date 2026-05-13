# Validation Summary: How to Deploy .NET Framework Applications with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- .NET Framework
- Windows containers
- WCF
- ASP.NET Web Forms
- Kubernetes Deployments and probes
- Flux CD Kustomizations
- Bitnami Sealed Secrets and kubeseal
- SQL Server and Redis-backed application configuration

## Sources Consulted
- Microsoft .NET Framework Docker repository: https://github.com/microsoft/dotnet-framework-docker
- Microsoft .NET Framework WCF image tags: https://github.com/microsoft/dotnet-framework-docker/blob/main/README.wcf.md
- Microsoft .NET Framework SDK image tags: https://github.com/microsoft/dotnet-framework-docker/blob/main/README.sdk.md
- Microsoft .NET Framework ASP.NET image documentation: https://github.com/microsoft/dotnet-framework-docker/blob/main/README.aspnet.md
- Microsoft guidance on .NET container OS targets: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/net-core-net-framework-containers/net-container-os-targets
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes Windows workload scheduling guide: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The Dockerfile used `mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022` and `mcr.microsoft.com/dotnet/framework/wcf:4.8-windowsservercore-ltsc2022`, but the official supported tag lists show Windows Server Core 2022 support under .NET Framework `4.8.1`. Updated both image tags to `4.8.1-windowsservercore-ltsc2022` and updated the deployment runtime label accordingly.
- The prerequisites listed Windows Server 2019 nodes alongside Windows Server 2022. Current Kubernetes Windows documentation lists Windows Server 2022 and 2025 as supported for current Kubernetes, and the examples target the Windows Server 2022 build `10.0.20348`. Updated the prerequisite to Windows Server 2022 nodes.
- The Kubernetes Pod templates did not set `.spec.os.name`. Kubernetes documentation says Windows Pods should set this field to `windows`. Added `os.name: windows` to both Pod templates.
- The Web Forms deployment used `ASPNETCORE_ENVIRONMENT`, which is an ASP.NET Core environment variable and is not a built-in ASP.NET Web Forms/.NET Framework setting. Replaced it with an app-specific `APP_ENVIRONMENT` variable to avoid implying ASP.NET Core behavior.

## Review Notes
- The Flux Kustomization fields, Kubernetes Deployment fields, probe fields, tolerations, Windows build selector, `kubectl exec` syntax, and `kubeseal --namespace --format yaml` usage are consistent with the official documentation reviewed.
- The example assumes the WCF service implements `/health`; that is valid as an application-specific endpoint and is also recommended later in the post.
