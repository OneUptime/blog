# Validation Summary: How to Set Up Docker with WSL2 on Windows

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Docker Desktop
- Docker Engine
- Docker Compose
- WSL2
- Windows PowerShell
- Ubuntu on WSL
- NVIDIA Container Toolkit / CUDA containers
- Git Credential Manager
- VS Code Remote - WSL

## Sources Consulted
- Microsoft Learn: Install WSL - https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn: Basic commands for WSL - https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft Learn: Advanced settings configuration in WSL - https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft Learn: Get started with Docker containers on WSL - https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers
- Microsoft Learn: Get started using Git on WSL - https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-git
- Docker Docs: Docker Desktop WSL 2 backend on Windows - https://docs.docker.com/desktop/features/wsl/
- Docker Docs: Change your Docker Desktop settings - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: Troubleshoot Docker Desktop - https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install Docker Compose - https://docs.docker.com/compose/install/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- NVIDIA Docs: CUDA on WSL User Guide - https://docs.nvidia.com/cuda/wsl-user-guide/index.html
- NVIDIA Docs: Installing the NVIDIA Container Toolkit - https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Git Credential Manager docs: WSL support - https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/wsl.md

## Issues Found
- The front matter used the tag `Window`; changed it to `Windows`.
- The architecture diagram implied the Docker daemon runs inside the Ubuntu distro under Docker Desktop. Docker Desktop runs its daemon in its own `docker-desktop` WSL distribution and exposes CLI integration to Ubuntu, so the diagram was corrected.
- The Docker Desktop resource settings section listed CPU, memory, and swap controls under Docker Desktop settings. In WSL 2 mode, those limits are configured through `.wslconfig`; the Docker Desktop section was updated accordingly.
- The Compose example used the obsolete top-level `version: '3.8'` field and the legacy `docker-compose` command. Removed the version field and changed the command to `docker compose up -d`.
- The NVIDIA GPU section used deprecated `apt-key`, the old `nvidia-docker` repository path, and the older `nvidia-docker2` package. Replaced these with the current NVIDIA Container Toolkit repository, package, runtime configuration, and restart commands.
- The Docker Desktop troubleshooting section recommended unregistering `docker-desktop` and `docker-desktop-data`, which can delete Docker Desktop state and is no longer a safe first-line troubleshooting step. Replaced it with `wsl --shutdown` and Docker Desktop's Troubleshoot reset guidance.
- The Docker socket permission command was presented generically. Clarified that adding a user to the `docker` group applies to native Docker Engine in WSL2, not the normal Docker Desktop WSL integration path.
- The native Docker Engine installation snippet used an older apt repository setup. Updated it to Docker's current Ubuntu repository instructions using `/etc/apt/keyrings/docker.asc` and a `.sources` file.

## Review Notes
The manual DISM-based WSL installation commands remain valid for older/manual installations, although Microsoft's current default recommendation is `wsl --install`. The `curl https://get.docker.com` setup script remains acceptable for development convenience, but Docker documents the apt repository method as the maintainable installation path.
