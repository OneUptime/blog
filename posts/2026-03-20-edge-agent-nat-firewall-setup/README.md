# How to Set Up Edge Agent Behind a NAT or Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, NAT, Firewall, Networking

Description: Configure Edge Agents to work through NAT and firewalls by using the Portainer tunnel server for outbound connections.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS polling :9443| B[Portainer Server]
    A -->|TLS tunnel :8000 (standard mode)| B
```

In standard mode, the Edge Agent polls Portainer over the API port (usually 9443) and opens an outbound TLS tunnel to port 8000 only when interactive management is required. In async mode, the agent uses only the API port, so no inbound ports need to be opened on the edge network.

## Create Edge Environment and Capture Deployment Values

```bash
# Use --insecure only if Portainer uses a self-signed certificate.
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a Docker Edge environment and capture EDGE_KEY / EDGE_ID values.
EDGE_JSON=$(curl -s -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=edge-site-01" \
  --form "EndpointCreationType=4" \
  --form "URL=https://portainer.example.com:9443" \
  --form "ContainerEngine=docker" \
  --form "EdgeCheckinInterval=30" \
  --insecure)

EDGE_KEY=$(printf '%s' "$EDGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['EdgeKey'])")
EDGE_ID=$(printf '%s' "$EDGE_JSON" | python3 -c "import sys,json,uuid; data=json.load(sys.stdin); print(data.get('EdgeID') or uuid.uuid4())")
```

## Standard Mode Installation

```bash
# Standard mode - agent polls frequently and opens the tunnel on demand
# Match the image tag to your Portainer Server version. Set EDGE_INSECURE_POLL=1 for self-signed certs.
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
  portainer/agent:lts
```

## Async Mode Installation

```bash
# Async mode (Portainer Business Edition) - lower bandwidth, no interactive tunnel
# Match the image tag to your Portainer Server version. Set EDGE_INSECURE_POLL=1 for self-signed certs.
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
  -e EDGE_ASYNC=1 \
  portainer/agent:lts
```

## ARM / Windows Variations

```powershell
# ARM64
docker pull portainer/agent:lts

# Windows (Docker Desktop or Docker Engine for Windows)
docker run -d `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  --restart=always `
  -e EDGE=1 `
  -e EDGE_ID=$Env:EDGE_ID `
  -e EDGE_KEY=$Env:EDGE_KEY `
  -e EDGE_INSECURE_POLL=0 `
  --name portainer_edge_agent `
  portainer/agent:lts
```

## Verify Edge Agent Connection

```bash
# Check agent is running
docker logs portainer_edge_agent 2>&1 | tail -20

# On Portainer server, check if environment shows as connected
# Use --insecure only if Portainer uses a self-signed certificate.
curl -s https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    if e.get('EdgeID'):
        print(f'Edge: {e[\"Name\"]}, Status: {\"Online\" if e.get(\"Status\")==1 else \"Offline\"}')
"
```

---

*Monitor edge device health and connectivity with [OneUptime](https://oneuptime.com).*
