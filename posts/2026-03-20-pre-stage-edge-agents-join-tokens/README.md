# How to Pre-Stage Edge Agents with Join Tokens - Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Join Token, Pre-Provisioning, Automation

Description: Pre-provision edge agent deployments with join tokens to automate the connection of new edge environments.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS Polls| B[Portainer API :9443]
    B -->|Pending Jobs / Config| A
    A -->|On-demand WSS Tunnel (Standard Mode)| C[Portainer Tunnel :8000]
    C -->|Interactive Commands| A
    A -->|Status / Snapshots| B
```

The Edge Agent polls the Portainer API over HTTPS (typically port 9443). In standard mode, it also opens an on-demand outbound tunnel to the Portainer tunnel server on port 8000, so no inbound ports need to be opened on the edge network.

## Create Edge Environment and Retrieve Join Token

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a Docker Edge environment and extract the join token details.
EDGE_ENV=$(curl -s -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=edge-site-01" \
  -F "EndpointCreationType=4" \
  -F "URL=https://portainer.example.com:9443" \
  -F "ContainerEngine=docker" \
  -F "EdgeCheckinInterval=30" \
  --insecure)

EDGE_KEY=$(printf '%s' "$EDGE_ENV" | python3 -c "
import sys, json
print(json.load(sys.stdin)['EdgeKey'])
")

EDGE_ID=$(printf '%s' "$EDGE_ENV" | python3 -c "
import sys, json, uuid
env = json.load(sys.stdin)
print(env.get('EdgeID') or str(uuid.uuid4()))
")
```

## Standard Mode Installation

```bash
# Standard mode - agent polls frequently and supports live tunnel sessions
# Replace 2.39.1 with the Portainer Server version you are running.
# Set EDGE_INSECURE_POLL=1 if Portainer uses a self-signed TLS certificate.
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
  portainer/agent:2.39.1
```

## Async Mode Installation

```bash
# Async mode - lower bandwidth usage, suitable for limited connectivity
# Async mode is available in Portainer Business Edition only.
# Replace 2.39.1 with the Portainer Server version you are running.
# Set EDGE_INSECURE_POLL=1 if Portainer uses a self-signed TLS certificate.
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
  portainer/agent:2.39.1
```

## ARM / Windows Variations

```bash
# ARM64 (Raspberry Pi 4, Apple M1)
docker pull portainer/agent:2.39.1  # Multi-arch: match your Portainer Server version
```

```powershell
# Windows (PowerShell)
$EDGE_ID="your-edge-id"
$EDGE_KEY="your-edge-key"

$EDGE_INSECURE_POLL="0"  # Set to 1 if Portainer uses a self-signed TLS certificate

docker run -d `
  --name portainer_edge_agent `
  --restart=always `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  -e EDGE=1 `
  -e EDGE_ID="$EDGE_ID" `
  -e EDGE_KEY="$EDGE_KEY" `
  -e EDGE_INSECURE_POLL="$EDGE_INSECURE_POLL" `
  portainer/agent:2.39.1
```

## Verify Edge Agent Connection

```bash
# Check agent is running
docker logs portainer_edge_agent 2>&1 | tail -20

# On Portainer server, check if environment shows as connected
curl -s https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    if e.get('EdgeKey'):
        print(f'Edge: {e[\"Name\"]}, Status: {\"Online\" if e.get(\"Heartbeat\") else \"Offline\"}')
"
```

---

*Monitor edge device health and connectivity with [OneUptime](https://oneuptime.com).*
