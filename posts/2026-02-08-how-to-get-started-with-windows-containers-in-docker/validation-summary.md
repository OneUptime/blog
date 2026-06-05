# Validation Summary: How to Get Started with Windows Containers in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Desktop for Windows
- Windows containers
- Windows Server containers
- PowerShell
- Windows container base images
- Windows container networking
- Windows container storage
- .NET Framework and IIS workloads

## Sources Consulted
- Microsoft Learn: Get started: Prep Windows for containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
- Microsoft Learn: Get started: Run your first Windows container - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Microsoft Learn: Overview of Windows Container base images - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Isolation Modes - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/hyperv-container
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Windows container network drivers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/network-drivers-topologies
- Microsoft Learn: Persistent Storage in Containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/persistent-storage
- Microsoft Learn: Docker Engine on Windows - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/configure-docker-daemon
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Use the Docker Desktop CLI - https://docs.docker.com/desktop/features/desktop-cli/
- Microsoft Learn: Deploy and connect to SQL Server Linux containers - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment

## Issues Found
- The Windows Server setup commands used the older DockerMsftProvider package flow. Microsoft's current Windows container quickstart documents Docker CE / Moby installation through the `install-docker-ce.ps1` script, so the setup commands were updated accordingly.
- The Docker Desktop prerequisite omitted that Windows containers require Docker Desktop to be installed in all-users mode. The prerequisite was updated to include that requirement.
- The introduction and Server Core base image notes listed SQL Server as a normal Windows container workload. Microsoft documents SQL Server Windows container deployments as unsupported, so those references were removed from the general supported-workload guidance.
- The Windows base image guidance described GUI apps as an appropriate target. Microsoft documents the Windows image as useful when Server Core is missing dependencies such as full Windows API or GDI components, not as a general interactive GUI container platform, so that wording was corrected.
- The version compatibility section said Hyper-V isolation removes the version restriction. Microsoft documents Hyper-V isolation as broader compatibility, but still subject to host/image support combinations, so the wording was narrowed.

## Review Notes
The examples were reviewed for command shape and API usage against official Docker and Microsoft documentation. Windows container commands were not executed locally because this review environment is a Linux host, not a Windows container host.
