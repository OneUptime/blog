# How to Handle Windows Container Image Size Optimization for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Window, Docker

Description: Optimize Windows container images to reduce size, improve pull times, and decrease storage costs with practical Dockerfile techniques and layer caching strategies.

---

Windows container images are notoriously large compared to Linux images. A basic Windows Server Core image is often measured in gigabytes, while full Windows and Windows Server images are larger. In Kubernetes clusters, large images increase pod startup time, consume storage, and slow deployments. This guide covers practical techniques to minimize Windows container image sizes and optimize for Kubernetes workloads.

## Understanding Windows Image Sizes

Windows containers require a Windows base OS layer, which is significantly larger than minimal Linux base images. Windows Server Core has a larger API surface and supports traditional .NET Framework applications. Nano Server offers a much smaller footprint but supports fewer features.

The Windows base layer is shared across containers on the same node, so subsequent containers using the same base image don't download it again. However, your application layers still add to the overall size.

## Choosing the Right Base Image

Select the smallest base image that supports your application:

```dockerfile
# Full Windows Server API surface (avoid unless necessary)
FROM mcr.microsoft.com/windows/server:ltsc2022

# Windows Server Core (for .NET Framework apps)
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Nano Server (for modern .NET apps)
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# ASP.NET specific
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2022

# .NET Runtime only - smaller than SDK
FROM mcr.microsoft.com/dotnet/runtime:10.0-nanoserver-ltsc2022
```

Use multi-stage builds to separate build dependencies from runtime:

```dockerfile
# Multi-stage build - minimal final image
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR /app
COPY *.csproj ./
RUN nuget restore
COPY . ./
RUN msbuild /p:Configuration=Release /p:OutputPath=/app/out

# Runtime stage - much smaller
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2022
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
    Invoke-WebRequest -Uri https://example.com/installer.msi -OutFile C:\installer.msi; \
    Start-Process msiexec.exe -ArgumentList '/i', 'C:\installer.msi', '/quiet', '/norestart' -Wait; \
    Remove-Item C:\installer.msi -Force; \
    Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue; \
    Remove-Item C:\Users\*\AppData\Local\Temp\* -Recurse -Force -ErrorAction SilentlyContinue
```

## Using .dockerignore

Exclude unnecessary files from build context:

```text
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
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2022 AS build
WORKDIR /app

# Copy only project files first (better caching)
COPY *.sln ./
COPY MyApp/MyApp.csproj MyApp/

# Restore packages (cached layer if csproj unchanged)
RUN nuget restore MyApp/MyApp.csproj

# Copy source code
COPY . ./

# Build
RUN msbuild /p:Configuration=Release
```

## Removing Windows Features

Remove optional Windows features only when they are installed and not required by your application:

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Remove unused features to save space
RUN powershell -Command \
    Uninstall-WindowsFeature -Name 'PowerShell-ISE' -Remove -ErrorAction SilentlyContinue; \
    Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase
```

## Cleaning Up Layers

Use DISM to clean up component store:

```dockerfile
RUN powershell -Command \
    Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase
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

Where your Windows-container builder supports BuildKit, use cache mounts for NuGet packages:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM mcr.microsoft.com/dotnet/sdk:10.0-nanoserver-ltsc2022 AS build

# Mount NuGet cache
RUN --mount=type=cache,target=C:\Users\ContainerAdministrator\.nuget\packages \
    dotnet restore

RUN --mount=type=cache,target=C:\Users\ContainerAdministrator\.nuget\packages \
    dotnet build -c Release
```

BuildKit support for Windows containers is experimental, so configure a BuildKit builder for Windows containers before building:

```powershell
docker buildx build -t myapp:cached .
```

## Image Compression

Use Docker's build context compression when sending a context to the daemon:

```powershell
# Compress the build context sent to the daemon
docker build --compress -t myregistry.azurecr.io/myapp:v1 .

# Push the resulting image
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
  selector:
    matchLabels:
      app: windows-app
  template:
    metadata:
      labels:
        app: windows-app
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
