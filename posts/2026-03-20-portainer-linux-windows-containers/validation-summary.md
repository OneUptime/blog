# Validation Summary: How to Switch Between Linux and Windows Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Desktop
- Docker CLI
- Docker Compose
- Portainer CE
- Portainer Agent
- Linux containers
- Windows containers
- Windows Container Service (WCS)

## Sources Consulted
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Use the Docker Desktop CLI - https://docs.docker.com/desktop/features/desktop-cli/
- Docker Docs: `docker desktop engine use` - https://docs.docker.com/reference/cli/docker/desktop/engine/use/
- Docker Docs: `docker desktop engine ls` - https://docs.docker.com/reference/cli/docker/desktop/engine/ls/
- Docker Docs: `docker info` / `docker system info` - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn: About Windows containers - https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/
- Microsoft Learn: Support policy for Windows containers and Docker in on-premises scenarios - https://learn.microsoft.com/en-us/troubleshoot/windows-server/containers/support-for-windows-containers-docker-on-premises-scenarios
- Portainer Docs: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docs: Install Portainer CE with Docker on Windows Container Service - https://docs.portainer.io/start/install-ce/server/docker/wcs
- Portainer Docs: Install Portainer BE with Docker on WSL / Docker Desktop - https://docs.portainer.io/start/install/server/docker/wsl
- Portainer Docs: Environment-related / Add a new environment - https://docs.portainer.io/admin/environments and https://docs.portainer.io/admin/environments/add

## Issues Found
- The prerequisites incorrectly implied the Docker Desktop switching workflow applied to Windows Server 2022. I updated this to scope the switching steps to Windows 10/11 Pro or Enterprise with Docker Desktop and noted that Windows Server uses Windows Container Service instead.
- The post used the undocumented legacy `DockerCli.exe -SwitchDaemon` command and an unsupported manual service-edit workflow. I replaced those with the documented `docker desktop engine use` and `docker desktop engine ls` commands, and updated mode verification to `docker info --format '{{.OSType}}'`.
- The post stated that Portainer itself is a Linux container. I narrowed this to the accurate Docker Desktop/WSL case, because Portainer also documents a Windows Container Service installation path.
- The Portainer agent example for the Linux-containers-on-Windows case used a named pipe mount that corresponds to Windows Container Service rather than the Linux/WSL socket-based setup. I replaced it with the documented Linux/WSL-style agent command and aligned the image tag to `:lts`.
- The post said managing multiple environments was a Portainer BE-only capability and referred to nonstandard “Linux Agent” and “Windows Agent” endpoint labels. I corrected this to Portainer’s documented multi-environment flow using Docker Standalone environments.
- The Compose examples used the obsolete top-level `version` field. I removed `version: "3.8"` from both snippets to match the current Compose specification.
- The conclusion overstated the Linux-only Portainer limitation and tied the recommendation specifically to BE. I corrected it to describe the Docker Desktop/WSL scenario accurately and generalized the recommendation to a dedicated Portainer server.

## Review Notes
- The CLI-based switching examples require Docker Desktop 4.37 or later.
- The post is now technically correct for Docker Desktop switching on Windows. If a future revision expands the Windows Server angle, it should treat Windows Container Service as a separate setup path rather than part of Docker Desktop mode switching.
