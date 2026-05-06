# How to Configure Edge Agent Poll Frequency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Configuration, Poll Frequency, Bandwidth

Description: Adjust how frequently the Portainer Edge Agent polls the server for commands to balance responsiveness with bandwidth usage.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS polling :9443| B[Portainer Server]
    B -->|Pending jobs in poll responses| A
    A -.->|On-demand TLS tunnel :8000 (standard mode)| B
    A -->|Heartbeats / snapshots| B
```

The Edge Agent initiates outbound connections to the Portainer server. In standard mode it polls the Portainer API on port 9443 and opens a tunnel on port 8000 only when interactive access is needed. In async mode only the UI/API port is required. No inbound ports need to be opened on the edge network.

## Generate Edge Deployment Variables

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

EDGE_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')

# Create a standard Edge Agent environment and extract the Edge key
EDGE_KEY=$(curl -s -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=edge-site-01" \
  -F "EndpointCreationType=4" \
  -F "ContainerEngine=docker" \
  -F "URL=https://portainer.example.com:9443" \
  -F "EdgeTunnelServerAddress=portainer.example.com:8000" \
  -F "EdgeCheckinInterval=30" \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['EdgeKey'])")

# For Edge Agent Async in Portainer Business Edition, create the environment as
# async and configure the Ping, Snapshot, and Command intervals in Portainer.
```

## Standard Mode Installation

```bash
# Standard mode - agent polls frequently (real-time management)
docker run -d \
  --name portainer_edge_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_INSECURE_POLL=0 \
  portainer/agent:<matching-portainer-server-version>
```

## Async Mode Installation

```bash
# Async mode - Portainer Business Edition
# Configure Ping, Snapshot, and Command intervals on the environment in Portainer.
docker run -d \
  --name portainer_edge_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_ASYNC=1 \
  -e EDGE_INSECURE_POLL=0 \
  portainer/agent:<matching-portainer-server-version>
```

## ARM / Windows Variations

```bash
# ARM64 (Raspberry Pi 4, Apple M1)
docker pull portainer/agent:<matching-portainer-server-version>  # Docker selects the correct architecture
```

```powershell
# Windows (Docker Desktop or Docker Engine for Windows)
$Env:EDGE_ID = "<generated-edge-id>"
$Env:EDGE_KEY = "<generated-edge-key>"

docker run -d `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID=$Env:EDGE_ID `
  -e EDGE_KEY=$Env:EDGE_KEY `
  -e EDGE_INSECURE_POLL=0 `
  --name portainer_edge_agent `
  portainer/agent:<matching-portainer-server-version>
```

## Verify Edge Agent Connection

```bash
# Check agent is running
docker logs portainer_edge_agent 2>&1 | tail -20

# On Portainer server, check the edge environment heartbeat
curl -s https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
from datetime import datetime, timezone
envs = json.load(sys.stdin)
for e in envs:
    if e.get('EdgeKey'):
        ts = e.get('LastCheckInDate') or 0
        last = datetime.fromtimestamp(ts, timezone.utc).isoformat() if ts else 'never'
        print(f'Edge: {e[\"Name\"]}, Heartbeat: {\"Recent check-in\" if e.get(\"Heartbeat\") else \"No recent check-in\"}, Last check-in: {last}')
"
```

---

*Monitor edge device health and connectivity with [OneUptime](https://oneuptime.com).*
