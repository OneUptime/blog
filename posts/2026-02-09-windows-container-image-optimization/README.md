# How to Handle Windows Container Image Size Optimization for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Docker

Description: Optimize Windows container images to reduce size, improve pull times, and decrease storage costs with practical Dockerfile techniques and layer caching strategies.

---

Windows container images are notoriously large compared to Linux images. A basic Windows Server Core image starts at 2-4 GB, while Windows images can exceed 10 GB. In Kubernetes clusters, large images increase pod startup time, consume storage, and slow deployments. This guide covers practical techniques to minimize Windows container image sizes and optimize for Kubernetes workloads.

## Understanding Windows Image Sizes

Windows containers require the Windows base OS layer, which is significantly larger than Linux kernels. Windows Server Core provides full .NET Framework and Windows APIs but weighs around 2.5 GB. Nano Server offers a minimal footprint at around 100 MB but supports fewer features.

The Windows base layer is shared across containers on the same node, so subsequent containers using the same base image don't download it again. However, your application layers still add to the overall size.

## Choosing the Right Base Image

Select the smallest base image that supports your application:

```dockerfile
# Full Windows Server - 5+ GB (avoid unless necessary)
FROM mcr.microsoft.com/windows:latest

# Windows Server Core - 2.5 GB (for .NET Framework apps)
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Nano Server - 100 MB (for .NET Core/5+)
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# ASP.NET specific - 2.8 GB
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET Runtime only - smaller than SDK
FROM mcr.microsoft.com/dotnet/runtime:6.0-nanoserver-ltsc2022
```

Use multi-stage builds to separate build dependencies from runtime:

```dockerfile
# Multi-stage build - minimal final image
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8 AS build
WORKDIR /app
COPY *.csproj ./
RUN nuget restore
COPY . ./
RUN msbuild /p:Configuration=Release /p:OutputPath=/app/out

# Runtime stage - much smaller
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022
WORKDIR /app
COPY --from=build /app/out ./
EXPOSE 80
ENTRYPOINT ["MyApp.exe"]
```

## Optimizing Dockerfile Layers

Each Dockerfile instruction creates a layer. Combine commands to reduce layers:

```dockerfile
# Bad - multiple layers
FROM mcr.microsoft.com/windows/servercore:ltsc2022
RUN powershell -Command Remove-Item C:\temp\* -Recurse
RUN powershell -Command New-Item -Path C:\app -ItemType Directory
RUN powershell -Command Invoke-WebRequest -Uri https://example.com/app.zip -OutFile C:\app.zip
RUN powershell -Command Expand-Archive C:\app.zip -DestinationPath C:\app
RUN powershell -Command Remove-Item C:\app.zip

# Good - single layer
FROM mcr.microsoft.com/windows/servercore:ltsc2022
RUN powershell -Command \
    Remove-Item C:\temp\* -Recurse -ErrorAction SilentlyContinue; \
    New-Item -Path C:\app -ItemType Directory -Force; \
    Invoke-WebRequest -Uri https://example.com/app.zip -OutFile C:\app.zip; \
    Expand-Archive C:\app.zip -DestinationPath C:\app; \
    Remove-Item C:\app.zip -Force
```

## Cleaning Up Unnecessary Files

Remove temporary files and caches in the same layer:

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Install and clean in same layer
RUN powershell -Command \
    # Download installer \
    Invoke-WebRequest -Uri https://example.com/installer.msi -OutFile C:\installer.msi; \
    # Install application \
    Start-Process msiexec.exe -ArgumentList '/i', 'C:\installer.msi', '/quiet', '/norestart' -Wait; \
    # Remove installer immediately \
    Remove-Item C:\installer.msi -Force; \
    # Clean Windows temp files \
    Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue; \
    # Clean user temp \
    Remove-Item C:\Users\*\AppData\Local\Temp\* -Recurse -Force -ErrorAction SilentlyContinue
```

## Using .dockerignore

Exclude unnecessary files from build context:

```
# .dockerignore
**/.git
**/.gitignore
**/.vs
**/.vscode
**/bin/Debug
**/obj
**/packages
**/*.log
**/*.md
**/Dockerfile*
.dockerignore
```

This reduces build context size and speeds up builds.

## Optimizing NuGet Package Restore

Cache NuGet packages efficiently:

```dockerfile
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8 AS build
WORKDIR /app

# Copy only project files first (better caching)
COPY *.sln ./
COPY **/*.csproj ./
RUN for %i in (*.csproj) do md "%~ni" && move "%i" "%~ni\"

# Restore packages (cached layer if csproj unchanged)
RUN nuget restore

# Copy source code
COPY . ./

# Build
RUN msbuild /p:Configuration=Release
```

## Removing Windows Features

Remove unnecessary Windows features:

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Remove unused features to save space
RUN powershell -Command \
    Remove-WindowsFeature -Name 'Windows-Defender' -ErrorAction SilentlyContinue; \
    Remove-WindowsFeature -Name 'PowerShell-ISE' -ErrorAction SilentlyContinue; \
    Remove-Item -Path C:\Windows\WinSxS\Backup -Recurse -Force -ErrorAction SilentlyContinue
```

## Compressing Layers

Use DISM to clean up component store:

```dockerfile
RUN powershell -Command \
    Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase; \
    Dism.exe /online /Cleanup-Image /SPSuperseded
```

## Example: Optimized .NET Framework Application

Complete optimized Dockerfile:

```dockerfile
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR /src

# Copy and restore dependencies (cached layer)
COPY ["MyApp/MyApp.csproj", "MyApp/"]
RUN nuget restore "MyApp/MyApp.csproj"

# Copy source and build
COPY . .
WORKDIR "/src/MyApp"
RUN msbuild /p:Configuration=Release /p:OutputPath=/app/publish /p:DebugType=None /p:DebugSymbols=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022 AS runtime

# Remove default IIS content
RUN powershell -Command Remove-Item -Path 'C:\inetpub\wwwroot\*' -Recurse -Force

# Copy published app
WORKDIR /inetpub/wwwroot
COPY --from=build /app/publish ./

# Clean up
RUN powershell -Command \
    Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue; \
    Remove-Item C:\inetpub\logs\* -Recurse -Force -ErrorAction SilentlyContinue

EXPOSE 80
```

Build and check size:

```bash
docker build -t myapp:optimized .
docker images myapp:optimized
```

## Layer Caching Strategies

Order Dockerfile instructions from least to most frequently changing:

```dockerfile
# 1. Base image (rarely changes)
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# 2. System dependencies (changes occasionally)
RUN powershell -Command Install-WindowsFeature Web-Server

# 3. Application dependencies (changes when dependencies update)
COPY packages.config ./
RUN nuget install packages.config

# 4. Application code (changes frequently)
COPY app/ ./app/

# 5. Configuration (changes most frequently)
COPY config/ ./config/
```

## Using Build Cache Mounts

Use BuildKit cache mounts for NuGet packages:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM mcr.microsoft.com/dotnet/sdk:6.0-nanoserver-ltsc2022 AS build

# Mount NuGet cache
RUN --mount=type=cache,target=C:\Users\ContainerAdministrator\.nuget\packages \
    dotnet restore

RUN --mount=type=cache,target=C:\Users\ContainerAdministrator\.nuget\packages \
    dotnet build -c Release
```

Enable BuildKit:

```bash
$env:DOCKER_BUILDKIT=1
docker build -t myapp:cached .
```

## Image Compression

Use image compression when pushing to registry:

```bash
# Use Docker BuildKit with compression
$env:DOCKER_BUILDKIT=1
docker build --compress -t myregistry.azurecr.io/myapp:v1 .

# Push with compression
docker push myregistry.azurecr.io/myapp:v1
```

## Kubernetes Image Pull Optimization

Configure image pull policies:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: app
        image: myregistry.azurecr.io/app:v1
        imagePullPolicy: IfNotPresent  # Reuse cached images
```

Pre-pull images to nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
spec:
  selector:
    matchLabels:
      app: prepuller
  template:
    metadata:
      labels:
        app: prepuller
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      initContainers:
      - name: prepull
        image: myregistry.azurecr.io/app:v1
        command: ["powershell", "-Command", "Write-Host 'Image pulled'"]
      containers:
      - name: pause
        image: mcr.microsoft.com/windows/nanoserver:ltsc2022
        command: ["powershell", "-Command", "Start-Sleep 86400"]
```

## Monitoring Image Sizes

Track image sizes:

```bash
# List images by size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | sort -k 3 -h

# View image layers
docker history myapp:v1

# Check layer sizes
docker image inspect myapp:v1 --format='{{json .RootFS.Layers}}' | jq .
```

## Conclusion

Optimizing Windows container images requires choosing appropriate base images, using multi-stage builds, combining Dockerfile commands, removing unnecessary files, and implementing effective layer caching. While Windows images will always be larger than Linux equivalents, these techniques can reduce sizes by 30-50%. Smaller images mean faster deployments, reduced storage costs, and improved Kubernetes pod startup times.
