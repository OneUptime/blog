# How to Build Windows Container Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, windows containers, Dockerfile, image building, multi-stage builds, DevOps, Windows

Description: Master building Windows container images with Dockerfiles, multi-stage builds, layer optimization, and best practices for smaller, faster images.

---

Building Windows container images follows the same Dockerfile syntax as Linux images, but the underlying behavior differs in important ways. Windows images are larger, layer caching matters more because of download times, and certain Dockerfile instructions behave differently on Windows. Understanding these differences helps you build images that are efficient, secure, and fast to deploy.

This guide covers the fundamentals of building Windows container images, from simple single-stage builds to optimized multi-stage patterns for production use.

## Windows Dockerfile Basics

The Dockerfile syntax is identical to Linux, but the shell and path conventions differ.

```dockerfile
# Dockerfile - Basic Windows container
# Always start with a Microsoft base image
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Windows uses backslashes in paths (forward slashes also work in most cases)
WORKDIR C:/app

# RUN instructions execute in cmd.exe by default on Windows
RUN echo Hello from Windows > hello.txt

# Use PowerShell for more complex operations
RUN powershell -Command "Write-Host 'Building Windows image'"

# COPY works the same as Linux
COPY ./files/ C:/app/files/

# CMD sets the default command
CMD ["cmd", "/c", "type", "C:\\app\\hello.txt"]
```

Build this image the same way you would any Docker image.

```powershell
# Build a Windows image
docker build -t my-windows-app .

# Run it
docker run --rm my-windows-app
```

## Choosing the Right Shell

Windows containers default to `cmd.exe` for RUN instructions. You can switch to PowerShell with the SHELL instruction.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Switch the default shell to PowerShell
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Now all RUN commands use PowerShell natively
RUN Write-Host "Installing dependencies..."
RUN New-Item -ItemType Directory -Path C:\app -Force
RUN Invoke-WebRequest -Uri "https://example.com/tool.zip" -OutFile "C:\tool.zip"
RUN Expand-Archive -Path "C:\tool.zip" -DestinationPath "C:\app"
RUN Remove-Item "C:\tool.zip"

WORKDIR C:/app
CMD ["powershell", "-File", "C:\\app\\start.ps1"]
```

Setting `$ErrorActionPreference = 'Stop'` ensures that PowerShell errors fail the build rather than being silently ignored.

## Layer Caching and Optimization

Every RUN instruction creates a new layer. On Windows, layers are larger than their Linux counterparts, making caching strategies critical for build speed.

```dockerfile
# BAD - Each RUN creates a separate layer, increasing image size
FROM mcr.microsoft.com/windows/servercore:ltsc2022
RUN powershell Install-WindowsFeature Web-Server
RUN powershell Install-WindowsFeature Web-Asp-Net45
RUN powershell Install-WindowsFeature Web-Http-Redirect
RUN powershell Remove-Item -Recurse C:\Windows\Temp\*

# GOOD - Combine related operations into a single layer
FROM mcr.microsoft.com/windows/servercore:ltsc2022
RUN powershell -Command \
    "Install-WindowsFeature Web-Server, Web-Asp-Net45, Web-Http-Redirect; \
     Remove-Item -Recurse C:\Windows\Temp\*"
```

Order your Dockerfile instructions from least-frequently changed to most-frequently changed. This maximizes cache hits.

```dockerfile
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# 1. Install OS-level dependencies (changes rarely)
RUN powershell -Command \
    "Install-WindowsFeature Web-Http-Redirect"

# 2. Copy dependency manifests (changes when dependencies change)
COPY packages.config C:/app/
RUN nuget restore C:/app/packages.config -PackagesDirectory C:/app/packages

# 3. Copy application code (changes frequently)
COPY ./src/ C:/app/

# 4. Build the application
RUN msbuild C:/app/MyApp.csproj /p:Configuration=Release
```

## Multi-Stage Builds

Multi-stage builds are essential for Windows images because the SDK images are enormous (often 5+ GB). Build with the SDK, then copy only the output to a smaller runtime image.

```dockerfile
# Stage 1: Build with the .NET Framework SDK
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build

WORKDIR C:/src

# Copy solution and project files for NuGet restore caching
COPY *.sln .
COPY MyApp/*.csproj MyApp/
COPY MyApp.Tests/*.csproj MyApp.Tests/

# Restore NuGet packages (cached unless project files change)
RUN nuget restore

# Copy all source files
COPY . .

# Build the application
RUN msbuild MyApp/MyApp.csproj \
    /p:Configuration=Release \
    /p:OutputPath=C:\output

# Stage 2: Runtime image - much smaller than the SDK image
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022

WORKDIR C:/app

# Copy only the build output
COPY --from=build C:/output .

ENTRYPOINT ["MyApp.exe"]
```

For ASP.NET applications hosted in IIS.

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR C:/src
COPY . .
RUN nuget restore
RUN msbuild MyWebApp/MyWebApp.csproj \
    /p:Configuration=Release \
    /p:DeployOnBuild=true \
    /p:PublishUrl=C:\publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022
COPY --from=build C:/publish /inetpub/wwwroot/
```

## Reducing Image Size

Windows images are inherently larger than Linux images, but you can still reduce their footprint significantly.

### Choose the smallest suitable base image

```dockerfile
# Nano Server is ~260 MB - use for .NET 6+ and Go apps
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# Server Core is ~1.8 GB - use for .NET Framework and IIS
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Full Windows is ~3.5 GB - avoid unless absolutely necessary
FROM mcr.microsoft.com/windows:ltsc2022
```

### Clean up in the same layer

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Download, install, and clean up in one RUN to avoid bloating layers
RUN Invoke-WebRequest -Uri 'https://example.com/installer.msi' -OutFile 'C:\installer.msi'; \
    Start-Process msiexec.exe -ArgumentList '/i', 'C:\installer.msi', '/quiet' -Wait; \
    Remove-Item 'C:\installer.msi' -Force; \
    Remove-Item -Recurse -Force C:\Windows\Temp\*; \
    Remove-Item -Recurse -Force C:\Users\ContainerAdministrator\AppData\Local\Temp\*
```

### Use .dockerignore

Create a `.dockerignore` file to exclude unnecessary files from the build context.

```text
# .dockerignore - Exclude files from the build context
**/.git
**/.vs
**/bin/Debug
**/obj
**/node_modules
**/packages
**/*.user
**/*.suo
*.md
LICENSE
docker-compose*.yml
```

## Working with Windows Features

Windows Server Core images let you install Windows features using PowerShell.

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# List available features
# RUN Get-WindowsFeature | Where-Object InstallState -eq Available

# Install multiple features in one command
RUN Install-WindowsFeature -Name Web-Server, `
    Web-Asp-Net45, `
    Web-Http-Redirect, `
    Web-Websocket, `
    NET-Framework-45-ASPNET

# Verify installed features
RUN Get-WindowsFeature | Where-Object InstallState -eq Installed | Format-Table Name, InstallState
```

## Environment Variables and Arguments

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Build arguments - available only during build
ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE

# Environment variables - available at runtime
ENV APP_VERSION=${BUILD_VERSION}
ENV APP_ENVIRONMENT=production
ENV LOG_LEVEL=info

# Use environment variables in RUN commands
RUN powershell -Command "Write-Host 'Building version $env:APP_VERSION'"

WORKDIR C:/app
COPY . .

CMD ["powershell", "-Command", "Write-Host \"Running version $env:APP_VERSION in $env:APP_ENVIRONMENT\""]
```

Build with arguments.

```powershell
# Pass build arguments during build
docker build -t myapp:2.0.0 `
  --build-arg BUILD_VERSION=2.0.0 `
  --build-arg BUILD_DATE=$(Get-Date -Format "yyyy-MM-dd") .
```

## Health Checks

Add health checks to let Docker monitor your application.

```dockerfile
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

COPY ./website/ C:/inetpub/wwwroot/

# Health check that verifies IIS is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD powershell -Command \
    "try { \
        $response = Invoke-WebRequest -Uri http://localhost -UseBasicParsing -TimeoutSec 5; \
        if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } \
    } catch { exit 1 }"
```

## Security Best Practices

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Create a non-admin user for running the application
RUN net user /add appuser; \
    net localgroup Users appuser /add

WORKDIR C:/app
COPY --chown=appuser . .

# Switch to the non-admin user
USER appuser

CMD ["MyApp.exe"]
```

## Building and Pushing to a Registry

```powershell
# Build the image with a registry tag
docker build -t registry.example.com/myteam/myapp:1.0.0 .

# Tag with latest as well
docker tag registry.example.com/myteam/myapp:1.0.0 registry.example.com/myteam/myapp:latest

# Push both tags
docker push registry.example.com/myteam/myapp:1.0.0
docker push registry.example.com/myteam/myapp:latest

# View the image layers and size
docker history registry.example.com/myteam/myapp:1.0.0
docker images registry.example.com/myteam/myapp
```

## Conclusion

Building Windows container images requires attention to a few platform-specific details: shell selection, layer size management, base image choice, and version compatibility. Multi-stage builds are not optional for Windows - they are essential for keeping image sizes manageable. Combine related RUN commands to minimize layers, clean up temporary files in the same layer they are created, and always use the smallest base image that meets your application's requirements. These practices produce Windows container images that build quickly, push efficiently, and deploy reliably.
