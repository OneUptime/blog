# How to Set Up Automatic Edge Environment Onboarding in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge, Onboarding, Automation, Business Edition

Description: Configure automatic onboarding of new edge environments in Portainer BE to streamline deployment of new remote sites.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS poll :9443| B[Portainer Server]
    A -->|TLS tunnel :8000 (standard mode)| B
    B -->|On-demand management via tunnel| A
    A -->|Status / snapshots| B
```

The Edge Agent polls the Portainer API over the UI port (typically 9443). In standard mode it also opens an outbound TLS tunnel to port 8000 when interactive management is required. Async mode does not use the tunnel port, so no inbound ports need to be opened on the edge network.

## Create Edge Environment and Retrieve Edge Credentials

Portainer BE can generate the deployment command for you from **Environment-related** -> **Auto onboarding**. If you want to pre-stage an Edge environment through the API, the response includes the `EdgeID` and `EdgeKey` used by the deployment commands below.

```bash
# Add --insecure to the curl commands only if your Portainer server uses a self-signed certificate.
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a Docker Edge environment and print the credentials used by the deployment commands below
curl -s -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=edge-site-01" \
  -F "EndpointCreationType=4" \
  -F "ContainerEngine=docker" \
  -F "URL=https://portainer.example.com:9443" \
  -F "EdgeCheckinInterval=30" | python3 -c "
import sys, json
endpoint = json.load(sys.stdin)
print(f'EDGE_ID={endpoint[\"EdgeID\"]}')
print(f'EDGE_KEY={endpoint[\"EdgeKey\"]}')
"
```

## Standard Mode Installation

```bash
# Standard mode - on-demand tunnel for interactive management
# Use the same Portainer Agent version as your Portainer Server
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
  portainer/agent:2.39.2
```

## Async Mode Installation

```bash
# Async mode - snapshot-based management, suitable for limited bandwidth
# Configure Ping, Snapshot, and Command intervals when you create the Edge Agent Async environment in Portainer
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
  portainer/agent:2.39.2
```

## ARM / Windows Variations

```bash
# ARM64 (Raspberry Pi 4, Apple Silicon)
docker pull portainer/agent:2.39.2  # Multi-arch image: Docker selects the correct architecture

# Windows PowerShell (Docker Standalone)
docker run -d `
  --name portainer_edge_agent `
  --mount type=npipe,src=\\.\pipe\docker_engine,dst=\\.\pipe\docker_engine `
  --mount type=bind,src=C:\ProgramData\docker\volumes,dst=C:\ProgramData\docker\volumes `
  --mount type=volume,src=portainer_agent_data,dst=C:\data `
  --restart always `
  -e EDGE=1 `
  -e EDGE_ID="<edge-id>" `
  -e EDGE_KEY="<edge-key>" `
  -e EDGE_INSECURE_POLL=0 `
  portainer/agent:2.39.2
```

## Verify Edge Agent Connection

```bash
# Check agent is running
docker logs portainer_edge_agent 2>&1 | tail -20

# On Portainer server, confirm the Edge environment is checking in
curl -s https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys, json, datetime
envs = json.load(sys.stdin)
for e in envs:
    if e.get('Name') == 'edge-site-01':
        last = e.get('LastCheckInDate')
        last = datetime.datetime.fromtimestamp(last, datetime.timezone.utc).isoformat() if last else 'never'
        print(f'Edge: {e[\"Name\"]}, Heartbeat: {e.get(\"Heartbeat\")}, Last check-in: {last}')
"
```

---

*Monitor edge device health and connectivity with [OneUptime](https://oneuptime.com).*
