# How to Configure Edge Agent with Self-Signed Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, SSL, TLS, Self-Signed

Description: Configure edge agents to trust self-signed Portainer server certificates in environments without a public CA.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS polling :9443| B[Portainer Server]
    A -->|TLS tunnel :8000 (standard mode)| B
```

The Edge Agent initiates all connections outbound. In standard mode it polls the Portainer API over HTTPS on port 9443 and opens an on-demand TLS tunnel to port 8000 for interactive management. In async mode it uses only the Portainer API/UI port, so no inbound ports need to be opened on the edge network.

## Generate Edge Deployment Script

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a standard Edge environment and capture the returned Edge key / ID
EDGE_RESPONSE=$(curl -s -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=edge-site-01" \
  --form "EndpointCreationType=4" \
  --form "ContainerEngine=docker" \
  --form "URL=https://portainer.example.com:9443" \
  --form "EdgeTunnelServerAddress=portainer.example.com:8000" \
  --form "EdgeCheckinInterval=30" \
  --insecure)

EDGE_KEY=$(printf '%s' "$EDGE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['EdgeKey'])")
EDGE_ID=$(printf '%s' "$EDGE_RESPONSE" | python3 -c "import sys,json,uuid; data=json.load(sys.stdin); print(data.get('EdgeID') or str(uuid.uuid4()))")
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
  -e EDGE_INSECURE_POLL=1 \
  portainer/agent:lts
```

## Async Mode Installation

Create the environment as an Async Edge Agent in Portainer Business Edition, then use the returned `EDGE_ID` and `EDGE_KEY` in the command below.

```bash
# Async mode (Portainer Business Edition only) - less frequent polling, suitable for limited bandwidth
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
  -e EDGE_INSECURE_POLL=1 \
  portainer/agent:lts
```

## ARM / Windows Variations

```bash
# ARM64 (Raspberry Pi 4, Apple M1)
docker pull portainer/agent:lts  # Multi-arch image: Docker automatically pulls the ARM64 variant

# Windows (Docker Desktop or Docker Engine for Windows, PowerShell)
docker run -d `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID="${EDGE_ID}" `
  -e EDGE_KEY="${EDGE_KEY}" `
  -e EDGE_INSECURE_POLL=1 `
  --name portainer_edge_agent `
  portainer/agent:lts
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
    if e.get('EdgeID'):
        print(f'Edge: {e[\"Name\"]}, Status: {\"Online\" if e.get(\"Status\")==1 else \"Offline\"}')
"
```

---

*Monitor edge device health and connectivity with [OneUptime](https://oneuptime.com).*
