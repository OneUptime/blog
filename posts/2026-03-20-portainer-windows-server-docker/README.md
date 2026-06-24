# How to Install Portainer on Windows Server with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows-server, Docker, Installation, Enterprise

Description: A guide to installing Portainer CE on Windows Server with Docker Engine (Linux containers via Hyper-V), covering enterprise deployment scenarios.

## Overview

Windows Server can host Docker-compatible Windows containers, and Portainer provides an official Windows Container Service installation path for Portainer CE. Docker Desktop is not supported on Windows Server 2019 or 2022, so this guide uses Docker Engine on Windows Server with Windows containers.

## Prerequisites

- Windows Server 2019 or 2022 (Datacenter or Standard)
- Administrator access
- Windows installed on `C:`
- Internet access

## Step 1: Enable Required Windows Features

On Windows Server, the Microsoft installation script used in the next step enables the required Windows container features automatically. Hyper-V is only required if you plan to run Hyper-V-isolated Windows containers.

## Step 2: Install Docker on Windows Server

### Option A: Install Docker CE / Moby

```powershell
# Install Docker Engine on Windows Server using Microsoft's script
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o install-docker-ce.ps1
.\install-docker-ce.ps1
```

Restart the server after the script completes.

### Option B: Mirantis Container Runtime (Supported Enterprise Option)

If you need a supported enterprise runtime for Windows Server containers, install Mirantis Container Runtime instead of Docker CE / Moby.

## Step 3: Verify Docker on Windows Server

```powershell
# Verify the Docker service is running
Get-Service docker

# Verify the Docker server is available
docker version
```

## Step 4: Deploy Portainer CE

```powershell
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d `
  -p 8000:8000 `
  -p 9443:9443 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts

# Verify
docker ps
```

Note: Windows container installs use the named pipe path `\\.\pipe\docker_engine`, and port `8000` is only required if you plan to use Edge agents.

## Step 5: Configure Windows Firewall

```powershell
# Allow Portainer ports through Windows Firewall
New-NetFirewallRule `
  -DisplayName "Portainer HTTPS" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9443 `
  -Action Allow

New-NetFirewallRule `
  -DisplayName "Portainer Tunnel (Optional)" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 8000 `
  -Action Allow
```

## Step 6: Access Portainer

```powershell
# Get server IPv4 addresses
Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias

# Access URL
Write-Host "Portainer URL: https://$(hostname):9443"
```

## Step 7: Set Up as Windows Service (Auto-Start)

Docker's `--restart always` handles container restart, but ensure Docker itself starts with Windows:

```powershell
# For Docker Engine service:
Get-Service docker
Set-Service -Name docker -StartupType Automatic
```

## Running Windows Containers in Portainer

Portainer also supports native Windows containers:

```powershell
# Use a Windows image tag that matches your host OS version.
# Example for Windows Server 2022:
# For Windows Server 2019, use windowsservercore-ltsc2019 instead.
docker run -d --name iis mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022

# Portainer will show the Windows container in the local environment
```

## Troubleshooting on Windows Server

### Docker Socket Path Issue

```powershell
# Recreate Portainer with the Windows named pipe and Windows data path
docker run -d `
  -p 8000:8000 `
  -p 9443:9443 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

### Hyper-V Not Available

Hyper-V is not required for the basic Windows Container Service installation in this guide. If your Windows Server host is a VM and you plan to use Hyper-V-isolated Windows containers, nested virtualization must be enabled.

## Conclusion

Running Portainer on Windows Server uses Docker Engine with Windows containers rather than Docker Desktop with Linux-container mode. While Linux remains the most straightforward option for Linux container workloads, Windows Server + Portainer is a valid approach when you need to manage Windows container hosts.
