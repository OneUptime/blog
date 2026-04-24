# Validation Summary: How to Install Portainer on Windows Server with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Windows Server 2019
- Windows Server 2022
- Docker Engine / Moby on Windows Server
- Mirantis Container Runtime
- Windows containers
- Windows Firewall

## Sources Consulted
- Portainer CE install on Windows Container Service: https://docs.portainer.io/start/install-ce/server/docker/wcs
- Portainer CE install on WSL / Docker Desktop: https://docs.portainer.io/start/install-ce/server/docker/wsl
- Docker Desktop install on Windows: https://docs.docker.com/desktop/setup/install/windows-install/
- Microsoft support policy for Windows containers on-premises: https://learn.microsoft.com/en-us/troubleshoot/windows-server/containers/support-for-windows-containers-docker-on-premises-scenarios
- Microsoft quick start for preparing Windows for containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment?tabs=dockerce
- Microsoft Windows container requirements: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/system-requirements?source=recommendations
- Microsoft quick start for running Windows containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Portainer Windows startup troubleshooting FAQ: https://docs.portainer.io/faqs/installing/portainer-isnt-starting-on-my-windows-server-help

## Issues Found
- The post incorrectly said Portainer CE on Windows Server must run as a Linux container via Hyper-V and recommended Docker Desktop. I corrected this to the official Windows Container Service path because Portainer documents a Windows-container install path for Windows Server, while Docker documents that Docker Desktop is not supported on Windows Server 2019 or 2022.
- The Docker installation section used an outdated `DockerMsftProvider` workflow and treated Docker Desktop as the recommended server option. I replaced it with Microsoft's current `install-docker-ce.ps1` installation script for Docker CE / Moby on Windows Server and noted Mirantis Container Runtime as the enterprise alternative.
- The Portainer deployment command used Linux-oriented mounts and paths (`//./pipe/docker_engine`, `/data`, and `portainer/portainer-ce:latest`). I corrected the command to Portainer's documented Windows Container Service form: the Windows named pipe mount, `C:\data` inside the container, and the documented `portainer/portainer-ce:lts` tag.
- The firewall section labeled port `8000` as "Portainer Agent". I corrected this to an optional Portainer tunnel/Edge-agent-related port, which matches Portainer's documentation that `8000` is optional and only needed for Edge compute features.
- The Windows container example implied Linux and Windows containers would appear together in the same local Portainer environment. I corrected the wording and added a note that the Windows image tag should match the host OS version, using `ltsc2022` as the Windows Server 2022 example and `ltsc2019` for Windows Server 2019.
- The troubleshooting section incorrectly framed Hyper-V as required for Linux containers on Windows Server. I corrected this to reflect that Hyper-V is not required for the basic Windows Container Service install in the post, and that nested virtualization only matters when running Hyper-V-isolated Windows containers inside a VM.
- The prerequisites included fixed minimum resource numbers that were not supported by the official installation guidance used for validation. I replaced them with prerequisites that are directly supported by the official documentation, including administrator access and the Windows-on-`C:` requirement for standard Windows container hosts.

## Review Notes
- Docker Desktop is still a documented Portainer option for Windows environments that use WSL / Docker Desktop, but Docker's official support statement excludes Windows Server 2019 and Windows Server 2022.
- Portainer's Windows Container Service installation page currently uses the Microsoft `install-docker-ce.ps1` workflow for Docker CE / Moby, while Microsoft's support policy identifies Mirantis Container Runtime as the recommended and supported enterprise runtime on Windows Server.
- Windows container image compatibility matters on Windows Server. For straightforward process-isolated workloads, use container image tags that match the host OS release, such as `ltsc2019` on Windows Server 2019 and `ltsc2022` on Windows Server 2022.
- Validation was documentation-based against official vendor sources; the commands were not executed in this Linux workspace.
