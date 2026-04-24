# Validation Summary: How to Install Portainer on WSL2 with Docker Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Subsystem for Linux 2 (WSL2)
- Docker Desktop
- Docker CLI
- Portainer CE
- Windows Firewall / PowerShell

## Sources Consulted
- Microsoft Learn: Install WSL - https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn: Accessing network applications with WSL - https://learn.microsoft.com/en-us/windows/wsl/networking
- Microsoft Learn: Working across Windows and Linux file systems - https://learn.microsoft.com/en-us/windows/wsl/filesystems
- Microsoft Learn: How to create a desktop shortcut with the Windows Script Host - https://learn.microsoft.com/en-us/troubleshoot/windows-client/admin-development/create-desktop-shortcut-with-wsh
- Microsoft Learn: New-NetFirewallRule - https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Docker Desktop WSL 2 backend on Windows - https://docs.docker.com/desktop/features/wsl/
- Docker Docs: WSL 2 best practices for Docker Desktop on Windows - https://docs.docker.com/desktop/features/wsl/best-practices/
- Docker Docs: Networking on Docker Desktop - https://docs.docker.com/desktop/features/networking/
- Portainer Documentation: Install Portainer CE with Docker on WSL / Docker Desktop - https://docs.portainer.io/start/install-ce/server/docker/wsl

## Issues Found
- The prerequisites were outdated. The post said Windows 10 version 2004+ and 4GB+ RAM, but current Docker Desktop documentation requires a currently supported Windows release, WSL 2.1.5 or later, and 8GB system RAM. I updated the prerequisites accordingly.
- The WSL setup commands were outdated and redundant. `wsl --install` already installs Ubuntu by default, and `wsl --set-default-version 2` does not upgrade an existing distro. I changed the sequence to use `wsl --install -d Ubuntu`, `wsl --update`, `wsl --version`, `wsl --list --verbose`, and `wsl --set-version Ubuntu 2` when needed.
- The Portainer image tag used `portainer/portainer-ce:latest`, while current Portainer WSL/Docker Desktop install docs use the `lts` tag. I updated the deployment and troubleshooting commands to `portainer/portainer-ce:lts`.
- The desktop shortcut example used a `.lnk` file for a URL target. Microsoft’s Windows Script Host example for web shortcuts uses a `.URL` shortcut. I changed the shortcut filename from `Portainer.lnk` to `Portainer.url`.
- The Windows Firewall example labeled port 8000 as "Portainer Agent" and implied it was needed for general remote UI access. Portainer documents port 8000 as the optional tunnel server used for Edge-related features. I renamed and clarified that rule as optional.
- The port-conflict troubleshooting command was not runnable because it used `...` as a placeholder. I replaced it with the full `docker run` command.
- The tag metadata contained `Window` instead of `Windows`. I corrected the tag.

## Review Notes
- No remaining technical inaccuracies were found after the fixes.
- The `.wslconfig` example is technically correct, but WSL must restart before those limits take effect.
- The `/mnt/c/...` bind-mount example works, but Docker’s WSL best-practices documentation recommends keeping actively mounted project files inside the Linux filesystem for better performance.
