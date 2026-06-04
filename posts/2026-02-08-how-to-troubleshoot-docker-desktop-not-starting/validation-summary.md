# Validation Summary: How to Troubleshoot Docker Desktop Not Starting

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Desktop
- Docker CLI
- macOS virtualization
- Windows WSL 2 and Hyper-V
- Linux KVM and QEMU
- PowerShell
- systemd

## Sources Consulted
- Docker Docs: Troubleshoot Docker Desktop - https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/
- Docker Docs: Troubleshoot topics for Docker Desktop - https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/topics/
- Docker Docs: Install Docker Desktop on Mac - https://docs.docker.com/desktop/setup/install/mac-install/
- Docker Docs: Virtual Machine Manager for Docker Desktop on Mac - https://docs.docker.com/desktop/features/vmm/
- Docker Docs: Change your Docker Desktop settings - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: FAQs for Docker Desktop for Mac - https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Docker Desktop WSL 2 backend on Windows - https://docs.docker.com/docker-for-windows/wsl/
- Docker Docs: Install Docker Desktop on Linux - https://docs.docker.com/desktop/setup/install/linux/
- Docker Docs: Docker Desktop CLI reference - https://docs.docker.com/reference/cli/docker/desktop/
- Microsoft Learn: Basic commands for WSL - https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft Learn: Add, remove, or hide Windows features - https://learn.microsoft.com/en-us/windows/client-management/client-tools/add-remove-hide-features
- Microsoft Learn: BCDEdit /set - https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/bcdedit--set
- Docker CLI help output for `docker info`, `docker system prune`, and `docker system df`

## Issues Found
- The metadata tag used `Window`; changed it to `Windows`.
- The macOS `killall` chain used `&&`, which stops after the first missing process. Changed it to separate commands with stderr redirected so each process is attempted.
- The disk-space section recommended directly deleting `Docker.raw`. Docker documents Docker Desktop data cleanup through Docker Desktop cleanup options and Docker CLI pruning, and direct deletion is a risky manual data removal. Replaced it with `docker system prune -a --volumes` when Docker can start and Docker Desktop's Clean / Purge data option when it cannot.
- The macOS log paths were outdated for current Docker Desktop guidance. Replaced direct host log tailing with Docker's documented macOS `log stream` predicate and `$HOME/.docker/desktop/log/` internal log location.
- The macOS virtualization section described only Apple Virtualization framework and HyperKit. Updated it to include Docker VMM and note HyperKit as a legacy Intel option.
- The Apple Silicon virtualization check used `system_profiler` and System Integrity Protection, which does not verify Docker Desktop virtualization support. Replaced it with Docker's documented `sysctl kern.hv_support` check and an architecture check.
- The soft reset section removed an old driver directory and `settings.json`. Updated it to back up current `settings-store.json`, which is the settings file Docker documents for current Docker Desktop.
- The Windows features section implied the listed features are universally required. Clarified that they apply to Docker Desktop with the WSL 2 backend.
- The Hyper-V conflict explanation implied Docker Desktop always uses Hyper-V. Updated it to focus on the Windows hypervisor required by WSL 2 or Hyper-V.
- The VM backend switching instruction referenced editing `settings.json`. Updated it to use Docker Desktop Settings > General > Virtual Machine Manager.
- The WSL reset commands were presented as a general WSL reset. Clarified that users should restart and inspect WSL first, and that unregistering Docker's WSL distributions loses Docker images, containers, and volumes.

## Review Notes
Most remaining commands are valid but may be environment-dependent. For example, `kvm-ok` is commonly available through distro packages such as `cpu-checker`, and Windows commands that inspect or modify optional features require an elevated PowerShell session.
