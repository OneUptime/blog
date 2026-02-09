# How to Use Server Core Base Image for Windows Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, server core, windows containers, .NET Framework, IIS, Windows Server, enterprise

Description: Build Windows container images on the Server Core base image for applications that need full .NET Framework, IIS, and Windows Server features.

---

Server Core is the workhorse base image for Windows containers. While Nano Server is lighter, Server Core provides the broad Windows API surface that legacy and enterprise applications demand. It includes the .NET Framework, supports IIS, allows MSI installations, and provides access to most Windows Server roles and features. If your application was built for Windows Server, Server Core is almost certainly the right base image.

This guide covers using Server Core effectively, installing features and software, optimizing image size, and handling the unique challenges that come with a 1.8 GB base image.

## What Server Core Includes

Server Core is a Windows Server installation without the desktop GUI. In container form, it provides:

- Full .NET Framework 3.5 and 4.8 support
- Windows PowerShell 5.1 (full version)
- MSI installer support
- COM/DCOM component registration
- Windows Server roles and features (installable)
- Full Windows API surface
- Windows Registry
- Windows Event Log
- Windows Services infrastructure
- ODBC driver support

What it does NOT include:

- Desktop GUI (Explorer, Edge, etc.)
- Server Manager GUI
- Some multimedia APIs
- DirectX
- Internet Explorer (deprecated)

## Pulling Server Core Images

```powershell
# Pull the base Server Core image
docker pull mcr.microsoft.com/windows/servercore:ltsc2022

# Check image size
docker images mcr.microsoft.com/windows/servercore:ltsc2022

# Run an interactive PowerShell session
docker run -it --rm mcr.microsoft.com/windows/servercore:ltsc2022 powershell
```

Microsoft also provides purpose-built images based on Server Core.

```powershell
# ASP.NET 4.8 (Server Core + IIS + ASP.NET)
docker pull mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET Framework Runtime (Server Core + .NET runtime)
docker pull mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

# .NET Framework SDK (Server Core + build tools)
docker pull mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022

# IIS (Server Core + IIS web server)
docker pull mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
```

## Installing Windows Features

Server Core lets you install Windows Server features directly in your Dockerfile.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# List available features to find what you need
# RUN Get-WindowsFeature | Format-Table Name, InstallState

# Install IIS and related features
RUN Install-WindowsFeature -Name `
    Web-Server, `
    Web-Asp-Net45, `
    Web-Http-Redirect, `
    Web-Websocket, `
    Web-Filtering, `
    Web-IP-Security, `
    NET-Framework-45-ASPNET `
    -IncludeManagementTools

# Verify the installations
RUN Get-WindowsFeature | Where-Object InstallState -eq Installed | Format-Table Name
```

Combine feature installations into a single RUN command to minimize layers.

## Installing Software with MSI

Unlike Nano Server, Server Core supports the Windows Installer service.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Install the Visual C++ Redistributable (common dependency)
RUN Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile 'C:\vc_redist.exe'; \
    Start-Process 'C:\vc_redist.exe' -ArgumentList '/install', '/quiet', '/norestart' -Wait; \
    Remove-Item 'C:\vc_redist.exe' -Force

# Install an application using MSI
RUN Invoke-WebRequest -Uri 'https://example.com/myapp-installer.msi' -OutFile 'C:\installer.msi'; \
    Start-Process msiexec.exe -ArgumentList '/i', 'C:\installer.msi', '/quiet', '/norestart' -Wait; \
    Remove-Item 'C:\installer.msi' -Force

# Clean up temporary files to reduce layer size
RUN Remove-Item -Recurse -Force C:\Windows\Temp\*; \
    Remove-Item -Recurse -Force C:\Users\ContainerAdministrator\AppData\Local\Temp\*
```

## Building .NET Framework Applications

The most common use case for Server Core is hosting .NET Framework applications.

### Console Application

```dockerfile
# Multi-stage build for a .NET Framework console application
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build

WORKDIR C:/src

# Restore NuGet packages first for caching
COPY *.sln .
COPY MyConsoleApp/*.csproj MyConsoleApp/
RUN nuget restore

# Copy source and build
COPY . .
RUN msbuild MyConsoleApp/MyConsoleApp.csproj /p:Configuration=Release /p:OutputPath=C:\output

# Runtime stage - smaller than the SDK image
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

WORKDIR C:/app
COPY --from=build C:/output .

ENTRYPOINT ["MyConsoleApp.exe"]
```

### ASP.NET Web Application

```dockerfile
# Multi-stage build for an ASP.NET application
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build

WORKDIR C:/src
COPY . .
RUN nuget restore
RUN msbuild MyWebApp/MyWebApp.csproj \
    /p:Configuration=Release \
    /p:DeployOnBuild=true \
    /p:PublishUrl=C:\publish

# Runtime stage with IIS and ASP.NET
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# Copy published output to IIS web root
COPY --from=build C:/publish /inetpub/wwwroot/

# Configure IIS application pool for better performance
RUN powershell -Command \
    "Import-Module WebAdministration; \
     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name processModel.idleTimeout -Value '00:00:00'; \
     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name recycling.periodicRestart.time -Value '00:00:00'; \
     Set-ItemProperty 'IIS:\AppPools\DefaultAppPool' -Name startMode -Value 'AlwaysRunning'"
```

## Working with COM Components

Server Core supports COM registration, which many legacy Windows applications require.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Copy COM DLLs
COPY ./com-components/ C:/com/

# Register each COM DLL
RUN Get-ChildItem C:\com\*.dll | ForEach-Object { \
    Write-Host "Registering $($_.Name)..."; \
    regsvr32.exe /s $_.FullName; \
    if ($LASTEXITCODE -ne 0) { \
        Write-Error "Failed to register $($_.Name)"; \
        exit 1 \
    } \
}

# Verify registration
RUN Get-ChildItem 'HKLM:\SOFTWARE\Classes\CLSID' | Where-Object { \
    (Get-ItemProperty $_.PSPath).'(Default)' -like 'MyComComponent*' \
} | Format-Table
```

## Windows Registry Configuration

Applications that read from the registry need their keys configured in the image.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Set registry values that the application expects
RUN powershell -Command \
    "New-Item -Path 'HKLM:\SOFTWARE\MyCompany\MyApp' -Force; \
     Set-ItemProperty -Path 'HKLM:\SOFTWARE\MyCompany\MyApp' -Name 'InstallPath' -Value 'C:\app'; \
     Set-ItemProperty -Path 'HKLM:\SOFTWARE\MyCompany\MyApp' -Name 'LogLevel' -Value 'Warning'; \
     Set-ItemProperty -Path 'HKLM:\SOFTWARE\MyCompany\MyApp' -Name 'MaxConnections' -Value 100 -Type DWord"

# Import a complete registry file
COPY settings.reg C:/temp/
RUN reg import C:\temp\settings.reg
```

## Image Size Optimization Strategies

Server Core images are large. Every optimization matters.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Strategy 1: Combine related operations into single layers
RUN Install-WindowsFeature Web-Server, Web-Asp-Net45; \
    Remove-WindowsFeature -Name Windows-Defender-Features -ErrorAction SilentlyContinue; \
    Remove-Item -Recurse -Force C:\Windows\Temp\*; \
    Remove-Item -Recurse -Force $env:TEMP\*

# Strategy 2: Remove unnecessary Windows features to shrink the image
RUN Remove-WindowsFeature -Name `
    Windows-Defender, `
    FS-SMB1 `
    -ErrorAction SilentlyContinue

# Strategy 3: Clean the package cache
RUN Dism.exe /Online /Cleanup-Image /StartComponentCleanup; \
    Remove-Item -Recurse -Force C:\Windows\SoftwareDistribution\Download\*

# Strategy 4: Use multi-stage builds (shown in examples above)
```

## Event Log and Diagnostics

Server Core includes the Windows Event Log, useful for debugging.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Write startup messages to the event log
RUN powershell -Command \
    "New-EventLog -LogName Application -Source 'MyApp' -ErrorAction SilentlyContinue"

COPY startup.ps1 C:/scripts/

# Startup script that logs to both event log and stdout
# startup.ps1:
# Write-EventLog -LogName Application -Source "MyApp" -EventId 1000 -Message "Application starting"
# Write-Host "Application starting..."
# & C:\app\MyApp.exe
```

Access event logs from outside the container.

```powershell
# Read the application event log from a running container
docker exec my-container powershell -Command \
    "Get-EventLog -LogName Application -Newest 20 | Format-Table TimeGenerated, Source, Message"
```

## Networking and Ports

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Open Windows Firewall ports (if the firewall is enabled)
RUN powershell -Command \
    "New-NetFirewallRule -DisplayName 'MyApp HTTP' -Direction Inbound -Port 8080 -Protocol TCP -Action Allow; \
     New-NetFirewallRule -DisplayName 'MyApp HTTPS' -Direction Inbound -Port 8443 -Protocol TCP -Action Allow"

EXPOSE 8080 8443
```

## Version Tagging Strategy

Windows container images must match the host OS version. Use a consistent tagging strategy.

```powershell
# Tag images with both the app version and Windows version
docker build -t myapp:1.0.0-ltsc2022 .
docker build -t myapp:1.0.0-ltsc2019 -f Dockerfile.ltsc2019 .

# Create multi-platform manifest
docker manifest create myapp:1.0.0 myapp:1.0.0-ltsc2022 myapp:1.0.0-ltsc2019
docker manifest push myapp:1.0.0
```

## Conclusion

Server Core is the essential base image for any Windows application that needs the full .NET Framework, IIS, COM components, MSI installations, or broad Windows API access. Yes, it is large compared to Linux images and Nano Server, but it runs the vast universe of Windows applications without modification. Invest in multi-stage builds, layer optimization, and feature cleanup to manage the image size. For new applications that can target .NET 6+, consider Nano Server instead. For everything else on Windows, Server Core is your foundation.
