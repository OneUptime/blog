# Validation Summary: How to Manage Windows Containers with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Windows containers
- Docker Desktop
- Docker Engine on Windows Server
- Docker Compose / Portainer Stacks
- Windows container networking
- Windows container isolation modes
- Prometheus `windows_exporter`

## Sources Consulted
- Portainer CE install on Windows Container Service: https://docs.portainer.io/start/install-ce/server/docker/wcs
- Portainer add container docs: https://docs.portainer.io/user/docker/containers/add
- Docker Desktop on Windows: https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Compose top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn, prep Windows for containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
- Microsoft Learn, Windows container network drivers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/network-drivers-topologies
- Microsoft Learn, isolation modes: https://learn.microsoft.com/en-au/virtualization/windowscontainers/manage-containers/hyperv-container
- Microsoft Learn, Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn, SQL Server Linux containers quickstart: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver16
- Prometheus Community `windows_exporter` README: https://github.com/prometheus-community/windows_exporter

## Issues Found
- The Windows Server Docker installation snippet used the older `DockerMsftProvider` flow. I replaced it with Microsoft's current `install-docker-ce.ps1` script because that is the current documented installation path for Docker CE / Moby on Windows Server.
- The Portainer deployment example used `portainer/portainer-ce:latest`. I changed it to `portainer/portainer-ce:lts` to match Portainer's current Windows Container Service installation guidance.
- The IIS examples used `mcr.microsoft.com/windows/servercore/iis:latest`. I changed them to an explicit LTSC tag and clarified that the image tag should match the host OS version, because Windows container compatibility is host-version-sensitive.
- The stack example included `version: "3.8"`. I removed it because Docker now treats the top-level Compose `version` field as obsolete.
- The stack example included `mcr.microsoft.com/mssql/server:2022-latest`. I removed that service because Microsoft's `mssql/server` container image is a Linux image and is not appropriate for a Windows-container-focused stack example.
- The isolation section overstated compatibility and used a weaker `docker run` example. I corrected the wording to reflect Microsoft's documented host/container version compatibility model and updated the example to `docker run -it --isolation=hyperv ... cmd.exe`.
- The monitoring section referred to a "Windows node exporter" and used an undocumented containerized example. I corrected the product name to `windows_exporter` and replaced the snippet with the project's documented Windows MSI installation flow.

## Review Notes
- The post is now technically valid, but Windows container image tags remain version-sensitive. The examples use LTSC 2022 tags, so readers on Windows Server 2019 or Windows Server 2025 should substitute the matching image tag.
- Windows 10 and Windows 11 support Windows containers primarily for development and testing, with Hyper-V isolation as the default mode. Production Windows container hosts should generally be Windows Server.
- The `windows_exporter` install example is pinned to `v0.31.6`, which was the latest release on April 29, 2026.
