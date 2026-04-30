# How to Install Portainer on Windows Server 2022

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Server 2022, Docker, Container, Self-Hosted

Description: Learn how to install Portainer CE on Windows Server 2022 to manage Docker containers through a web UI on a Windows environment.

## Prerequisites

- Windows Server 2022 (Standard or Datacenter)
- Administrator access
- Internet connectivity
- At least 4 GB RAM

## Step 1: Enable Containers

Open PowerShell as Administrator:

```powershell
Install-WindowsFeature -Name Containers -IncludeManagementTools
Restart-Computer -Force
```

## Step 2: Install Docker

After reboot, install Docker CE / Moby using the Microsoft-provided script:

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -OutFile install-docker-ce.ps1
.\install-docker-ce.ps1
```

Verify Docker is running:

```powershell
docker --version
docker info
```

## Step 3: Create a Portainer Data Volume

```powershell
docker volume create portainer_data
```

## Step 4: Deploy Portainer CE

For Windows containers mode:

```powershell
docker run -d `
  -p 8000:8000 `
  -p 9443:9443 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

## Step 5: Configure the Firewall

Allow inbound traffic on Portainer ports:

```powershell
New-NetFirewallRule -DisplayName "Portainer HTTPS" -Direction Inbound -Protocol TCP -LocalPort 9443 -Action Allow
New-NetFirewallRule -DisplayName "Portainer Edge" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

## Step 6: Access Portainer

Open a browser and navigate to:

```text
https://<server-ip>:9443
```

Create your admin account on first login.

## Troubleshooting

**Docker daemon not starting:** Ensure the Containers feature is installed and the Docker service is running.

```powershell
Get-Service docker | Select-Object Status
Start-Service docker
```

**Volume mount errors in Windows containers mode:** Use named volumes or Windows-style paths.

**Check Portainer logs:**
```powershell
docker logs portainer
```

## Updating Portainer

```powershell
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the deploy command

```

## Conclusion

Portainer on Windows Server 2022 provides a web-based interface for managing Docker containers in Windows environments. When running native Windows containers, Portainer simplifies deployment and monitoring from a familiar browser UI.
