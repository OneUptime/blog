# How to Switch Between Linux and Windows Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Windows Containers, Linux Containers, Windows Server, Switching

Description: Understand and manage the process of switching between Linux and Windows container modes in Docker on Windows, and how Portainer handles both modes.

## Introduction

Docker Desktop on Windows supports two container modes: Linux containers (via WSL2 or Hyper-V) and native Windows containers. Portainer can manage both, but a single Docker daemon only runs one mode at a time. This guide explains how to switch between modes and how to manage your Portainer setup through transitions.

## Understanding the Two Modes

**Linux Containers Mode** (default in Docker Desktop):
- Runs Linux containers via WSL2 or Hyper-V
- Most Docker Hub images work
- Better ecosystem support
- Used for web apps, databases, microservices

**Windows Containers Mode**:
- Runs native Windows containers
- Required for .NET Framework, IIS, Windows services
- Images are Windows-only
- Better Windows OS integration

## Prerequisites

- Windows 10/11 Pro or Enterprise with Docker Desktop
- If you're using Windows Server, use Windows Container Service instead of Docker Desktop; the Docker Desktop switching steps below do not apply
- Portainer deployed

## Switching Container Modes

### Via Docker Desktop System Tray

1. Right-click the Docker icon in the system tray
2. Click **Switch to Windows containers** or **Switch to Linux containers**
3. Docker will restart the daemon

### Via PowerShell (Docker Desktop 4.37+)

```powershell
# Switch to Windows containers
docker desktop engine use windows

# Or switch back to Linux containers
docker desktop engine use linux

# Verify current mode
docker info --format '{{.OSType}}'
```

### Via Docker Desktop CLI (Docker Desktop 4.37+)

```powershell
# List available engines
docker desktop engine ls

# Switch modes
docker desktop engine use windows
docker desktop engine use linux
```

## Handling Portainer Through Mode Switches

If Portainer is running as a Linux container on Docker Desktop or WSL, switching to Windows containers mode makes that Portainer container unavailable on that Docker daemon.

### Solution: Run Portainer with Separate Agents

Run a Portainer server on a separate Linux host and connect agents to the environments you want to manage:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    restart: unless-stopped

volumes:
  portainer_data:
```

On Windows (Linux containers mode):

```powershell
# Deploy Portainer Agent for a Docker Desktop / WSL Linux endpoint
docker run -d `
  --name portainer-agent `
  --restart=always `
  -p 9001:9001 `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v /var/lib/docker/volumes:/var/lib/docker/volumes `
  portainer/agent:lts
```

## Managing Both Modes from One Portainer

In Portainer, you can add multiple environments:

1. Navigate to **Environments > Add environment**
2. Add a **Docker Standalone** environment for your Linux containers endpoint
3. Add a **Docker Standalone** environment for your Windows containers endpoint

## Script for Mode Detection and Switching

```powershell
# PowerShell script to manage container mode switching
function Get-DockerMode {
    $mode = docker info --format '{{.OSType}}' 2>$null
    if ($mode) {
        return $mode.Trim()
    }
    return "unknown"
}

function Switch-ToWindowsContainers {
    Write-Host "Switching to Windows containers..."
    
    # Stop Portainer first if it's running as a Linux container
    docker stop portainer 2>$null
    
    # Switch mode
    docker desktop engine use windows
    
    Start-Sleep -Seconds 10
    
    Write-Host "Now in Windows containers mode."
    Write-Host "A Portainer container running in Linux mode is not available on this daemon."
    Write-Host "Use: docker ps to manage Windows containers directly"
}

function Switch-ToLinuxContainers {
    Write-Host "Switching to Linux containers..."
    
    docker desktop engine use linux
    
    Start-Sleep -Seconds 10
    
    # Restart Portainer
    docker start portainer 2>$null
    
    Write-Host "Now in Linux containers mode."
    Write-Host "Portainer is available again at https://localhost:9443 if it was deployed in Linux mode."
}

# Main
$currentMode = Get-DockerMode
Write-Host "Current Docker mode: $currentMode"
```

## Creating Mode-Specific Docker Compose Files

Maintain separate compose files for each mode:

**`docker-compose.linux.yml`** (Linux containers):
```yaml
services:
  webapp:
    image: nginx:alpine
    ports:
      - "80:80"
```

**`docker-compose.windows.yml`** (Windows containers):
```yaml
services:
  webapp:
    image: mcr.microsoft.com/iis:latest
    ports:
      - "80:80"
```

## Best Practices

1. **Default to Linux containers** for most workloads - better image availability and smaller sizes
2. **Only switch to Windows containers** when you specifically need Windows OS APIs or .NET Framework
3. **Use a Linux-based Portainer server** with remote agents for Windows hosts
4. **Document your workflows** for teams that need to switch modes

## Conclusion

Managing container mode switching requires planning, especially when your Portainer Server runs as a Linux container on Docker Desktop or WSL. The cleanest solution for organizations needing both modes is to use a dedicated Portainer server on Linux with remote agents connecting to Linux and Windows container environments. For simpler setups, maintaining the Linux containers mode as default and switching to Windows mode only when needed works well.
