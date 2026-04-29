# How to Deploy Applications to Low-Bandwidth Edge Sites with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Computing, Low Bandwidth, IoT, Docker

Description: Optimize Portainer edge deployments for sites with limited or unreliable network connectivity.

## Introduction

How to Deploy Applications to Low-Bandwidth Edge Sites with Portainer covers a specialized deployment scenario where Portainer provides centralized container management for distributed infrastructure. This guide walks through the architecture, deployment steps, and best practices.

## Prerequisites

- Portainer Business Edition with Edge Computing features
- Docker installed on edge devices
- Central Portainer server accessible from edge locations
- Appropriate hardware for your edge use case

## Architecture Overview

For low-bandwidth sites, Portainer Edge Agent Async mode uses outbound polling over the Portainer API:

```text
Central Portainer (Cloud/DC)
        |
 HTTPS Polling (Port 9443)
        |
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
  }
}
EOF
systemctl restart docker
```

## Step 2: Register Edge Devices in Portainer

1. Go to **Environments** > **Add Environment**
2. Select **Docker Standalone**, click **Start Wizard**, then choose **Edge Agent Async**
3. Configure environment settings:
   - Name: descriptive device name
   - Portainer API server URL: the Portainer server URL reachable from the edge site
   - Edge Group: appropriate group
   - Tags: location, type, function

4. Copy the generated edge ID and edge key

5. Run on the device:

```bash
# Deploy Portainer Edge Agent Async
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
  portainer/agent:your-portainer-server-version
```

If your Portainer server uses a self-signed certificate, add `-e EDGE_INSECURE_POLL=1` to the command, and replace `your-portainer-server-version` with the exact version of your Portainer Server.

## Step 3: Create Application Stack

Deploy your application via Portainer Edge Stacks:

```yaml
# docker-compose.yml
services:
  app:
    image: your-app:latest
    restart: always
    environment:
      - DEVICE_ID=${PORTAINER_EDGE_ID}
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
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro,rslave
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'

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
- **Resource Usage**: CPU/memory utilization per device
- **Edge Jobs**: Schedule scripts or diagnostic tasks across the fleet

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
3. Portainer applies the update to devices in the target group as they check in
4. Monitor rollout progress from the central dashboard

## Security Considerations

- Use valid TLS certificates on the Portainer server
- Use separate credentials per edge device
- Implement network segmentation
- Regular certificate rotation
- Audit log monitoring via Portainer

## Conclusion

Portainer's async edge computing capabilities make it an ideal solution for managing distributed containerized applications at scale. The Edge Agent's outbound-only polling model eliminates the need for inbound firewall rules, making deployment feasible even in highly restricted network environments. Central visibility and control over hundreds or thousands of edge nodes from a single Portainer instance dramatically reduces operational overhead.
