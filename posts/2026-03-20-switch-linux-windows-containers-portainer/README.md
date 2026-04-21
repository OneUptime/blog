# How to Switch Between Linux and Windows Containers in Portainer - Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Window, Linux Containers, Docker, Container Mode

Description: Learn how to switch between Linux and Windows container modes on Windows hosts and how this affects your Portainer environment and running containers.

## Understanding Container Modes

On Windows, Docker can run in two modes:

- **Linux container mode**: Uses a lightweight Linux VM (Hyper-V or WSL2) to run Linux images
- **Windows container mode**: Runs native Windows container images on the Windows kernel

Docker Desktop exposes one active engine to the default Docker CLI context at a time, so containers from the inactive mode are not visible through that context.

## How to Switch Container Modes

### Docker Desktop (Windows 10/11)

**Method 1**: Right-click the Docker Desktop tray icon

- If "Switch to Windows containers..." appears → you're in Linux mode
- If "Switch to Linux containers..." appears → you're in Windows mode

**Method 2**: Via command line (Docker Desktop 4.37 and later)

```powershell
# List available engines and the current selection
docker desktop engine ls

# Switch to Windows containers
docker desktop engine use windows

# Switch to Linux containers
docker desktop engine use linux
```

### Docker on Windows Server

```powershell
# Check the daemon OS
docker info --format '{{.OSType}}'
# linux = Linux daemon
# windows = Windows daemon

# Windows Server with Docker Engine runs Windows containers.
# Docker Engine's experimental LCOW mode was removed in Docker Engine 23.0,
# so use Docker Desktop with WSL2 for Linux containers on a Windows host.
```

## What Happens to Portainer When You Switch?

When you switch container modes, **running containers from the previous mode are not accessible** in the new default Docker context. Run Portainer using the image and socket mount that matches the active engine.

```powershell
# 1. Stop Portainer
docker stop portainer

# 2. Switch container mode
docker desktop engine use windows

# 3. Create Portainer for Windows containers
docker volume create portainer_data
docker run -d `
  -p 9443:9443 `
  -p 8000:8000 `
  --name portainer-win `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

## Recommended Pattern: Two Portainer Instances

Keep separate Portainer instances and data volumes for each mode, and start the one that matches the active engine:

```powershell
# Portainer for Linux containers (https://localhost:9443)
docker volume create portainer_linux_data
docker run -d `
  -p 9443:9443 `
  -p 8000:8000 `
  --name portainer-linux `
  --restart always `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v portainer_linux_data:/data `
  portainer/portainer-ce:lts

# Portainer for Windows containers (https://localhost:9444)
docker volume create portainer_windows_data
docker run -d `
  -p 9444:9443 `
  -p 8001:8000 `
  --name portainer-windows `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_windows_data:C:\data `
  portainer/portainer-ce:lts
```

Access when the matching engine is active:
- Linux containers: `https://localhost:9443`
- Windows containers: `https://localhost:9444`

## Verifying Current Mode

```powershell
# Check Docker mode
docker info --format '{{.OSType}}'
# Outputs: linux or windows

# Check available local images
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}"

# Check if a specific image is available for current mode
docker manifest inspect nginx:alpine | Select-String "os"
```

## Container Compatibility Reference

| Image Type | Linux Mode | Windows Mode |
|-----------|-----------|-------------|
| `nginx:alpine` | ✓ Works | ✗ Fails |
| `mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022` | ✗ Fails | ✓ Works |
| `mcr.microsoft.com/dotnet/aspnet:8.0` | ✓ Works | ✗ Use a Windows-specific tag such as `8.0-nanoserver-ltsc2022` |

## Conclusion

Switching between Linux and Windows container modes is a Docker-level operation that affects Portainer's view of the environment. For teams that need both container types, either maintain separate Portainer instances or manage separate Docker environments, such as one Linux host and one Windows container host. The most common setup for development is Linux containers via WSL2 (no mode switching needed), with Windows container mode used only for Windows-specific workloads.
