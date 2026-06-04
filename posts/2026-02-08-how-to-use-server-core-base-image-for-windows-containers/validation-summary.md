# Validation Summary: How to Use Server Core Base Image for Windows Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows containers
- Windows Server Core container images
- Docker and Dockerfile syntax
- Microsoft Container Registry
- .NET Framework container images
- IIS
- Windows PowerShell
- Windows Server roles and features
- MSI installers
- COM registration
- Windows Registry
- Windows Event Log
- Windows Firewall

## Sources Consulted
- Microsoft Learn: Overview of Windows Container base images: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images
- Microsoft Learn: Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft Learn: Dockerfile and Windows containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/manage-windows-dockerfile
- Docker Docs: Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker manifest command reference: https://docs.docker.com/reference/cli/docker/manifest/
- Microsoft Learn: Install-WindowsFeature cmdlet: https://learn.microsoft.com/en-us/powershell/module/servermanager/install-windowsfeature
- Microsoft Learn: Server Core roles and services: https://learn.microsoft.com/en-us/windows-server/administration/server-core/server-core-roles-and-services
- Microsoft Learn: Get-WinEvent / EventLog guidance via Write-EventLog notes: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/write-eventlog
- Microsoft Learn: Set-ItemProperty cmdlet: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty
- .NET official support policy: https://dotnet.microsoft.com/en-us/platform/support/policy
- Microsoft Learn: Install .NET Framework on Windows and Windows Server: https://learn.microsoft.com/en-us/dotnet/framework/install/on-windows-and-server

## Issues Found
- The post described Server Core as having the "full" Windows API surface. Microsoft documents Windows and Windows Server images as the full API options, while Server Core has a broader API surface than Nano Server. Updated the wording to "broader" and "broad" API surface.
- The post implied Server Core includes full .NET Framework 3.5 and 4.8 support. Updated this to traditional .NET Framework application support, because specific installed framework versions vary by Windows Server version and image choice.
- The post used a fixed 1.8 GB base image size. Replaced it with "large Windows base image" because Server Core image size varies by release and patch layer.
- Several Windows Dockerfile snippets used PowerShell backtick line continuation without Docker's `# escape=` parser directive, or used Unix-style `\` continuations in Windows Dockerfiles. Added the Windows escape directive and converted multiline examples to valid Windows Dockerfile syntax.
- The event log example used `Get-EventLog`, whose documentation recommends `Get-WinEvent` for modern Windows Event Log APIs. Updated the command to use `Get-WinEvent`.
- The version matching section said Windows container images must match the host OS version without caveats. Updated it to specify process-isolated Windows containers and host/image OS compatibility, consistent with the documented Hyper-V isolation exception.
- The conclusion recommended ".NET 6+" for new Nano Server applications. Updated it to "a supported modern .NET version" because .NET 6 is out of support as of 2026.

## Review Notes
The Docker examples are illustrative and still depend on project-specific details such as solution layout, MSBuild publish settings, COM DLL registration behavior, and the exact Windows features available in the chosen Server Core tag. The post now avoids over-specific claims where Microsoft documents version-dependent behavior.
