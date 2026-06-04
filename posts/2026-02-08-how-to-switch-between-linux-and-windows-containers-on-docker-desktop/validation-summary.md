# Validation Summary: How to Switch Between Linux and Windows Containers on Docker Desktop

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Desktop for Windows
- Linux containers
- Windows containers
- Docker Desktop CLI
- Docker Compose
- WSL2
- LCOW
- .NET and .NET Framework containers
- SQL Server container images

## Sources Consulted
- Docker Docs: Install Docker Desktop on Windows - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Use the Docker Desktop CLI - https://docs.docker.com/desktop/features/desktop-cli/
- Docker Docs: `docker desktop engine use` CLI reference - https://docs.docker.com/reference/cli/docker/desktop/engine/use/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn: Set up Linux containers on Windows - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/set-up-linux-containers
- Microsoft Learn: Windows Containers FAQ - https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/faq
- Microsoft Learn: SQL Server Linux container quickstart - https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker
- Microsoft Learn: SQL Server support policy for Windows containers - https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/install/windows/support-policy-sql-server
- Microsoft Learn: .NET releases and support - https://learn.microsoft.com/en-us/dotnet/core/releases-and-support

## Issues Found
- The command-line switching examples used Docker Desktop's older internal `DockerCli.exe` flags. Replaced them with the documented Docker Desktop CLI commands: `docker desktop engine use windows`, `docker desktop engine use linux`, and `docker desktop engine ls`.
- The Linux workload examples listed .NET 6 and .NET 7 as modern deployment targets. Updated the list to .NET 8, 9, and 10, which are the currently supported modern .NET versions as of the validation date.
- The Windows workload list implied SQL Server in Windows containers is a normal supported use case. Updated it to say custom SQL Server Windows container images are for development or testing, matching Microsoft's support policy.
- The SQL Server image example implied that the same image name could pull a different Windows image. Clarified that `mcr.microsoft.com/mssql/server:2022-latest` is a SQL Server Linux container image and is not available as a Windows container image.
- The LCOW section presented an experimental run command as a viable workaround. Replaced it with guidance that LCOW is not a current Docker Desktop mixed-workload strategy and that users should use WSL2 or a separate Linux Docker Engine instead.
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from both Compose snippets.

## Review Notes
The post is technically relevant and remains valid after the targeted corrections. The WSL2 separate-daemon workaround is plausible, but future revisions could expand it with Docker's full official Docker Engine installation steps for Ubuntu rather than keeping the installation step abbreviated.
