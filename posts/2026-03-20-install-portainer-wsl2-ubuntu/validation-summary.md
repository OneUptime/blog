# Validation Summary: How to Install Portainer on WSL2 with Ubuntu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Subsystem for Linux 2 (WSL2)
- Ubuntu
- Docker Engine
- Portainer CE
- PowerShell
- Bash
- WSL configuration files (`.wslconfig` and `wsl.conf`)

## Sources Consulted
- Microsoft Learn, "Install WSL": https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn, "Advanced settings configuration in WSL": https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft Learn, "Use systemd to manage Linux services with WSL": https://learn.microsoft.com/en-us/windows/wsl/systemd
- Microsoft Learn, "Accessing network applications with WSL": https://learn.microsoft.com/en-us/windows/wsl/networking
- Docker Docs, "Install Docker Engine on Ubuntu": https://docs.docker.com/engine/install/ubuntu/
- Docker Docs, "Linux post-installation steps for Docker Engine": https://docs.docker.com/engine/install/linux-postinstall/
- Portainer Documentation, "Install Portainer CE with Docker on WSL / Docker Desktop": https://docs.portainer.io/start/install-ce/server/docker/wsl
- Portainer Documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "Lifecycle policy": https://docs.portainer.io/start/lifecycle

## Issues Found
1. **WSL installation wording was slightly inaccurate**: The post implied that after `wsl --install`, readers must install Ubuntu from the Microsoft Store. Current Microsoft guidance says `wsl --install` installs Ubuntu by default, so the wording was corrected to say readers should reboot if prompted and launch Ubuntu to complete setup, using the Store only if they want a specific Ubuntu release.

2. **Docker installation assumed `curl` was already present**: The original commands downloaded Docker's convenience script with `curl` without first ensuring the package existed. Added `sudo apt install -y ca-certificates curl` so the documented commands work reliably on a fresh Ubuntu WSL install.

3. **Docker auto-start guidance did not match WSL startup behavior**: The original `.bashrc` / `.profile` snippet only runs when a shell starts, not when the distro launches, and it depends on interactive `sudo`. Replaced it with the documented WSL boot configuration for Windows 11 using `/etc/wsl.conf` and `command=service docker start`.

4. **Portainer image tag used a floating `latest` tag**: The original deployment and update commands used `portainer/portainer-ce:latest`. Updated both to `portainer/portainer-ce:lts` to align with current Portainer installation and upgrade guidance and avoid a floating tag in the tutorial.

5. **WSL memory requirement was overstated**: The post listed "At least 4 GB RAM assigned to WSL2" as a prerequisite. Microsoft documents WSL memory limits as configurable and optional, not required. The prerequisite was softened to a recommendation rather than a hard requirement.

6. **Metadata tag for the operating system was incorrect**: The tag `Window` was corrected to `Windows` so the technology metadata matches the platform actually discussed in the post.

## Review Notes
- The post still uses Docker's official convenience script from `get.docker.com`. Docker documents this as suitable for testing and development environments; the apt repository installation method is the better long-term choice when you want tighter control over package upgrades.
- The `/etc/wsl.conf` boot-command approach used in the corrected post is documented for Windows 11 and Server 2022. Windows 10 readers can still use the rest of the tutorial, but may need to start Docker manually if they are not using a newer WSL configuration model.
- The `https://localhost:9443` access step is technically correct for the default WSL2 networking setup because Microsoft documents host-to-WSL `localhost` access by default. If `localhostForwarding` is disabled or networking has been customized, using the distro IP remains the correct fallback.
