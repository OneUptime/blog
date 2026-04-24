# Validation Summary: How to Install Portainer on Windows Server 2022 with Docker - 2022

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Windows Server 2022
- Windows containers
- Docker Engine / Moby on Windows Server
- Mirantis Container Runtime
- Windows Admin Center
- Portainer CE
- Windows Subsystem for Linux (WSL2)

## Sources Consulted
- Microsoft Learn: Prepare Windows operating system containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
- Microsoft Learn: Support policy for Windows containers and Docker in on-premises scenarios - https://learn.microsoft.com/en-us/troubleshoot/windows-server/containers/support-for-windows-containers-docker-on-premises-scenarios
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Portainer Documentation: Install Portainer CE with Docker on Windows Container Service - https://docs.portainer.io/start/install-ce/server/docker/wcs
- Microsoft Learn: Run Your First Windows Container - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Microsoft Learn: Windows Server Installation Guide for WSL - https://learn.microsoft.com/en-us/windows/wsl/install-on-server
- Microsoft Tech Community: Using WSL 2 on Windows Server 2022 to run Linux containers - https://techcommunity.microsoft.com/blog/itopstalkblog/using-wsl-2-on-windows-server-2022-to-run-linux-containers/3624745

## Issues Found
- The post listed Docker Desktop as an installation option on Windows Server 2022. I removed that path and replaced it with supported Windows Server runtime options because Docker's official documentation says Docker Desktop is not supported on Windows Server.
- The post treated WSL2 and `DockerCli.exe -SwitchDaemon` as part of the normal Windows Server workflow. I removed those steps from the main installation path and clarified that WSL2 on Windows Server 2022 is a separate Linux-container development and testing scenario.
- The Portainer deployment command used incorrect Windows syntax and an undocumented image tag for this scenario. I updated it to the official Windows Container Service pattern with `\\.\pipe\docker_engine`, `C:\data`, and `portainer/portainer-ce:lts`.
- The post directed readers to access Portainer over `http://...:9000` by default. I changed the primary access URL to `https://...:9443` and noted that `9000` is only the legacy HTTP endpoint.
- The troubleshooting commands were outdated or brittle. I replaced them with PowerShell commands that are valid on Windows Server 2022 and match the corrected Portainer ports.
- The prerequisites stated `8GB RAM and 2 vCPUs` as a hard minimum. I changed that to a workload-based prerequisite because the reviewed official sources do not define that as a fixed minimum for this setup.

## Review Notes
- Windows Server 2022 does support WSL2, and Microsoft documents `wsl --install` on Server 2022 Desktop Experience. That is separate from Docker Desktop, which Docker explicitly does not support on Windows Server.
- Portainer's Windows Container Service documentation uses HTTPS on port `9443` by default and treats port `9000` as an optional legacy HTTP endpoint.
- Portainer also documents a separate WSL / Docker Desktop installation flow, but that applies to supported Windows desktop environments rather than Windows Server.
