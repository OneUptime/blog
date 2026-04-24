# Validation Summary: How to Install Portainer on WSL2 with Ubuntu - Part 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- WSL2
- Ubuntu 22.04
- Docker Engine
- Portainer CE
- PowerShell
- Windows networking and port forwarding

## Sources Consulted
- Microsoft Learn: Install WSL - https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn: Basic commands for WSL - https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft Learn: Use systemd to manage Linux services with WSL - https://learn.microsoft.com/en-us/windows/wsl/systemd
- Microsoft Learn: Accessing network applications with WSL - https://learn.microsoft.com/en-us/windows/wsl/networking
- Microsoft Learn: Advanced settings configuration in WSL - https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Portainer Documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux

## Issues Found
- The Docker package removal command was outdated. I replaced it with Docker's current official conflicting-package removal command so it matches current Ubuntu install guidance.
- The Docker convenience-script example was overly loose. I changed it to Docker's documented `get-docker.sh` flow, which is the current official convenience-script example for development environments.
- The systemd note incorrectly tied support to Ubuntu 22.04+. I corrected it to WSL version `0.67.6+`, which is what Microsoft documents for enabling systemd in WSL.
- The non-systemd auto-start advice used `sudo` from `~/.bashrc`, which is unreliable and can block shell startup. I replaced it with the supported `/etc/wsl.conf` boot-command approach documented by Microsoft.
- The Portainer container example used `portainer/portainer-ce:latest`, while current Portainer install docs use `portainer/portainer-ce:lts`. I updated the image tag to match current official guidance.
- The networking table mixed legacy HTTP port `9000` with an install command that only published `9443`. I corrected the access URLs to `https://localhost:9443` and added the certificate-warning note because Portainer uses a self-signed certificate by default.
- The Windows startup section implied Portainer could be kept available automatically at Windows startup in a straightforward way. Microsoft documents that systemd services do not keep a WSL instance alive on their own, so I rewrote this section to describe WSL's on-demand startup behavior accurately.
- The Windows-side `wsl` commands targeted a generic `Ubuntu` distro even though the post installs `Ubuntu-22.04`. I aligned those commands with the distro name used earlier in the post.
- The post metadata used the `Window` tag instead of `Windows`. I corrected the tag so the platform label is accurate.

## Review Notes
- The post still uses Docker's convenience install script. Docker explicitly positions that method for testing and development rather than production, which is reasonable here because the post is about a Windows development machine.
- WSL networking behavior is version-specific. On Windows 11 22H2+ with mirrored networking enabled, some external-access scenarios differ from the default NAT-based setup described in the post.
