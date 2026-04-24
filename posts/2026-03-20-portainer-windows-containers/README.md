# How to Manage Windows Containers with Portainer - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Containers, Docker, Windows Server, Self-Hosted, Enterprise

Description: Use Portainer to deploy and manage native Windows containers on Windows Server 2022 for .NET applications and Windows-specific workloads.

## Introduction

Windows containers allow you to run Windows-based applications (.NET Framework, IIS, Windows services) in Docker containers. Portainer supports Windows containers and provides a familiar web interface for managing them. This guide covers deploying and managing Windows containers through Portainer.

## Prerequisites

- Windows Server 2022 with a Windows container runtime configured
- Portainer deployed (see Windows Server 2022 Portainer guide)
- Sufficient disk space (Windows container images are often several hundred MB to a few GB)

## Understanding Windows Container Base Images

Microsoft provides several Windows base images, and .NET publishes Windows-specific images built on top of them:

| Image | Size | Use Case |
|-------|------|---------|
| `mcr.microsoft.com/windows/servercore:ltsc2022` | Several GB | Most Windows apps, .NET Framework |
| `mcr.microsoft.com/windows/nanoserver:ltsc2022` | ~300MB | .NET 6+, small footprint |
| `mcr.microsoft.com/windows:ltsc2022` | ~3.4GB | Apps needing full Windows APIs |
| `mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022` | Varies | ASP.NET Core apps on Nano Server |
| `mcr.microsoft.com/dotnet/runtime:8.0-nanoserver-ltsc2022` | Varies | .NET runtime-only apps on Nano Server |

## Step 1: Verify Docker is Using Windows Containers

```powershell
# Verify the Docker engine is using Windows containers
docker info
# Confirm the output includes: OSType: windows
```

## Step 2: Deploy a .NET Framework Application

In Portainer, create a new stack:

```yaml
# Note: Use Windows-compatible images and paths
services:
  # IIS-hosted ASP.NET application
  aspnet-app:
    image: mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022
    ports:
      - "80:80"
    volumes:
      - C:/inetpub/wwwroot:C:/inetpub/wwwroot
    restart: unless-stopped
```

## Step 3: Windows-Specific Volume Paths

Windows containers use Windows-style paths:

```yaml
services:
  myapp:
    volumes:
      # Windows bind mounts typically use drive-letter paths in Compose
      - C:/app/data:C:/app/data
      - C:/logs:C:/app/logs

      # Named volumes also work
      - appdata:C:/app/data

volumes:
  appdata:
```

## Step 4: Windows Container Environment Variables

```yaml
services:
  myapp:
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    environment:
      # Set application-specific environment variables
      - APP_ENV=production
      - DB_SERVER=sqlserver.example.internal
```

## Step 5: Deploy ASP.NET Core on Nano Server

```yaml
services:
  # Modern .NET application on Nano Server (lightweight)
  dotnet-app:
    image: mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_URLS=http://+:80
      - ASPNETCORE_ENVIRONMENT=Production
    volumes:
      - C:/app:C:/app
    command: ["C:/app/MyWebApp.exe"]
    restart: unless-stopped
```

## Step 6: Windows Container Networking

Windows containers use different network drivers:

```yaml
networks:
  # nat: default for isolated containers
  appnet:
    driver: nat

  # transparent: direct access to physical network
  physicalnet:
    driver: transparent
```

## Step 7: Running a Shell in Windows Containers

Access container console via Portainer:

1. Click on a running container
2. Click **Console**
3. Select `powershell` for Server Core-based images, or `cmd` for Nano Server-based images
4. Click **Connect**

Or via command line:

```powershell
# Run PowerShell in a Server Core-based Windows container
docker exec -it <container-name> powershell

# Use cmd in a Nano Server-based Windows container
docker exec -it <container-name> cmd
```

## Step 8: Building Custom Windows Container Images

```dockerfile
# Dockerfile for a Windows Server Core app
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Install Chocolatey for package management
RUN powershell -Command Set-ExecutionPolicy Bypass -Scope Process -Force; \
    [System.Net.ServicePointManager]::SecurityProtocol = 3072; \
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install application via Chocolatey
RUN choco install -y notepadplusplus

# Copy application files
COPY myapp/ C:/app/

WORKDIR C:/app

CMD ["C:/app/myapp.exe"]
```

## Windows Container Limitations

- **No Linux containers**: When Docker is in Windows containers mode, you cannot run Linux containers
- **Image size**: Windows base images range from a few hundred MB to several GB
- **Pull time**: First pull of Windows images is slow due to their size
- **Process isolation vs Hyper-V isolation**: Default on Windows Server is process isolation; Hyper-V isolation provides stronger isolation and broader version compatibility, but uses more resources

## Conclusion

Portainer's Windows container support makes it straightforward to manage legacy .NET Framework applications, IIS workloads, and other Windows workloads in containers. While Windows containers have higher resource requirements than Linux containers, they enable containerization of applications that have Windows-specific dependencies, bridging the gap between traditional Windows deployments and modern container infrastructure.
