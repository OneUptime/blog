# How to Get Started with Windows Containers in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, windows containers, windows server, containerization, DevOps, .NET, Windows

Description: Get started with Windows containers in Docker, from installation and first container to understanding isolation modes and base images.

---

Windows containers bring the same isolation and portability benefits of Linux containers to the Windows ecosystem. If you run .NET Framework applications, IIS web servers, SQL Server, or any Windows-specific workload, Windows containers let you package and deploy them consistently. The technology has matured significantly since its introduction in Windows Server 2016, and today it is a viable option for production workloads.

This guide takes you from zero to running your first Windows container, explains the different isolation modes, and covers the practical details you need to build Windows container workflows.

## Windows Containers vs Linux Containers

Linux containers dominate the container ecosystem, but Windows containers fill an important gap. Here is what makes them different:

| Feature | Linux Containers | Windows Containers |
|---------|-----------------|-------------------|
| Host OS | Any Linux, macOS (VM), Windows (WSL2) | Windows Server or Windows 10/11 Pro |
| Base images | Alpine (5 MB), Ubuntu (77 MB) | Nano Server (260 MB), Server Core (1.8 GB) |
| Isolation | Namespaces, cgroups | Process isolation or Hyper-V |
| Application types | Most modern apps | .NET Framework, IIS, legacy Windows apps |
| Registry support | Docker Hub, all registries | Docker Hub, MCR (Microsoft Container Registry) |

Windows containers share the Windows kernel, just as Linux containers share the Linux kernel. You cannot run Windows containers on a Linux host natively, and you cannot run Linux containers on Windows natively without a VM layer (which Docker Desktop handles transparently).

## Prerequisites

You need one of the following to run Windows containers:

- **Windows Server 2019 or 2022** with the Containers feature enabled
- **Windows 10/11 Pro or Enterprise** with Docker Desktop installed

### Windows Server Setup

```powershell
# Install the Containers feature on Windows Server
Install-WindowsFeature -Name Containers

# Install Docker Engine
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# Restart the server to complete installation
Restart-Computer

# After restart, verify Docker is running
docker version
```

### Docker Desktop Setup (Windows 10/11)

Download and install Docker Desktop from docker.com. During setup, switch to Windows containers mode. You can toggle between Linux and Windows containers from the system tray icon.

```powershell
# Switch to Windows containers from the command line
& "$Env:ProgramFiles\Docker\Docker\DockerCli.exe" -SwitchDaemon
```

## Running Your First Windows Container

```powershell
# Pull a Windows Server Core image
docker pull mcr.microsoft.com/windows/servercore:ltsc2022

# Run an interactive PowerShell session inside a Windows container
docker run -it mcr.microsoft.com/windows/servercore:ltsc2022 powershell

# Inside the container, check the Windows version
[System.Environment]::OSVersion
```

You are now running PowerShell inside an isolated Windows environment. Everything you do here stays within the container.

```powershell
# Check running processes - notice how few there are compared to a full Windows install
Get-Process

# Check the filesystem
Get-ChildItem C:\

# Exit the container
exit
```

## Understanding Windows Base Images

Microsoft provides several base images through the Microsoft Container Registry (MCR). Choosing the right one matters for image size and compatibility.

### Nano Server

```powershell
# Nano Server - smallest Windows image, about 260 MB
docker pull mcr.microsoft.com/windows/nanoserver:ltsc2022

# Good for: .NET Core/.NET 6+ apps, Go binaries, microservices
docker run mcr.microsoft.com/windows/nanoserver:ltsc2022 cmd /c "echo Hello from Nano Server"
```

### Server Core

```powershell
# Server Core - larger but supports more APIs, about 1.8 GB
docker pull mcr.microsoft.com/windows/servercore:ltsc2022

# Good for: .NET Framework apps, IIS, SQL Server, PowerShell scripts
docker run mcr.microsoft.com/windows/servercore:ltsc2022 powershell -c "Get-WindowsFeature"
```

### Windows (Full)

```powershell
# Full Windows base image - largest, about 3.5 GB
docker pull mcr.microsoft.com/windows:ltsc2022

# Good for: Applications requiring full Windows API, GUI apps (rare in containers)
```

## Building a Simple Windows Container Image

Create a Dockerfile that runs a basic web server using PowerShell.

```dockerfile
# Dockerfile - Simple Windows web server
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Set up a working directory
WORKDIR /app

# Create a simple HTML page
RUN powershell -Command \
    "Set-Content -Path index.html -Value '<html><body><h1>Hello from Windows Container</h1></body></html>'"

# Expose port 8080
EXPOSE 8080

# Start a simple HTTP listener using PowerShell
CMD ["powershell", "-Command", \
     "$listener = New-Object System.Net.HttpListener; \
      $listener.Prefixes.Add('http://+:8080/'); \
      $listener.Start(); \
      Write-Host 'Listening on port 8080...'; \
      while ($listener.IsListening) { \
        $context = $listener.GetContext(); \
        $content = Get-Content -Path /app/index.html -Raw; \
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content); \
        $context.Response.ContentLength64 = $buffer.Length; \
        $context.Response.OutputStream.Write($buffer, 0, $buffer.Length); \
        $context.Response.Close(); \
      }"]
```

Build and run it.

```powershell
# Build the image
docker build -t windows-web-demo .

# Run the container and map the port
docker run -d -p 8080:8080 --name web-demo windows-web-demo

# Test it
curl http://localhost:8080
```

## Windows Container Networking

Windows containers support several networking modes.

```powershell
# List available networks
docker network ls

# Create a NAT network (default on Windows)
docker network create -d nat my-nat-network

# Create a transparent network for direct LAN access
docker network create -d transparent my-transparent-net

# Run a container on a specific network
docker run -d --network my-nat-network mcr.microsoft.com/windows/servercore:ltsc2022 ping -t localhost
```

### Network Modes Explained

- **NAT** - default mode, containers get private IPs behind a NAT gateway
- **Transparent** - containers get IPs directly from the physical network
- **Overlay** - for multi-host container communication (Docker Swarm)
- **L2Bridge** - layer 2 bridging for specific network requirements

```powershell
# Inspect a container's network configuration
docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web-demo
```

## Volume Mounts on Windows

Windows paths use backslashes and drive letters, which changes how you mount volumes.

```powershell
# Mount a host directory into a Windows container
docker run -it -v C:\Users\admin\data:C:\data mcr.microsoft.com/windows/servercore:ltsc2022 powershell

# Named volumes work the same as on Linux
docker volume create mydata
docker run -it -v mydata:C:\data mcr.microsoft.com/windows/servercore:ltsc2022 powershell
```

## Windows Container Lifecycle Management

```powershell
# List running Windows containers
docker ps

# View resource usage
docker stats

# View container logs
docker logs web-demo

# Execute a command in a running container
docker exec -it web-demo powershell

# Stop and remove a container
docker stop web-demo
docker rm web-demo

# Clean up unused images (Windows images are large)
docker image prune -f
```

## Version Compatibility

Windows containers have strict version matching requirements. The container OS version must match or be compatible with the host OS version.

```powershell
# Check the host Windows version
[System.Environment]::OSVersion.Version

# Common version tags and their compatibility:
# ltsc2022 - Windows Server 2022 hosts
# ltsc2019 - Windows Server 2019 hosts
# 20H2    - Windows 10 20H2 hosts
```

If you see an error like "The container operating system does not match the host operating system," you are trying to run a container built for a different Windows version. Either use Hyper-V isolation (which removes this restriction) or pull the image tag that matches your host.

## Common Troubleshooting

**Image pull fails.** Make sure Docker is in Windows container mode, not Linux container mode.

```powershell
# Check current Docker mode
docker info --format '{{.OSType}}'
# Should output "windows"
```

**Container exits immediately.** Windows containers need a foreground process to stay alive, just like Linux containers.

```powershell
# Keep a container running with a long-lived process
docker run -d mcr.microsoft.com/windows/servercore:ltsc2022 ping -t localhost
```

**Port mapping not working.** On Windows, localhost port mapping has some quirks. Try accessing via the container's IP instead.

```powershell
# Get the container IP
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web-demo
# Then access http://<container-ip>:8080
```

## Conclusion

Windows containers open up containerization for the massive ecosystem of Windows applications. Whether you are modernizing .NET Framework apps, containerizing IIS workloads, or building new .NET applications, Windows containers provide the same development workflow and operational benefits that Linux containers deliver. Start with the right base image for your workload, understand the version compatibility rules, and use Hyper-V isolation when you need cross-version support. The investment in learning Windows containers pays off quickly when you can deploy Windows workloads with the same CI/CD pipelines and orchestration tools you use for everything else.
