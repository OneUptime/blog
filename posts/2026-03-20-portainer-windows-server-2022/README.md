# How to Install Portainer on Windows Server 2022 with Docker - 2022

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Server, Docker, Windows Containers, Self-Hosted, Enterprise

Description: Install Docker Engine and Portainer on Windows Server 2022 to manage both Linux containers (via WSL2) and native Windows containers from a single interface.

## Introduction

Windows Server 2022 supports native Windows containers with a supported container runtime such as Moby, Mirantis Container Runtime, or containerd. WSL2 is also available on Windows Server 2022 for Linux-container development and testing, but Docker Desktop is not supported on Windows Server. This guide covers setting up Docker and Portainer on Windows Server 2022 using Windows containers.

## Prerequisites

- Windows Server 2022 (Standard or Datacenter)
- Administrator access
- Internet connectivity
- Sufficient CPU and memory for Windows Server and the containers you plan to run

## Step 1: Install Required Windows Features

Open PowerShell as Administrator:

```powershell
# Optional: pre-enable the Containers feature
Install-WindowsFeature -Name Containers

# Optional: install Hyper-V only if you plan to use Hyper-V isolation
Install-WindowsFeature -Name Hyper-V -IncludeManagementTools
```

## Step 2: Install Docker on Windows Server 2022

### Option A: Docker Engine / Moby

```powershell
# Install Docker Engine
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o install-docker-ce.ps1
.\install-docker-ce.ps1
```

### Option B: Mirantis Container Runtime

For an enterprise-supported runtime on Windows Server, install Mirantis Container Runtime using Mirantis' official documentation.

### Option C: Windows Admin Center

You can also install the runtime through the Windows Admin Center Containers extension.

## Step 3: Restart the Server

```powershell
Restart-Computer
```

If you used the Microsoft `install-docker-ce.ps1` script, restart the server after the script completes before continuing.

## Step 4: Verify Docker is Running

```powershell
Start-Service docker
Set-Service docker -StartupType Automatic

docker version
docker info
```

## Step 5: Deploy Portainer

```powershell
# Create Portainer data volume
docker volume create portainer_data

# Deploy Portainer (Windows containers)
docker run -d `
  --name portainer `
  --restart=always `
  -p 9443:9443 `
  -p 9000:9000 `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

Note the Windows named pipe mount: `\\.\pipe\docker_engine:\\.\pipe\docker_engine`.
The `-p 9000:9000` mapping is only needed if you want Portainer's legacy HTTP endpoint in addition to HTTPS on `9443`.

## Step 6: Configure Windows Firewall

```powershell
# Allow Portainer HTTPS through Windows Firewall
New-NetFirewallRule -DisplayName "Portainer HTTPS" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9443 `
  -Action Allow

# Optional: allow the legacy HTTP endpoint if you published port 9000
New-NetFirewallRule -DisplayName "Portainer HTTP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9000 `
  -Action Allow
```

## Step 7: Access Portainer

Navigate to `https://localhost:9443` or `https://<server-ip>:9443`. If you kept the legacy HTTP mapping, `http://localhost:9000` is also available.

## Step 8: Managing Windows Containers with Portainer

```powershell
# Pull a Windows base image
docker pull mcr.microsoft.com/windows/nanoserver:ltsc2022

# Deploy a Windows container via Portainer
# In Portainer, create a new container:
# Image: mcr.microsoft.com/windows/nanoserver:ltsc2022
```

## Troubleshooting

### Docker Service Won't Start

```powershell
# Check the Docker service
Get-Service docker

# Check recent Docker-related Application log entries
Get-WinEvent -LogName Application -MaxEvents 200 |
  Where-Object { $_.ProviderName -like "*docker*" } |
  Select-Object -First 20

# Check Docker daemon logs
if (Test-Path C:\ProgramData\Docker\config\daemon.json) {
  Get-Content C:\ProgramData\Docker\config\daemon.json
}
```

### Port Already in Use

```powershell
# Find what's using Portainer's ports
$ports = Get-NetTCPConnection -LocalPort 9443,9000 -State Listen
$ports | Select-Object LocalPort, OwningProcess

if ($ports) {
  Get-Process -Id $ports.OwningProcess
}
```

## Conclusion

Portainer on Windows Server 2022 provides a web-based management interface for Windows containers. WSL2 can also be used separately on Windows Server 2022 for Linux-container development and testing, but Docker Desktop and daemon switching are not supported on Windows Server. For a Windows Server deployment, use the documented Windows container installation path and access Portainer over HTTPS on port 9443.
