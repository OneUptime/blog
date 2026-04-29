# How to Manage Windows Containers with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Windows Containers, Docker, Container Management, DevOps

Description: Learn how to set up and manage Windows containers using Portainer, including deploying Windows-based images and configuring Windows-specific networking options.

## Introduction

Windows containers allow you to run Windows applications in isolated container environments. Portainer supports managing Windows containers through Docker, giving you the same intuitive GUI experience for Windows workloads that you get with Linux containers.

## Prerequisites

- Windows Server 2019/2022 or Windows 10/11 Pro/Enterprise with Hyper-V
- Docker Desktop for Windows with Windows containers mode enabled, or Docker Engine on Windows Server
- Portainer Server installed, or the ability to deploy it locally as shown below
- Administrator privileges

## Enabling Windows Containers in Docker

On Windows 10/11:
1. Right-click the Docker Desktop icon in the system tray.
2. Select **Switch to Windows containers...**.
3. Confirm the switch.

On Windows Server:

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o install-docker-ce.ps1
.\install-docker-ce.ps1
Restart-Computer -Force
```

## Deploying Portainer on Windows

Run Portainer as a Windows container:

```powershell
docker volume create portainer_data

docker run -d `
  -p 8000:8000 `
  -p 9443:9443 `
  --name portainer `
  --restart always `
  -v \\.\pipe\docker_engine:\\.\pipe\docker_engine `
  -v portainer_data:C:\data `
  portainer/portainer-ce:lts
```

Access Portainer at `https://localhost:9443`.

## Deploying a Windows Container via Portainer

### Using the GUI

1. In Portainer, navigate to **Containers** > **Add container**.
2. Set the image to `mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022` or the tag that matches your host OS version.
3. Configure port mapping: Host `8080` → Container `80`.
4. Set the restart policy to **Always**.
5. Click **Deploy the container**.

### Using a Stack (Docker Compose)

Navigate to **Stacks** > **Add stack** and use an IIS image tag that matches your host OS version. For example:

```yaml
services:
  iis:
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    ports:
      - "8080:80"
    restart: unless-stopped
    volumes:
      - type: bind
        source: C:\inetpub\wwwroot
        target: C:\inetpub\wwwroot
```

## Windows-Specific Networking

Windows containers support multiple networking modes:

```powershell
# Create a NAT network (default for Windows containers)

docker network create --driver nat my-nat-network

# Create a transparent network (direct access to physical network)
docker network create --driver transparent my-transparent-network
```

In Portainer, navigate to **Networks** > **Add network** and select the **nat** driver for Windows containers.

## Managing Container Isolation

Windows supports two isolation modes:

- **Process isolation** – Shares the host kernel and requires close host and container version compatibility.
- **Hyper-V isolation** – Runs the container inside an optimized VM and offers broader host and container version compatibility.

Set isolation mode in your container run configuration:

```powershell
docker run -it --isolation=hyperv mcr.microsoft.com/windows/servercore:ltsc2022 cmd.exe
```

## Monitoring Windows Containers

Portainer provides container statistics including CPU, memory, and network I/O. For advanced metrics, install `windows_exporter` on the host:

```powershell
Invoke-WebRequest -UseBasicParsing "https://github.com/prometheus-community/windows_exporter/releases/download/v0.31.6/windows_exporter-0.31.6-amd64.msi" -OutFile .\windows_exporter.msi
msiexec /i .\windows_exporter.msi --% ADDLOCAL=FirewallException
```

## Best Practices

- Use process isolation in production for performance; use Hyper-V isolation for compatibility.
- Match the container OS version to the host OS version when using process isolation.
- Use Windows Server Core base images for smaller image sizes instead of full Windows Server images.
- Store persistent data in named volumes mapped to appropriate Windows paths.
- Regularly pull updated Windows base images to get security patches.

## Conclusion

Portainer makes managing Windows containers accessible to teams already familiar with Windows environments. The GUI-driven approach simplifies deployment and monitoring of Windows workloads while maintaining full Docker compatibility for scripted and automated deployments.
