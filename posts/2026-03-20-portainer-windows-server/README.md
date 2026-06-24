# How to Install Portainer on Windows Server 2022 with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Server, Docker, Windows Containers

Description: Learn how to install Portainer on Windows Server 2022 to manage Docker containers running on Windows, including both Linux containers via Hyper-V and native Windows containers.

## Prerequisites

- Windows Server 2022 (or 2019)
- Administrator access
- Internet connectivity for downloading Docker

## Step 1: Install Docker on Windows Server

Docker Desktop is for desktop OS. On Windows Server, use a supported Windows container runtime such as Moby or Mirantis Container Runtime:

```powershell
# Download and run Microsoft's Docker installation script
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -OutFile install-docker-ce.ps1
.\install-docker-ce.ps1

# Restart required
Restart-Computer -Force
```

After restart:

```powershell
# Verify installation
docker version
```

## Step 2: Install Portainer

```powershell
# Create volume for Portainer data
docker volume create portainer_data

# Run Portainer
docker run -d `
  -p 8000:8000 `
  -p 9443:9443 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

Note: Windows uses `\\.\pipe\docker_engine` instead of a Unix socket.

## Step 3: Configure Windows Firewall

```powershell
# Allow Portainer HTTPS port
New-NetFirewallRule `
  -DisplayName "Portainer HTTPS" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9443 `
  -Action Allow
```

If you also publish `-p 9000:9000` for legacy HTTP access, add a matching firewall rule for port `9000`.

## Step 4: Access Portainer

Open a browser and navigate to:
```text
https://SERVER_IP:9443
```

Complete the initial setup to create your admin account.

## Step 5: Container Mode Notes

Windows Server supports Windows Server containers and Hyper-V-isolated Windows containers. Linux Containers on Windows (LCOW) on Windows Server has been deprecated, so you should not rely on switching this host between Linux and Windows container modes.

If you need to manage Linux containers in Portainer, add a separate Linux Docker environment.

## Running a Test Container

```powershell
# Windows container test
docker run -d -p 8081:80 --name iis-test mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
```

## Portainer with Docker Compose on Windows

```powershell
# Install Docker Compose standalone (legacy)
Start-BitsTransfer -Source "https://github.com/docker/compose/releases/download/v5.1.2/docker-compose-windows-x86_64.exe" `
  -Destination $Env:ProgramFiles\Docker\docker-compose.exe

# Verify installation
docker-compose.exe version
```

Note: This standalone installation is a legacy option and uses the `docker-compose` syntax. Portainer stacks can consume Compose-formatted YAML directly in the UI.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Named pipe error | Wrong volume mount for Docker socket | Use `\\.\pipe\docker_engine` |
| Container not starting | Host/image version mismatch | Use a Windows image compatible with the host version |
| Port conflict | Windows services using port 80 | Check IIS or other services |

## Conclusion

Portainer on Windows Server 2022 provides a familiar web-based management interface for Docker on Windows. The primary difference from Linux installations is the Docker socket path (named pipe instead of Unix socket). If you also manage Linux containers, add a separate Linux environment to Portainer rather than trying to run Linux containers directly on the Windows Server host.
