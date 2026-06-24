# How to Use the --edge-compute Flag to Enable Edge Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, CLI, Configuration

Description: Enable Portainer's Edge Computing features using the --edge-compute flag, allowing management of remote and air-gapped Docker environments via reverse tunnel connections.

## Introduction

Portainer's Edge Computing capabilities allow you to manage Docker environments that are not directly reachable from the Portainer server - remote locations, air-gapped networks, and IoT devices. The `--edge-compute` flag enables these features when starting the Portainer server.

## What --edge-compute Enables

When `--edge-compute` is set:
- Standard Edge Agent tunnels can connect on port 8000 when that port is published
- Edge environment management UI becomes available
- Edge groups and edge stacks are unlocked
- Remote job scheduling for edge devices is enabled
- In Portainer Business Edition, Edge Agent Async mode is also available

## Step 1: Enable Edge Compute in Portainer

```bash
# Start Portainer with Edge Compute enabled

docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --edge-compute

# Access: https://your-host:9443
# Edge Compute section now visible in the sidebar
```

## Step 2: Verify Edge Compute Is Enabled

```bash
# Check Portainer logs for edge compute initialization
docker logs portainer 2>&1 | grep -i "edge\|tunnel" | head -10

# Verify port 8000 is listening
ss -tlnp | grep 8000

# Via API (using -k because Portainer uses a self-signed cert by default on 9443)
TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

curl -sk -H "Authorization: Bearer $TOKEN" \
  https://localhost:9443/api/settings | jq '.EdgeAgentCheckinInterval'
```

## Step 3: Create an Edge Environment

1. In Portainer, go to **Environments** → **Add Environment**
2. Select **Docker Standalone** or **Docker Swarm**
3. Choose **Edge Agent Standard**
4. Name the environment (e.g., "remote-site-1")
5. Configure:
   - **Portainer API server URL**: `https://portainer.yourdomain.com`
   - If you're using Portainer BE, **Portainer tunnel server address**: `portainer.yourdomain.com:8000`
6. Portainer generates a deployment command

## Step 4: Deploy Edge Agent on Remote Device

For a Docker Standalone edge environment, copy the generated command to the remote device:

```bash
# If Portainer uses a self-signed certificate, also add:
#   -e EDGE_INSECURE_POLL=1 \

# Generated command looks like:
docker run -d \
  --name portainer-edge-agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=<generated-uuid> \
  -e EDGE_KEY=<generated-key> \
  portainer/agent:sts
```

## Step 5: Configure Edge Agent Check-in Interval

```bash
# The edge agent polls the server periodically
# Configure check-in interval via Portainer settings

# Via API (set to 30 seconds for example)
curl -sk -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://localhost:9443/api/settings \
  -d '{"EdgeAgentCheckinInterval": 30}'

# Via UI: Settings → Edge Compute → Edge agent default poll frequency
```

## Step 6: Create Edge Groups

Edge groups allow you to manage multiple edge devices together:

1. In Portainer, go to **Edge Compute** → **Edge Groups**
2. Click **Add Edge Group**
3. Choose **Static** (manual assignment) or **Dynamic** (tag-based)
4. For static: add environments manually
5. For dynamic: configure tags that match environments

```bash
# Create an edge group via API
curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://localhost:9443/api/edge_groups \
  -d '{
    "Name": "production-sites",
    "Dynamic": false,
    "Endpoints": [2, 3, 4]
  }'
```

## Step 7: Deploy an Edge Stack

Edge stacks deploy compose files to multiple edge environments:

1. Go to **Edge Compute** → **Edge Stacks**
2. Click **Add Edge Stack**
3. Select the Edge Groups to deploy to
4. Provide the compose file:

```yaml
# Example edge stack
version: "3.8"
services:
  data-collector:
    image: mycompany/data-collector:v1.2
    restart: unless-stopped
    environment:
      - COLLECTION_INTERVAL=60s
      - UPLOAD_ENDPOINT=https://api.mycompany.com
    volumes:
      - collector_data:/data

volumes:
  collector_data:
```

## Step 8: Configure Edge Async Mode

For environments with poor connectivity:

```bash
# Edge Agent Async is a separate deployment mode, not a toggle on a standard Edge environment
# Go to: Environments → Add Environment
# Select: Docker Standalone or Docker Swarm → Edge Agent Async
# Note: Edge Agent Async is available in Portainer Business Edition

# In async mode:
# - No live tunnel is established
# - Portainer works from environment snapshots
# - The agent checks in for ping, snapshot, and command updates
# - Only the UI/API port (usually 9443) is required; port 8000 is not used
```

## Step 9: Run Remote Jobs on Edge Devices

```bash
# Schedule a script to run on edge devices
# Via UI: Edge Compute → Edge Jobs → Add Edge Job
# Note: Edge Jobs currently support Docker Standalone edge environments that use /etc/cron.d

# Via API
curl -sk -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://localhost:9443/api/edge_jobs/create/string \
  -d '{
    "Name": "health-check",
    "CronExpression": "0 */6 * * *",
    "Recurring": true,
    "Endpoints": [2, 3],
    "FileContent": "#!/bin/bash\ndocker ps\ndf -h"
  }'
```

## Step 10: Docker Compose for Edge-Enabled Portainer

```yaml
version: "3.8"
services:
  portainer:
    image: portainer/portainer-ce:sts
    container_name: portainer
    restart: unless-stopped
    command: >
      --edge-compute
      --tunnel-addr=0.0.0.0
      --tunnel-port=8000
    ports:
      - "9443:9443"
      - "8000:8000"   # Required for standard Edge Agent tunnels
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Conclusion

The `--edge-compute` flag unlocks Portainer's ability to manage remote and distributed Docker environments through outbound Edge Agent connections. For standard Edge Agent deployments, pair it with `-p 8000:8000` to expose the tunnel port, and ensure port 8000 is reachable from your edge devices. If you're using Edge Agent Async mode in Portainer Business Edition, the tunnel port is not required. Edge compute transforms Portainer from a local container manager into a centralized management platform for distributed infrastructure.
