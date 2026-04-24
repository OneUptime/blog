# How to Set Up Portainer for Telecommunications Edge Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Telecommunications, Edge Computing, Docker, 5G

Description: Deploy and manage containerized network functions and applications at telecom edge sites using Portainer.

## Introduction

How to Set Up Portainer for Telecommunications Edge Infrastructure covers a specialized deployment scenario where Portainer provides centralized container management for distributed infrastructure. This guide walks through the architecture, deployment steps, and best practices.

## Prerequisites

- Portainer Business Edition with Edge Computing features
- Docker installed on edge devices
- Central Portainer server accessible from edge locations on ports 9443 and 8000
- Appropriate hardware for your edge use case

## Architecture Overview

The deployment follows a hub-and-spoke model where edge agents poll the Portainer API over port 9443 and establish an on-demand TLS tunnel over port 8000:

```text
Central Portainer (Cloud/DC)
      /     \
9443 API   8000 TLS Tunnel
 Polling     (On Demand)
    |             |
  +-----+------+-------+
  |     |      |       |
Edge1 Edge2  Edge3  Edge4
```

## Step 1: Prepare Edge Devices

Install Docker on each edge device:

```bash
#!/bin/bash
# Bootstrap script for edge devices

curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Configure Docker for edge constraints
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "2"
  },
  "storage-driver": "overlay2"
}
EOF
systemctl restart docker
```

## Step 2: Register Edge Devices in Portainer

1. Go to **Environments** > **Add Environment**
2. Select **Docker Standalone**
3. Click **Start Wizard**, then select **Edge Agent Standard**
4. Configure environment settings:
   - Name: descriptive device name
   - Edge Group: appropriate group
   - Tags: location, type, function

5. Copy the generated Edge ID and Edge key

6. Run on the device:

```bash
# Deploy Portainer Edge Agent
# Add -e EDGE_INSECURE_POLL=1 only if your Portainer server uses a self-signed certificate.
docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="YOUR_EDGE_ID" \
  -e EDGE_KEY="YOUR_EDGE_KEY" \
  portainer/agent:<matching-portainer-version>
```

## Step 3: Create Application Stack

Deploy your application via Portainer Edge Stacks:

```yaml
# compose.yaml

services:
  app:
    image: your-app:latest
    restart: always
    environment:
      - ENV=production
    volumes:
      - app-data:/data
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "2"

  # Local monitoring agent
  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    restart: always
    network_mode: host
    pid: host
    volumes:
      - /:/host:ro,rslave
    command:
      - '--path.rootfs=/host'

volumes:
  app-data:
  cache-data:
```

## Step 4: Configure Edge Groups

Organize devices into logical groups for targeted deployments:

1. Go to **Edge Groups** in Portainer
2. Create groups by location, function, or environment
3. Assign devices to groups based on tags
4. Target Edge Stacks to specific groups

## Step 5: Monitor Edge Fleet Health

Use Portainer's edge monitoring features:

- **Last Check-in**: When did each device last contact Portainer?
- **Container Status**: Are all containers running?
- **Host Details and Container Stats**: Review CPU/memory information and per-container statistics on each device
- **Edge Jobs**: Run diagnostic commands across the fleet

## Step 6: Handle Offline Devices

Configure offline behavior for resilient edge operations:

```yaml
# Add to application services for local resilience
  offline-cache:
    image: redis:alpine
    restart: always
    volumes:
      - cache-data:/data
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
```

## Updating Edge Applications

Rolling updates via Portainer Edge Stacks:

1. Update the image tag in your Edge Stack
2. Click **Update Stack**
3. Portainer distributes the update to all devices in the target group
4. Monitor rollout progress from the central dashboard

## Security Considerations

- Enable TLS on the edge tunnel
- Use separate credentials per edge device
- Implement network segmentation
- Regular certificate rotation
- Audit log monitoring via Portainer

## Conclusion

Portainer's edge computing capabilities make it an ideal solution for managing distributed containerized applications at scale. The Edge Agent's outbound-only connection model eliminates the need for inbound firewall rules, making deployment feasible even in highly restricted network environments. Central visibility and control over hundreds or thousands of edge nodes from a single Portainer instance dramatically reduces operational overhead.
