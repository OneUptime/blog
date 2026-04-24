# How to Run Portainer Edge Agent on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Window, Docker Desktop, Edge Computing

Description: Deploy the Portainer Edge Agent on Windows hosts using Docker Desktop to enable remote management of Windows-based Docker environments from a central Portainer server.

## Introduction

Windows environments running Docker Desktop or Docker Engine can be managed remotely via the Portainer Edge Agent. This is particularly useful for managing Windows workstations, Windows Server hosts, or developer machines from a central Portainer instance without requiring inbound network access. The Edge Agent initiates outbound connections, making it firewall-friendly in corporate environments.

## Prerequisites

- Windows 10/11 or Windows Server 2019/2022
- Docker Desktop for Windows or Docker Engine installed
- Portainer Server (CE or BE). Edge Agent Async mode requires Portainer Business Edition.
- PowerShell 5.1+ or PowerShell Core
- Network access from the Windows host to the Portainer server on port 8000 (tunnel) and 9443 (HTTPS)

## Step 1: Generate an Edge Environment in Portainer

Navigate to **Environments** → **Add environment** → **Docker Standalone** → **Edge Agent Standard**.

Fill in:
- **Name**: `windows-workstation-01`
- **Portainer API server URL**: `https://portainer.example.com`
- **Portainer tunnel server address** (BE only): `portainer.example.com:8000`

Click **Create** and copy the Edge ID and Edge Key shown on the screen.

## Step 2: Deploy the Edge Agent with Docker Desktop

Open PowerShell as Administrator on the Windows host.

```powershell
# Set your Edge ID and Edge Key

$EDGE_ID = "your-edge-id-here"
$EDGE_KEY = "your-edge-key-here"

# Pull the Portainer Edge Agent image that matches your Portainer Server version
docker pull portainer/agent:YOUR_PORTAINER_VERSION

# Run the Edge Agent container for Docker Desktop using Linux containers
docker run -d `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v /var/lib/docker/volumes:/var/lib/docker/volumes `
  -v /:/host `
  -v portainer_agent_data:/data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID=$EDGE_ID `
  -e EDGE_KEY=$EDGE_KEY `
  -e EDGE_INSECURE_POLL=0 `
  --name portainer_edge_agent `
  portainer/agent:YOUR_PORTAINER_VERSION
```

On Windows with Docker Desktop using Windows Containers mode, use the Windows container mounts:

```powershell
docker run -d `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID=$EDGE_ID `
  -e EDGE_KEY=$EDGE_KEY `
  -e EDGE_INSECURE_POLL=0 `
  --name portainer_edge_agent `
  portainer/agent:YOUR_PORTAINER_VERSION
```

## Step 3: Deploy via Docker Compose on Windows

If Docker Desktop is using Linux containers, create `C:\portainer\docker-compose.yml`:

```yaml
services:
  portainer_edge_agent:
    image: portainer/agent:YOUR_PORTAINER_VERSION
    container_name: portainer_edge_agent
    restart: always
    environment:
      EDGE: "1"
      EDGE_ID: "${EDGE_ID}"
      EDGE_KEY: "${EDGE_KEY}"
      EDGE_INSECURE_POLL: "0"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
      - portainer_agent_data:/data

volumes:
  portainer_agent_data:
```

Create `C:\portainer\.env`:

```text
EDGE_ID=your-edge-id-here
EDGE_KEY=your-edge-key-here
```

Deploy:

```powershell
cd C:\portainer
docker compose up -d
```

## Step 4: Run as a Windows Service with NSSM

For production deployments on Windows Server or other hosts running Windows Containers with Docker starting automatically, run the Edge Agent as a Windows Service so it starts automatically with the system.

```powershell
# Install NSSM (Non-Sucking Service Manager)
winget install NSSM.NSSM

# Create a startup script
$startScript = @'
docker container inspect portainer_edge_agent *> $null
if ($LASTEXITCODE -eq 0) {
  docker start portainer_edge_agent | Out-Null
} else {
  docker run -d `
    --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
    --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
    --mount type=volume,src=portainer_agent_data,dst=C:\data `
    -e EDGE=1 `
    -e EDGE_ID=your-edge-id `
    -e EDGE_KEY=your-edge-key `
    -e EDGE_INSECURE_POLL=0 `
    --name portainer_edge_agent `
    --restart always `
    portainer/agent:YOUR_PORTAINER_VERSION
}
'@

$startScript | Out-File -FilePath "C:\portainer\start-agent.ps1"

# Register as a service
nssm install PortainerEdgeAgent powershell.exe
nssm set PortainerEdgeAgent AppParameters "-ExecutionPolicy Bypass -File C:\portainer\start-agent.ps1"
nssm set PortainerEdgeAgent Start SERVICE_AUTO_START
nssm start PortainerEdgeAgent
```

## Step 5: Configure Windows Firewall

The Edge Agent initiates outbound connections only. Ensure outbound access is allowed:

```powershell
# Allow outbound HTTPS to Portainer (port 9443)
New-NetFirewallRule `
  -DisplayName "Portainer Edge Agent HTTPS" `
  -Direction Outbound `
  -Protocol TCP `
  -RemotePort 9443 `
  -Action Allow

# Allow outbound tunnel connection (port 8000)
New-NetFirewallRule `
  -DisplayName "Portainer Edge Agent Tunnel" `
  -Direction Outbound `
  -Protocol TCP `
  -RemotePort 8000 `
  -Action Allow
```

## Step 6: Verify the Connection

Check the agent container logs in PowerShell:

```powershell
docker logs --tail 50 -f portainer_edge_agent
```

Expected output should indicate that the agent starts successfully and begins polling Portainer.

In the Portainer UI, navigate to **Environments** and verify the Windows environment shows as **Heartbeat** active.

## Async Mode for Intermittently Connected Windows Hosts

For laptops or machines that may be offline periodically and are using Docker Desktop with Linux containers:

```powershell
docker run -d `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v /var/lib/docker/volumes:/var/lib/docker/volumes `
  -v /:/host `
  -v portainer_agent_data:/data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID=$EDGE_ID `
  -e EDGE_KEY=$EDGE_KEY `
  -e EDGE_INSECURE_POLL=0 `
  -e EDGE_ASYNC=1 `
  --name portainer_edge_agent `
  portainer/agent:YOUR_PORTAINER_VERSION
```

With async mode enabled, the agent will periodically upload environment state and download pending commands. Configure the ping, command, and snapshot intervals in Portainer when you create the async Edge environment.

## Troubleshooting

**Agent cannot connect:**
- Verify DNS resolution of the Portainer server hostname from the Windows host
- Check `Test-NetConnection portainer.example.com -Port 9443` and `Test-NetConnection portainer.example.com -Port 8000` from PowerShell
- Ensure Docker Desktop is running before the agent starts

**Docker socket not found:**
- Confirm Docker Desktop is running: `docker info`
- Check the Docker context: `docker context ls`
- Switch to the Docker Desktop context shown by `docker context ls` if the active context is incorrect

**Container restarts repeatedly:**
- Review full logs: `docker logs portainer_edge_agent`
- Verify the EDGE_KEY is correct and matches the environment in Portainer
- Check that the environment ID in Portainer matches EDGE_ID

## Conclusion

Running the Portainer Edge Agent on Windows enables centralized management of Docker workloads across Windows hosts without requiring VPN or inbound firewall rules. The outbound-only architecture is well-suited for corporate Windows environments where IT policy restricts inbound connections. For maximum reliability on Windows Server or Windows Containers deployments, combine Docker with a startup script registered as a Windows Service so the agent survives reboots and system events automatically.
