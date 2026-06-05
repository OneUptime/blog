# Validation Summary: How to Build Windows Container Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfiles
- Windows containers
- Microsoft Windows container base images
- PowerShell
- Windows Server Core
- Nano Server
- .NET Framework container images
- Multi-stage Docker builds
- Docker image registries

## Sources Consulted
- Dockerfile reference, Docker Docs: https://docs.docker.com/reference/dockerfile/
- Docker build context documentation, Docker Docs: https://docs.docker.com/build/building/context/
- Docker container run reference, Docker Docs: https://docs.docker.com/engine/containers/run/
- Dockerfile and Windows containers, Microsoft Learn: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/manage-windows-dockerfile
- Overview of Windows container base images, Microsoft Learn: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- net user command reference, Microsoft Learn: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-user
- icacls command reference, Microsoft Learn: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls
- Official .NET support policy: https://dotnet.microsoft.com/en-us/platform/support/policy

## Issues Found
- The security example used `COPY --chown=appuser`, but Docker's `--chown` flag is not supported when building Windows containers. Changed it to `COPY . .` followed by `icacls C:\app /grant 'appuser:(OI)(CI)RX' /T` so the non-admin user has read and execute access on Windows.
- The security example used `net user /add appuser`, which does not match Microsoft's documented `net user <UserName> /add` syntax. Changed it to `net user appuser /add`.
- The Nano Server base image comment recommended it for `.NET 6+` apps. .NET 6 is out of support by the 2026-06-05 review date, so the wording was changed to `modern .NET` to avoid recommending an unsupported runtime version.

## Review Notes
The remaining Dockerfile instructions, Docker CLI commands, multi-stage build pattern, Windows shell behavior, build argument and environment variable usage, health check syntax, base image guidance, and registry push commands were consistent with Docker and Microsoft documentation. Image size figures are approximate and can vary by tag and servicing update.
