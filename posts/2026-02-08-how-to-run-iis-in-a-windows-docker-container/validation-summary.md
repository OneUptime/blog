# Validation Summary: How to Run IIS in a Windows Docker Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Windows containers
- Microsoft Container Registry
- IIS
- ASP.NET Framework 4.8
- ASP.NET MVC 5
- PowerShell WebAdministration module
- Docker Compose
- SQL Server 2022 Linux container image

## Sources Consulted
- Microsoft Learn: Windows container base images - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Run your first Windows container - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Microsoft Learn: ASP.NET MVC app in Windows containers - https://learn.microsoft.com/en-us/aspnet/mvc/overview/deployment/docker-aspnetmvc
- Microsoft Learn: WebAdministration PowerShell module - https://learn.microsoft.com/en-us/powershell/module/webadministration/
- Microsoft Learn: New-Website cmdlet - https://learn.microsoft.com/en-us/powershell/module/webadministration/new-website
- Microsoft Learn: SQL Server Linux container configuration - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-configure
- Microsoft Learn: aspnet_compiler.exe - https://learn.microsoft.com/en-us/dotnet/framework/tools/aspnet-compiler-exe-aspnet-compilation-tool
- Docker Docs: Dockerfile reference, including HEALTHCHECK - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/

## Issues Found
- The IIS image section described `mcr.microsoft.com/windows/servercore/iis:latest` as a full Windows image. That repository is the IIS image based on Windows Server Core, so the wording was corrected.
- The basic IIS section claimed the container has the same features expected on Windows Server. This was narrowed to common Windows Server Core web-hosting scenarios because Windows Server Core containers do not expose the full Windows/Windows Server API surface.
- The multiple-sites Dockerfile was fenced as PowerShell even though it was Dockerfile content. The code fence was corrected to `dockerfile`.
- The SQL Server Compose example used `SA_PASSWORD`. Microsoft documents `MSSQL_SA_PASSWORD` for current SQL Server Linux containers, so the environment variable was updated.
- The IIS log-management snippet configured logging to `C:\iis-logs` without creating the directory and tailed a wildcard path that can fail before IIS creates the first log file. The snippet now creates the directory and handles the no-log-file case.
- The ASP.NET precompile example ran `aspnet_compiler.exe` before copying the published app into `C:\inetpub\wwwroot`, which would compile the wrong content. The `COPY` instruction was moved before the precompile command.

## Review Notes
The tutorial remains Windows-version-specific: Windows container host/image version compatibility still matters, especially when using LTSC tags and process isolation. For production examples, secrets should be supplied through a secrets manager or orchestrator rather than plain environment variables.
