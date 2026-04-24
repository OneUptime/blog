# Validation Summary: How to Install Portainer on Windows Server 2022 with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE
- Windows Server 2022
- Docker/Moby on Windows Server
- Windows containers
- Windows Firewall
- Docker Compose standalone on Windows Server

## Sources Consulted
- Microsoft Learn: Prepare Windows operating system containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment?tabs=dockerce
- Microsoft Learn: Support policy for Windows containers and Docker in on-premises scenarios - https://learn.microsoft.com/en-us/troubleshoot/windows-server/containers/support-for-windows-containers-docker-on-premises-scenarios
- Microsoft Learn: Windows container requirements - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/system-requirements
- Microsoft Learn: Run Your First Windows Container - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Portainer Documentation: Install Portainer CE with Docker on Windows Container Service - https://docs.portainer.io/start/install-ce/server/docker/wcs
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Docker Docs: Install the Docker Compose standalone (Legacy) - https://docs.docker.com/compose/install/standalone/

## Issues Found
- Replaced the deprecated `DockerMsftProvider` and `Install-Package Docker` installation path with Microsoft's current `install-docker-ce.ps1` method, which is what current Microsoft and Portainer documentation points to for Docker/Moby on Windows Server.
- Removed the unconditional `Hyper-V` installation step. Hyper-V is required for Hyper-V-isolated Windows containers, but it is not required for a basic Windows container host setup.
- Changed the Portainer image from `portainer/portainer-ce:latest` to `portainer/portainer-ce:lts` to match Portainer's current Windows Container Service installation guidance.
- Fixed the firewall instructions by removing the unconditional `9000` rule. The original post did not publish port `9000`, and Portainer documents it as optional legacy HTTP access.
- Replaced the "switching container modes" section. The original version implied Linux containers are a normal Windows Server mode and used outdated `DockerCli.exe` switch commands; Microsoft documents LCOW on Windows Server as deprecated.
- Removed the Linux `nginx:alpine` test container example because it does not match the supported Windows Server runtime path in this tutorial. The Windows IIS example was kept.
- Updated the Docker Compose section to reflect Docker's current documentation: standalone Compose on Windows Server is a legacy option, uses the `docker-compose` CLI, and is not required for Portainer stacks.
- Corrected the description and conclusion so the post no longer claims the same Windows Server Docker host can directly manage both Windows and Linux containers.

## Review Notes
- Portainer's current Windows install documentation recommends the `lts` image tag rather than `latest`.
- Windows container image version compatibility still matters on Windows Server, so matching an LTSC 2022 host with an `ltsc2022` image remains the safest path.
- Linux container management is still possible in Portainer, but through a separate Linux environment rather than by relying on LCOW on Windows Server.
