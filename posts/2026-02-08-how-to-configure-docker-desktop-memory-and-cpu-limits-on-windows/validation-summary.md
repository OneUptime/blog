# Validation Summary: How to Configure Docker Desktop Memory and CPU Limits on Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Desktop for Windows
- Docker Engine CLI
- Docker Compose
- Windows Subsystem for Linux 2
- PowerShell
- Hyper-V

## Sources Consulted
- Microsoft Learn: Advanced settings configuration in WSL - https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft Learn: Basic commands for WSL - https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Docker Docs: Docker Desktop WSL 2 backend on Windows - https://docs.docker.com/desktop/features/wsl/
- Docker Docs: Change your Docker Desktop settings on Windows - https://docs.docker.com/desktop/settings/windows/
- Docker Docs: WSL 2 best practices for Docker Desktop on Windows - https://docs.docker.com/desktop/features/wsl/best-practices/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The post stated that WSL 2 can claim up to 50% of system memory or 8 GB, whichever is less. Current Microsoft documentation lists the default WSL 2 memory limit as 50% of total Windows memory, with no 8 GB cap. Changed the statement to match the current documented default.
- The `.wslconfig` example used `pageReporting=false` with a comment saying it reclaims memory more aggressively. Current Microsoft documentation no longer lists `pageReporting` in the supported `.wslconfig` settings and recommends `autoMemoryReclaim` under `[experimental]` for cached-memory reclamation. Replaced the outdated setting with `autoMemoryReclaim=gradual`.
- The Docker backend check used `docker info --format '{{.OperatingSystem}}'` as if it confirmed WSL 2 specifically. That output confirms Docker Desktop, not the backend. Clarified that backend confirmation should be done in Docker Desktop Settings > General.
- The monitoring section described `wsl --status` as checking WSL 2 memory usage. Microsoft documents it as general WSL configuration/status information. Updated the comment accordingly.
- The Hyper-V backend section used `docker info --format '{{.Isolation}}'` to check whether Docker Desktop uses Hyper-V or WSL 2. That field does not reliably identify the Docker Desktop backend for Linux containers. Replaced it with `wsl --list --verbose` and a Docker Desktop settings check.
- A PowerShell troubleshooting command piped to `head -20`, which is a Unix command and is not available in standard PowerShell. Replaced it with `Select-Object -First 20`.
- The Docker Desktop VHDX path used `wsl\disk\docker_data.vhdx`. Current Docker backup documentation identifies the Docker Desktop data VHD under `%LOCALAPPDATA%\Docker\wsl\data\docker_data.vhdx`. Updated the path in the disk-size and compaction examples.

## Review Notes
The Docker Compose `deploy.resources` example matches the Compose Deploy Specification, but behavior can still vary by Compose implementation and target platform. The VHDX compaction command requires the Hyper-V PowerShell module, which may not be available on every Windows edition or installation.
