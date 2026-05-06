# How to Configure Async Edge Agent Ping and Snapshot Frequency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Async, Snapshot, Configuration

Description: Configure the ping interval and snapshot frequency for async Edge Agents to optimize for low-bandwidth remote environments.

---

Portainer Edge Agents enable management of remote environments that are behind NAT, firewalls, or have limited connectivity. The Edge Agent establishes an outbound connection to the Portainer server, eliminating the need for inbound firewall rules.

Async Edge Agent mode is available in Portainer Business Edition.

## How Edge Agent Works

```mermaid
flowchart LR
    A[Edge Device] -->|HTTPS Poll / Async Updates :9443| B[Portainer Server]
    A -->|On-demand Tunnel :8000 (Standard Mode)| B
    B -->|Jobs / Commands| A
```

The Edge Agent initiates outbound connections to the Portainer API. In standard mode, Portainer also requires port 8000 for the on-demand reverse tunnel. In async mode, only the API port (typically 9443) is required, so no inbound ports need to be opened on the edge network.

## Create Async Edge Environment via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create an async edge environment and capture the Edge ID / Edge Key from the response

curl -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form-string "Name=edge-site-01" \
  --form "EndpointCreationType=4" \
  --form-string "URL=https://portainer.example.com:9443" \
  --form "EdgeAsyncMode=true" \
  --insecure
```

Portainer's API can create the async Edge environment, but the async ping, snapshot, and command intervals are configured in the environment's **More settings** or from the **Edge Compute** defaults in Portainer. The default for each interval is once a minute.

## Standard Mode Installation

```bash
# Standard mode - Portainer controls the poll frequency (real-time management)
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
  portainer/agent:<matching-portainer-version>
```

## Async Mode Installation

```bash
# Async mode - suitable for limited bandwidth
# Configure ping, snapshot, and command intervals in Portainer.
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
  portainer/agent:<matching-portainer-version>
```

## ARM / Windows Variations

```bash
# ARM64 (Raspberry Pi 4, Apple M1)
docker pull portainer/agent:<matching-portainer-version>  # Multi-arch image; match the agent tag to your Portainer Server version

# Windows uses the Docker named pipe instead of the Linux socket mounts.
# Add -e EDGE_ASYNC=1 for async mode.
docker run -d \
  --name portainer_edge_agent \
  --restart=always \
  -v //./pipe/docker_engine://./pipe/docker_engine \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  portainer/agent:<matching-portainer-version>
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
