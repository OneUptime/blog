# Validation Summary: How to Install Portainer on Windows Server 2022

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows Server 2022
- Windows containers
- Docker CE / Moby
- Portainer CE
- PowerShell
- Windows Defender Firewall

## Sources Consulted
- Portainer docs, Install Portainer CE with Docker on Windows Container Service: https://docs.portainer.io/start/install-ce/server/docker/wcs
- Portainer docs, Upgrade Portainer on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer docs, Initial setup after installation: https://docs.portainer.io/start/install-ce/server/setup
- Microsoft Learn, Get started: Prep Windows for containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
- Microsoft Learn, Support policy for Windows Server containers in on-premises scenarios: https://learn.microsoft.com/en-us/troubleshoot/windows-server/containers/support-for-windows-containers-docker-on-premises-scenarios
- Docker docs, Install Docker Desktop on Windows: https://docs.docker.com/desktop/setup/install/windows-install/

## Issues Found
- The post recommended `winget install Docker.DockerDesktop` on Windows Server 2022. Docker’s official install docs state Docker Desktop is supported on Windows 10/11, not Windows Server, so I removed that alternative.
- Step 1 said to enable Hyper-V as a blanket prerequisite. Microsoft’s Windows container guidance does not require Hyper-V for every Windows Server container host, so I changed the step to enable the Containers feature only.
- The post mixed Linux-container guidance into a Windows Server tutorial. That path depended on WSL2 or Docker Desktop, which does not match the supported Windows Server setup, so I removed the Linux-container deployment instructions and related wording.
- The Windows-container `docker run` example exposed only port `9000`, but the access step and firewall rules expected `9443` and `8000`. I replaced the command with the current Portainer Windows Container Service example using `9443` and `8000`.
- The deployment and update commands used `portainer/portainer-ce:latest`. Portainer’s current install and upgrade docs use the `lts` tag for the documented stable install path, so I changed both commands to `portainer/portainer-ce:lts`.
- The troubleshooting note said Docker startup issues were related to Hyper-V or WSL2. For this Windows Server container-host flow, that guidance was inaccurate, so I changed it to check the Containers feature and Docker service instead.

## Review Notes
- Microsoft’s support policy recommends Mirantis Container Runtime for fully supported Windows Server container hosts, while Microsoft’s container quickstart still documents the Moby-based install script used in the post.
- Portainer’s documented default secure access path is `https://<host>:9443`; port `9000` is a legacy HTTP port and is not required for the corrected install flow.
