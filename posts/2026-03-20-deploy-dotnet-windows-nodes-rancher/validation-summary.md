# Validation Summary: How to Deploy .NET Applications on Windows Nodes in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET Framework 4.8 (Windows-only)
- .NET 8 / ASP.NET Core
- Docker (Windows containers, Windows Server Core, Nano Server LTSC2022)
- Microsoft Container Registry (`mcr.microsoft.com/dotnet/framework/sdk`, `mcr.microsoft.com/dotnet/framework/aspnet`, `mcr.microsoft.com/dotnet/sdk`, `mcr.microsoft.com/dotnet/aspnet`)
- Kubernetes (Deployments, nodeSelectors, taints/tolerations, liveness probes, secrets, terminationGracePeriodSeconds)
- Rancher (as the Kubernetes management plane)
- Serilog (`Serilog.AspNetCore`, console sink, output template)
- IIS / `inetpub/wwwroot` for ASP.NET 4.x hosting

## Sources Consulted
- Microsoft .NET Framework Docker repo and supported tags: https://github.com/microsoft/dotnet-framework-docker/blob/main/documentation/supported-tags.md
- .NET Framework SDK 4.8 windowsservercore-ltsc2022 Dockerfile: https://github.com/microsoft/dotnet-framework-docker/blob/main/src/sdk/4.8/windowsservercore-ltsc2022/Dockerfile
- .NET (Core) Docker repo supported tags: https://github.com/dotnet/dotnet-docker/blob/main/documentation/supported-tags.md
- .NET 8 SDK nanoserver-ltsc2022 Dockerfile: https://github.com/dotnet/dotnet-docker/blob/main/src/sdk/8.0/nanoserver-ltsc2022/amd64/Dockerfile
- Multi-platform tags breaking change (.NET 8, Linux-only): https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/multi-platform-tags
- Kubernetes documentation on `kubernetes.io/os` label and Windows scheduling: https://kubernetes.io/docs/concepts/windows/user-guide/
- Serilog.AspNetCore README (host integration, `UseSerilog`): https://github.com/serilog/serilog-aspnetcore

## Issues Found
No technical issues found.

Spot-checked items that all verified as correct:
- `mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022` and `mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022` are valid published tags.
- `mcr.microsoft.com/dotnet/sdk:8.0-nanoserver-ltsc2022` and `mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022` are valid published tags.
- `WORKDIR /inetpub/wwwroot` matches the convention used in Microsoft's own ASP.NET 4.x sample Dockerfiles (Docker on Windows accepts forward slashes).
- `kubernetes.io/os: windows` is the correct, well-known node label for scheduling Windows pods.
- `ASPNETCORE_URLS=http://+:8080` and `containerPort: 8080` align with the .NET 8 container default port (changed from 80 to 8080 in .NET 8).
- Serilog setup using `builder.Host.UseSerilog()` after configuring `Log.Logger` is a current, supported pattern in `Serilog.AspNetCore` for .NET 6+/8.

## Review Notes
- The `RUN msbuild /p:PublishProfile=FolderProfile` step relies on the project containing a `FolderProfile.pubxml` configured to publish to `/app/publish` (so that the later `COPY --from=build /app/publish .` resolves). This is implicit in the tutorial; readers unfamiliar with Visual Studio publish profiles may want to add a `/p:PublishUrl=/app/publish` (or set `PublishUrl` inside the pubxml) to make it explicit.
- The `tolerations` example uses a custom `os=windows:NoSchedule` taint. This works fine for self-managed Rancher Windows nodes where the cluster admin sets that taint, but managed offerings sometimes use a slightly different taint key/value (e.g., AKS historically used `os=Windows`, capitalized). Readers should confirm the actual taint applied by their Windows node provisioner.
- The `terminationGracePeriodSeconds: 30` snippet is shown under a bare `spec:` — it must live on the pod spec (`spec.template.spec` of the Deployment), not on the Deployment spec itself. Context-wise this is clearly a fragment of the earlier manifest, but newer readers might paste it at the wrong indentation.
- `Serilog.AspNetCore` 8.x also exposes `builder.Services.AddSerilog(...)` as an alternative to `builder.Host.UseSerilog()`. Both are valid; no change required.
- The .NET Framework Dockerfile inherits Windows Server Core (~5+ GB) — worth flagging to readers that pull/start times on Windows nodes are substantially longer than equivalent Linux images, which is also implicitly acknowledged in the conclusion.
