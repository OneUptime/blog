# Validation Summary: How to Switch Between Linux and Windows Containers in Portainer - Switch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop for Windows
- Docker Engine on Windows Server
- Windows containers
- Linux containers on Windows via WSL2 / Hyper-V
- Portainer CE
- Microsoft .NET container images

## Sources Consulted
- Docker Docs: Windows Docker Desktop install and Windows container switching: https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Docker Desktop CLI engine commands: https://docs.docker.com/reference/cli/docker/desktop/engine/
- Docker Docs: `docker desktop engine use`: https://docs.docker.com/reference/cli/docker/desktop/engine/use/
- Docker Docs: `docker desktop engine ls`: https://docs.docker.com/reference/cli/docker/desktop/engine/ls/
- Docker Docs: `docker info`: https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: `docker image ls` formatting: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Docs: `docker manifest inspect`: https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker Docs: Docker Engine deprecated LCOW support: https://docs.docker.com/engine/deprecated/
- Portainer Docs: Install Portainer CE with Docker on WSL / Docker Desktop: https://docs.portainer.io/start/install-ce/server/docker/wsl
- Portainer Docs: Install Portainer CE with Docker on Windows Container Service: https://docs.portainer.io/start/install-ce/server/docker/wcs
- Microsoft Learn: Windows container isolation modes: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/hyperv-container
- Microsoft Learn: .NET 8 multi-platform container tags are Linux-only: https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/multi-platform-tags
- Microsoft Learn: Upgrade Windows containers with explicit IIS Windows Server Core tags: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/upgrade-windows-containers

## Issues Found
- Replaced the old `DockerCli.exe -SwitchWindowsEngine` and `-SwitchLinuxEngine` examples with the current Docker Desktop 4.37+ `docker desktop engine ls` and `docker desktop engine use windows/linux` commands documented by Docker.
- Corrected the Windows Server section. The original text implied Linux/Windows mode switching via `daemon.json`; Docker Engine LCOW was removed in Docker Engine 23.0, so the post now says Windows Server Docker Engine is for Windows containers and recommends Docker Desktop with WSL2 for Linux containers on Windows.
- Replaced `grep` in a PowerShell example with `docker info --format '{{.OSType}}'`, which is portable in PowerShell and aligns with Docker's documented `OSType` output.
- Updated Portainer examples to match Portainer's current CE documentation: HTTPS UI on port `9443`, `portainer/portainer-ce:lts`, `/var/run/docker.sock:/var/run/docker.sock` and `/data` for Linux containers, and `\\.\pipe\docker_engine` with `C:\data` for Windows containers.
- Corrected the "two Portainer instances" recommendation so it does not imply both modes are simultaneously available through the same default Docker context.
- Changed the `docker images` comment because the command lists local images, not image architectures.
- Updated the compatibility table to use an explicit IIS Windows Server Core tag and to state that `mcr.microsoft.com/dotnet/aspnet:8.0` is Linux-only for .NET 8; Windows users need an explicit Windows-specific tag such as `8.0-nanoserver-ltsc2022`.
- Reworded the conclusion to recommend separate Docker environments/hosts for teams that need both Linux and Windows container workloads, instead of implying one Portainer Business Edition environment can span both local modes automatically.

## Review Notes
The local environment did not have the `docker` CLI installed, so command behavior was validated against official Docker, Portainer, and Microsoft documentation rather than local `--help` output.
