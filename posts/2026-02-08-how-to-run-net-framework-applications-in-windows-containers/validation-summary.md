# Validation Summary: How to Run .NET Framework Applications in Windows Containers

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker
- Windows containers
- .NET Framework 3.5 through 4.8.1
- ASP.NET MVC on IIS
- WCF
- Windows services
- PowerShell
- Docker Compose
- SQL Server and Redis dependency configuration

## Sources Consulted
- Microsoft Learn: .NET Framework and Windows OS versions - https://learn.microsoft.com/en-us/dotnet/framework/install/versions-and-dependencies
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Get started: Run your first Windows container - https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/run-your-first-container
- Microsoft Learn: New-Service PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-service
- Microsoft Learn: Import-PfxCertificate PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/pki/import-pfxcertificate
- Microsoft Learn: ASP.NET Web Deployment using Visual Studio: Command Line Deployment - https://learn.microsoft.com/en-us/aspnet/web-forms/overview/deployment/visual-studio-web-deployment/command-line-deployment
- Microsoft Artifact Registry / Docker Hub: .NET Framework WCF image tags - https://hub.docker.com/r/microsoft/dotnet-framework-wcf
- Microsoft dotnet-framework-docker repository - https://github.com/microsoft/dotnet-framework-docker
- Docker Docs: Docker Desktop on Windows container mode - https://docs.docker.com/desktop/setup/install/windows-install/
- Docker Docs: Compose file version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn: SQL Server Linux container deployment - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment

## Issues Found
- The adapted Windows service C# sample used `ServiceBase.Run(...)` without importing `System.ServiceProcess`. Added `using System.ServiceProcess;` so the sample compiles when referenced assemblies are present.
- The Dockerfile entrypoint for running `transform-config.ps1` and then `ServiceMonitor.exe` used `powershell -File` with both commands in one string. `-File` expects a script path, so changed it to `powershell -Command` and invoked both commands explicitly.
- The Docker Compose example mixed a Windows .NET Framework web container with Linux SQL Server and Redis images. Docker Desktop switches between Linux and Windows container daemons, and the official SQL Server container image shown is Linux-based, so the example would not run as a single local Windows-container Compose stack. Reworked the snippet to configure the Windows web container while pointing dependencies to external services.
- Removed the top-level `version: "3.8"` from the Compose example because Docker documents the Compose `version` field as obsolete and informative only.

## Review Notes
The official .NET Framework container image tags used in the post are valid. The `windowsservercore-ltsc2022` images require compatible Windows container hosts or Hyper-V isolation according to the Windows container compatibility matrix. The ODBC driver link is a Microsoft fwlink and should be checked periodically because fwlinks can retarget over time.
