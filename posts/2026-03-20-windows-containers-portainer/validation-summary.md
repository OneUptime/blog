# Validation Summary: How to Manage Windows Containers with Portainer - Part 3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Community Edition)
- Docker (Windows container mode)
- Windows Server 2019/2022, Windows 10/11
- Windows Server Core / Nano Server base images
- IIS (Internet Information Services) containers
- ASP.NET Core on Windows containers
- Docker Compose / Portainer Stacks (compose v3.8)
- PowerShell (Docker Desktop switch command, named pipe)

## Sources Consulted
- Microsoft Windows Containers documentation: https://learn.microsoft.com/en-us/virtualization/windowscontainers/
- Microsoft Container Registry (MCR) catalog: https://mcr.microsoft.com/
- Windows Server Core IIS image: https://hub.docker.com/_/microsoft-windows-servercore-iis
- .NET container images reference: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/net-core-net-framework-containers/official-net-docker-images
- SQL Server on containers (Linux only): https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker
- Portainer Windows install docs: https://docs.portainer.io/start/install-ce/server/docker/wsl
- Docker Desktop engine switch: https://docs.docker.com/desktop/features/windows-containers/
- Windows base image sizes: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images

## Issues Found

1. **SQL Server in Windows container stack (incorrect platform).** The compose example included `mcr.microsoft.com/mssql/server:2022-latest` as a service in a Windows-containers tutorial. That image is Linux-only — Microsoft has never shipped a SQL Server Windows container image for the `mssql/server` repo, and Windows container mode cannot run Linux images. I removed the `sql-server` service from the compose example so the stack is deployable in Windows container mode.

2. **`mcr.microsoft.com/dotnet/aspnet:8.0` listed as a Windows base image.** The plain `:8.0` tag resolves to Linux (amd64/arm64) images; Windows consumers must use OS-qualified tags such as `8.0-nanoserver-ltsc2022` or `8.0-windowsservercore-ltsc2022`. I changed the table entry to `mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022`, which matches the ~400MB size claim.

## Review Notes
- The `docker run` command for Portainer on Windows correctly mounts the named pipe `\\.\pipe\docker_engine` and uses `C:\data` for persistent storage — this matches Portainer's documented Windows install.
- PowerShell line-continuation backticks and `& $Env:ProgramFiles\Docker\Docker\DockerCli.exe -SwitchWindowsEngine` are correct for Docker Desktop.
- The note "Logs are in Windows event log format" is slightly imprecise: Docker captures stdout/stderr for Windows containers the same way as Linux. IIS/ETW-based services typically need the Microsoft LogMonitor tool to forward Event Log/IIS logs to stdout. The post's wording is loose but not strictly wrong and was left as-is to preserve author voice.
- Base-image sizes are approximate; actual pull/compressed sizes vary by LTSC tag. The magnitudes are reasonable.
- `windowsservercore-ltsc2022` tag for the IIS image is current and correct for Windows Server 2022 / Windows 11 hosts (process isolation requires matching host build).
