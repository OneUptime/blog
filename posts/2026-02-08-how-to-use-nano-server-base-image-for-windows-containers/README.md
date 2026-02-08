# How to Use Nano Server Base Image for Windows Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, nano server, windows containers, lightweight, .NET, microservices, optimization

Description: Build minimal Windows container images using Nano Server for fast deployments of .NET applications and lightweight microservices.

---

Windows container images have a reputation for being enormous. Server Core weighs in around 1.8 GB, and the full Windows image exceeds 3.5 GB. Nano Server breaks that pattern. At roughly 260 MB, it is the smallest Windows container base image available, making it practical for microservices, APIs, and any workload that does not need the full Windows feature set.

This guide covers what Nano Server includes (and what it leaves out), which applications work well on it, and how to build optimized images using it as a base.

## What Is Nano Server?

Nano Server is a stripped-down Windows image designed specifically for containers and cloud-native applications. Microsoft removed everything unnecessary for running modern applications: no GUI, no full PowerShell, no Windows Installer (MSI), no Server Manager, no COM support, and no full .NET Framework.

What it includes:

- A minimal Windows kernel
- Basic networking stack
- PowerShell Core (not Windows PowerShell)
- .NET runtime support (for .NET 6+)
- Basic file system operations
- HTTP client capabilities

What it does NOT include:

- Windows PowerShell (only PowerShell Core)
- .NET Framework (only .NET 6+)
- MSI installer support
- COM/DCOM components
- IIS (Internet Information Services)
- Server roles and features
- Most Windows APIs beyond the core set

## When to Use Nano Server

Nano Server works well for:

- .NET 6, 7, 8, and newer applications
- Go binaries compiled for Windows
- Rust binaries compiled for Windows
- Node.js applications (with manual installation)
- Static file servers
- API services and microservices
- Sidecar containers in Kubernetes

Nano Server does NOT work for:

- .NET Framework 3.5 or 4.x applications (use Server Core instead)
- IIS-hosted web applications
- Applications requiring COM components
- Applications needing MSI-based installations
- WCF services using Windows-specific transports

## Pulling Nano Server Images

```powershell
# Pull the base Nano Server image
docker pull mcr.microsoft.com/windows/nanoserver:ltsc2022

# Check the image size - much smaller than Server Core
docker images mcr.microsoft.com/windows/nanoserver:ltsc2022

# Run a simple command to verify it works
docker run --rm mcr.microsoft.com/windows/nanoserver:ltsc2022 cmd /c "echo Hello from Nano Server"
```

## Building a .NET Application on Nano Server

The most common use case is hosting .NET 6+ applications. Microsoft provides .NET runtime images based on Nano Server.

```dockerfile
# Dockerfile - .NET 8 API on Nano Server
# Stage 1: Build with the SDK image
FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2022 AS build

WORKDIR /src

# Copy project file and restore dependencies (cached layer)
COPY MyApi.csproj .
RUN dotnet restore

# Copy source code and build
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime on Nano Server - the small image
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022

WORKDIR /app

# Copy published output from the build stage
COPY --from=build /app/publish .

# Expose the API port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

Build and run it.

```powershell
# Build the image
docker build -t my-dotnet-api .

# Check the image size - should be much smaller than a Server Core build
docker images my-dotnet-api

# Run the application
docker run -d -p 8080:8080 --name api my-dotnet-api

# Test the API
curl http://localhost:8080/health
```

## Size Comparison

The difference in image size between base images is substantial.

```powershell
# Pull all three Windows base images to compare
docker pull mcr.microsoft.com/windows/nanoserver:ltsc2022
docker pull mcr.microsoft.com/windows/servercore:ltsc2022
docker pull mcr.microsoft.com/windows:ltsc2022

# Compare sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | findstr "windows"
```

Typical sizes:
- Nano Server: ~260 MB
- Server Core: ~1.8 GB
- Full Windows: ~3.5 GB

For a .NET 8 API, the final image size on Nano Server is typically 300-400 MB total, compared to 2+ GB on Server Core.

## Running Go Applications on Nano Server

Go compiles to a single binary, making it perfect for Nano Server.

```dockerfile
# Dockerfile - Go application on Nano Server
# Stage 1: Build the Go binary
FROM golang:1.22-windowsservercore-ltsc2022 AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build a static binary for Windows
RUN go build -o /app/server.exe ./cmd/server

# Stage 2: Run on Nano Server
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

WORKDIR /app
COPY --from=build /app/server.exe .

EXPOSE 8080
ENTRYPOINT ["server.exe"]
```

The resulting image is just the Nano Server base plus your single binary, typically under 300 MB.

## Running Node.js on Nano Server

Node.js does not have an official Nano Server image, but you can build one.

```dockerfile
# Dockerfile - Node.js on Nano Server
FROM mcr.microsoft.com/windows/servercore:ltsc2022 AS download

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

# Download Node.js binary distribution
RUN Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip" \
    -OutFile "C:\node.zip"; \
    Expand-Archive -Path "C:\node.zip" -DestinationPath "C:\"; \
    Rename-Item "C:\node-v20.11.0-win-x64" "C:\nodejs"

# Stage 2: Copy Node.js to Nano Server
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# Copy Node.js binaries
COPY --from=download C:/nodejs C:/nodejs

# Add Node.js to PATH
USER ContainerAdministrator
RUN setx /M PATH "%PATH%;C:\nodejs"
USER ContainerUser

WORKDIR /app

# Copy application files
COPY package*.json ./
RUN C:\nodejs\npm.exe install --production

COPY . .

EXPOSE 3000
CMD ["C:\\nodejs\\node.exe", "server.js"]
```

## Working Without PowerShell

Nano Server includes PowerShell Core (pwsh), not the full Windows PowerShell. Some operations that are simple on Server Core require different approaches.

```dockerfile
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# cmd.exe is available for basic operations
RUN cmd /c "mkdir C:\app\data"
RUN cmd /c "echo configuration=default > C:\app\config.txt"

# For more complex operations, use PowerShell Core
# Note: PowerShell Core uses 'pwsh' not 'powershell'
# On Nano Server, you may need to install pwsh separately or use cmd
```

## Health Checks on Nano Server

Health checks need to work within Nano Server's limited toolset.

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-ltsc2022

WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080

# Health check using the application's own health endpoint
# Use cmd since curl might not be available
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD ["dotnet", "HealthCheck.dll", "http://localhost:8080/health"]
```

For applications without a built-in health check, create a minimal health check binary.

```csharp
// HealthCheck.cs - Minimal HTTP health check tool
using System;
using System.Net.Http;

var url = args.Length > 0 ? args[0] : "http://localhost:8080/health";
try
{
    using var client = new HttpClient();
    client.Timeout = TimeSpan.FromSeconds(5);
    var response = await client.GetAsync(url);
    Environment.Exit(response.IsSuccessStatusCode ? 0 : 1);
}
catch
{
    Environment.Exit(1);
}
```

## Multi-Architecture Builds

Build images that work on different Windows versions by using manifest lists.

```powershell
# Build for LTSC2022
docker build -t myapp:ltsc2022 --build-arg BASE_TAG=ltsc2022 .

# Build for LTSC2019
docker build -t myapp:ltsc2019 --build-arg BASE_TAG=ltsc2019 .

# Create a manifest list that covers both versions
docker manifest create myapp:latest myapp:ltsc2022 myapp:ltsc2019
docker manifest push myapp:latest
```

Use build arguments to parameterize the base image tag.

```dockerfile
# Dockerfile with parameterized base image version
ARG BASE_TAG=ltsc2022
FROM mcr.microsoft.com/dotnet/aspnet:8.0-nanoserver-${BASE_TAG}

WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

## Troubleshooting Nano Server

**Application fails with missing DLL errors.** The application likely needs APIs not present in Nano Server. Switch to Server Core or statically link the required libraries.

```powershell
# Check which DLLs your application loads
docker run --rm -v ${PWD}:C:\check mcr.microsoft.com/windows/nanoserver:ltsc2022 \
    cmd /c "dir C:\check\*.dll"
```

**Cannot install software using MSI.** Nano Server has no MSI installer. Use zip-based distributions or copy binaries from a Server Core build stage.

**PowerShell commands fail.** Remember that Nano Server uses PowerShell Core (pwsh), not Windows PowerShell. Many cmdlets from the full PowerShell are not available. Use cmd.exe for simple operations or find PowerShell Core equivalents.

## Conclusion

Nano Server is the right choice when your application runs on .NET 6+ or compiles to a standalone binary. The image size savings are dramatic, pulling a 300 MB image versus a 2 GB one makes a real difference in CI/CD pipeline speed and container startup times. The trade-off is a reduced API surface, so applications with legacy Windows dependencies need Server Core instead. For new microservices and modern .NET applications, Nano Server should be your default Windows base image.
