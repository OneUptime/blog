# Validation Summary: How to Manage Windows Containers with Portainer - Part 2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Windows containers on Windows Server 2022
- Docker Engine / Windows container runtimes
- Docker Compose / Portainer stacks
- .NET Framework and ASP.NET Core Windows container images
- Windows container networking and isolation modes
- Windows Dockerfiles and Chocolatey

## Sources Consulted
- Microsoft Learn: Overview of Windows Container Base Images — https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Prepare Windows operating system containers — https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
- Microsoft Learn: Run Your First Windows Container — https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Microsoft Learn: Isolation Modes — https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/hyperv-container
- Microsoft Learn: Windows container networking — https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/architecture
- Microsoft Learn: SQL Server support policy — https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/install/windows/support-policy-sql-server
- Microsoft Learn: Multi-platform container tags are Linux-only (.NET 8) — https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/multi-platform-tags
- Microsoft Learn: Dockerfile and Windows containers — https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/manage-windows-dockerfile
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Install Portainer Agent on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docs: Access a container's console — https://docs.portainer.io/sts/user/docker/containers/console
- Portainer Docs: Why can't I use the console with my container? — https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container
- Chocolatey Docs: Setup / Install — https://docs.chocolatey.org/en-us/choco/setup/

## Issues Found
1. **The Docker mode-switch step was Docker Desktop-specific, not a Windows Server runtime step.** `DockerCli.exe -SwitchDaemon` is documented for Docker Desktop on Windows 10/11, not as the normal way to configure Windows Server 2022 container hosts. Replaced the section with a Windows Server-appropriate verification step using `docker info` and removed the unnecessary Portainer restart instruction.

2. **The base image table mixed true Windows base images with generic `.NET` `latest` tags and inaccurate size guidance.** Starting with .NET 8, generic multi-platform tags like `aspnet:8.0` and `runtime:8.0` are Linux-only, so Windows examples must use explicit Windows tags such as `8.0-nanoserver-ltsc2022`. Updated the image names and corrected the size guidance to match current Microsoft documentation.

3. **The Compose examples used the obsolete top-level `version` field.** Docker now treats `version` as obsolete and only informative. Removed `version: "3.8"` from the examples so they align with the current Compose specification.

4. **The SQL Server example was technically incorrect for a Windows container guide.** `mcr.microsoft.com/mssql/server:2022-latest` is the SQL Server Linux container image, and Microsoft explicitly states that SQL Server deployments in Windows containers are not covered by support. Removed the `mssql` service block and updated surrounding references so the post no longer implies supported Windows-container SQL Server usage.

5. **The volume-path example used invalid Compose structure.** It placed bind mounts directly under the top-level `volumes:` key, which is reserved for named volume declarations. Reworked the snippet so mounts appear under a service and the named volume is declared correctly.

6. **The environment-variable example implied overriding a Windows system variable.** Using `COMPUTERNAME` as a regular app setting is misleading in a container example, because it suggests changing Windows hostname semantics rather than setting application configuration. Replaced it with application-specific variables only.

7. **The console section assumed PowerShell exists in all Windows images.** Microsoft documents that Nano Server does not include PowerShell. Updated the instructions to use `powershell` for Server Core-based images and `cmd` for Nano Server-based images.

8. **The Chocolatey install URL was outdated.** Updated the script source from `chocolatey.org/install.ps1` to the current official `community.chocolatey.org/install.ps1` endpoint.

9. **The isolation explanation was oversimplified.** The original text described process isolation as simply "less secure". Updated it to the more precise Microsoft framing: Windows Server defaults to process isolation, while Hyper-V isolation provides stronger isolation and broader version compatibility at a higher resource cost.

## Review Notes
- The examples consistently use LTSC 2022 tags now, which is the correct match for a Windows Server 2022 host and avoids host/image compatibility confusion.
- The `transparent` network driver example is valid, but in practice it depends on host networking prerequisites and is not universally available in every environment.
- The custom Dockerfile remains illustrative rather than production-hardened. It is technically acceptable after the URL fix, but real deployments should pin package versions and minimize extra layers.
