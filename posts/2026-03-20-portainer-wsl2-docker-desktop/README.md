# How to Install Portainer on WSL2 with Docker Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WSL2, Window, Docker-desktop, Installation

Description: A guide to installing and running Portainer CE on Windows using WSL2 and Docker Desktop for local container development and management.

## Overview

WSL2 (Windows Subsystem for Linux 2) with Docker Desktop provides a Linux-native Docker experience on Windows. Portainer CE can be deployed as a Docker container within this environment, giving Windows developers a full container management UI. This guide covers the setup process.

## Prerequisites

- A Windows 10 or Windows 11 release currently supported by Docker Desktop
- WSL version 2.1.5 or later enabled
- Docker Desktop with WSL2 backend installed
- 8GB system RAM

## Step 1: Enable WSL2

```powershell
# In PowerShell (as Administrator)

wsl --install -d Ubuntu
wsl --update

# Verify WSL and distro version
wsl --version
wsl --list --verbose

# If Ubuntu shows VERSION 1, upgrade it to WSL 2
wsl --set-version Ubuntu 2
```

## Step 2: Install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and enable "Use WSL2 based engine"
3. In Docker Desktop Settings → Resources → WSL Integration, enable integration with your Ubuntu distro

## Step 3: Verify Docker in WSL2

```bash
# Open Ubuntu WSL terminal
docker --version
docker run hello-world
```

## Step 4: Deploy Portainer CE

```bash
# In your WSL2 Ubuntu terminal

# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Verify
docker ps | grep portainer
```

## Step 5: Access Portainer from Windows Browser

Since Docker Desktop maps WSL2 ports to Windows localhost:

```text
https://localhost:9443
```

This opens directly in your Windows browser. Accept the self-signed certificate warning and complete the setup.

## Step 6: Configure Windows Firewall (if needed)

Docker Desktop automatically handles port mapping, but if you need to access Portainer from other machines on your network:

```powershell
# PowerShell (as Administrator)
New-NetFirewallRule -DisplayName "Portainer HTTPS" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9443 `
  -Action Allow

# Optional: only needed if you use Portainer's tunnel / Edge features
New-NetFirewallRule -DisplayName "Portainer Tunnel" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 8000 `
  -Action Allow
```

## Step 7: Create a Desktop Shortcut

```powershell
# PowerShell: Create shortcut to Portainer
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Portainer.url")
$Shortcut.TargetPath = "https://localhost:9443"
$Shortcut.Save()
```

## Tips for WSL2 + Portainer

### Accessing Windows Files from Containers

```bash
# Windows drives are mounted at /mnt in WSL2
ls /mnt/c/Users/YourName/Projects

# Mount Windows directory as a volume in a container
docker run -v /mnt/c/Users/YourName/myapp:/app myapp:latest
```

### Using Docker Contexts

```bash
# Docker Desktop creates a context for WSL2
docker context ls
# default and desktop-linux contexts

# Portainer connects to the local Docker daemon automatically
```

### Memory Limits

WSL2 can consume significant RAM. Limit it:

```ini
# Create or edit C:\Users\YourName\.wslconfig
[wsl2]
memory=4GB
processors=4
```

## Troubleshooting

### Portainer Cannot Connect to Docker Socket

```bash
# Verify socket exists in WSL2
ls -la /var/run/docker.sock
# Should show the Docker socket

# If missing, Docker Desktop WSL integration may not be enabled
# Docker Desktop → Settings → Resources → WSL Integration → Enable Ubuntu
```

### Port Conflicts

```bash
# Check if port 9443 is in use on Windows
netstat -an | findstr "9443"   # In PowerShell

# Change Portainer port if needed
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9444:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Conclusion

Portainer CE on WSL2 with Docker Desktop provides an excellent local development environment for Windows users. The seamless port mapping between WSL2 and Windows allows accessing Portainer directly at localhost:9443 from your Windows browser. This setup is ideal for developers who work primarily on Windows but need a full container management interface.
