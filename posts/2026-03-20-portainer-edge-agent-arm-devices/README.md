# How to Run Portainer Edge Agent on ARM Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, ARM, Raspberry Pi, IoT, Edge Computing

Description: Deploy the Portainer Edge Agent on ARM-based devices such as Raspberry Pi and other SBCs to bring IoT and edge hardware under centralized Portainer management.

## Introduction

ARM devices - Raspberry Pi, Jetson Nano, Orange Pi, and similar single-board computers - are widely used for IoT, edge computing, and lightweight workloads. Portainer's Edge Agent supports ARM32 (armv7) and ARM64 (aarch64) architectures, allowing these devices to be managed centrally from a Portainer Business Edition server. This guide covers deploying the Edge Agent on ARM hardware with best practices for low-resource and intermittently connected environments.

## Supported Architectures

| Architecture | Example Devices | Docker Image Tag |
|---|---|---|
| ARM 32-bit (armv7) | Raspberry Pi 2/3 (32-bit OS) | `portainer/agent:<matching-server-version>` |
| ARM 64-bit (aarch64) | Raspberry Pi 4/5 (64-bit OS), Jetson Nano | `portainer/agent:<matching-server-version>` |

Portainer's official images are multi-arch manifests - the correct variant is pulled automatically based on the host architecture. Match the agent version to your Portainer Server version instead of using `latest`.

## Prerequisites

- ARM device running Raspberry Pi OS, Ubuntu ARM, or similar Linux distribution
- Docker installed on the ARM device
- Portainer Business Edition server accessible from the device
- Network access from the ARM device to the Portainer server (outbound on port 9443, and on port 8000 as well when using standard Edge Agent mode)

## Step 1: Install Docker on the ARM Device

```bash
# On Raspberry Pi OS or Debian/Ubuntu ARM

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add the current user to the docker group
sudo usermod -aG docker $USER
# Log out and back in for group membership to apply

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Verify
sudo docker info | grep -E "Architecture|Server Version"
```

## Step 2: Create an Edge Environment in Portainer

In the Portainer UI:

1. Go to **Environments** → **Add environment**
2. Select **Docker Standalone**, click **Start Wizard**, then choose **Edge Agent Standard**
3. Set the name (e.g., `rpi-sensor-node-01`)
4. Enter the Portainer server URL: `https://portainer.example.com`
5. Click **Create**
6. Copy the **Edge ID** and **Edge Key**

## Step 3: Deploy the Edge Agent

```bash
# Set variables
EDGE_ID="your-edge-id-here"
EDGE_KEY="your-edge-key-here"
PORTAINER_AGENT_TAG="your-portainer-server-version"
EDGE_INSECURE_POLL="0"      # Set to 1 only if Portainer uses a self-signed certificate

# Pull the multi-arch image (ARM variant downloaded automatically)
docker pull portainer/agent:${PORTAINER_AGENT_TAG}

# Run the Edge Agent
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_INSECURE_POLL="${EDGE_INSECURE_POLL}" \
  --name portainer_edge_agent \
  --restart always \
  portainer/agent:${PORTAINER_AGENT_TAG}
```

## Step 4: Configure for Low-Resource Environments

ARM devices often have limited RAM (512MB–4GB). Limit the container resources, and if you are using standard mode increase the poll frequency in Portainer when creating the environment or under **Settings** → **Edge Compute**:

```bash
# Recreate the container with resource limits
docker rm -f portainer_edge_agent 2>/dev/null || true

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_INSECURE_POLL="${EDGE_INSECURE_POLL}" \
  --name portainer_edge_agent \
  --restart always \
  --memory="128m" \
  --cpus="0.5" \
  portainer/agent:${PORTAINER_AGENT_TAG}
```

In standard mode, the default poll frequency is 5 seconds. Increasing it to 30 seconds in Portainer reduces how often the agent checks in.

## Step 5: Async Mode for Unreliable Connectivity

IoT and edge devices often have intermittent connectivity (cellular, LoRa backhaul, or WiFi dropouts). Enable async mode:

```bash
# Recreate the container in async mode
docker rm -f portainer_edge_agent 2>/dev/null || true

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ASYNC=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_INSECURE_POLL="${EDGE_INSECURE_POLL}" \
  --name portainer_edge_agent \
  --restart always \
  portainer/agent:${PORTAINER_AGENT_TAG}
```

In async mode, the agent polls on a schedule rather than maintaining a persistent tunnel. Portainer queues commands and the device picks them up on its next poll cycle. Configure the ping, command, and snapshot intervals in Portainer when creating the environment or under **Settings** → **Edge Compute**; the default for each is once a minute.

## Step 6: Docker Compose Deployment

Create `/opt/portainer/docker-compose.yml`:

```yaml
version: "3.8"

services:
  portainer_edge_agent:
    image: portainer/agent:${PORTAINER_AGENT_TAG}
    container_name: portainer_edge_agent
    restart: always
    environment:
      EDGE: "1"
      EDGE_ID: "${EDGE_ID}"
      EDGE_KEY: "${EDGE_KEY}"
      EDGE_ASYNC: "1"
      EDGE_INSECURE_POLL: "${EDGE_INSECURE_POLL}"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
      - portainer_agent_data:/data
    mem_limit: 128m
    cpus: 0.5

volumes:
  portainer_agent_data:
```

Create `/opt/portainer/.env`:

```text
EDGE_ID=your-edge-id-here
EDGE_KEY=your-edge-key-here
PORTAINER_AGENT_TAG=your-portainer-server-version
EDGE_INSECURE_POLL=0
```

```bash
cd /opt/portainer
docker compose up -d
```

## Step 7: Auto-Start on Boot with systemd

Ensure Docker and the Edge Agent start automatically after a power cycle:

```bash
# Enable Docker on boot
sudo systemctl enable docker

# Create a systemd service for Docker Compose
sudo tee /etc/systemd/system/portainer-edge.service << 'EOF'
[Unit]
Description=Portainer Edge Agent
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/portainer
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable portainer-edge
sudo systemctl start portainer-edge
```

## Step 8: Bulk Provisioning Multiple ARM Devices

For deploying the same Edge Agent configuration to a fleet of ARM devices, use the Portainer auto-onboarding page to generate a shared Edge key and deployment script:

```bash
#!/bin/bash
# provision-arm-device.sh
# Run this script on each ARM device during initial setup
# Generate EDGE_KEY from Portainer under Environments -> Auto onboarding

PORTAINER_AGENT_TAG="your-portainer-server-version"
EDGE_INSECURE_POLL="0"      # Set to 1 only if Portainer uses a self-signed certificate
EDGE_KEY="shared-auto-onboarding-edge-key"

# Generate a unique EDGE_ID per device
EDGE_ID="arm-${HOSTNAME}-$(cat /etc/machine-id)"

docker rm -f portainer_edge_agent 2>/dev/null || true

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  -e EDGE_ASYNC=1 \
  -e EDGE_INSECURE_POLL="${EDGE_INSECURE_POLL}" \
  --name portainer_edge_agent \
  --restart always \
  portainer/agent:${PORTAINER_AGENT_TAG}

echo "Edge Agent deployed with ID: ${EDGE_ID}"
```

If the Waiting Room feature is enabled, newly connected devices appear in the **Waiting Room** until an administrator associates them.

## Monitoring ARM Device Health

After connecting ARM devices, use Portainer's environment health overview to monitor across your fleet. Combine with a dedicated monitoring tool to track CPU temperature, memory pressure, and disk space on the ARM devices themselves.

## Troubleshooting

**Wrong architecture image pulled:**
```bash
# Verify the running image architecture
IMAGE_ID=$(docker inspect --format '{{.Image}}' portainer_edge_agent)
docker image inspect "$IMAGE_ID" --format '{{.Architecture}}'
# Should show "arm" or "arm64"
```

**Agent fails to start on Raspberry Pi OS Lite (32-bit):**
- Ensure the kernel has cgroups v1 or v2 enabled
- If `docker info` reports missing memory or swap limit support, enable the required cgroup controllers according to your distribution's Docker documentation and reboot

**High SD card write rate:**
- For standard mode, increase the poll frequency in Portainer under **Settings** → **Edge Compute**
- For async mode, increase the snapshot and command intervals in Portainer to reduce background activity
- Mount Docker volumes on an external USB SSD rather than the microSD card

**Cannot reach Portainer server:**
```bash
# Test connectivity
curl -sk https://portainer.example.com/api/status
# Standard mode also requires tunnel connectivity on port 8000
nc -zv portainer.example.com 8000
```

## Conclusion

The Portainer Edge Agent's multi-architecture support makes it a natural fit for ARM-based edge deployments. Whether managing a handful of Raspberry Pi nodes or a fleet of hundreds of IoT devices spread across multiple sites, the Edge Agent's outbound-only communication model and async polling mode handle unreliable connectivity gracefully. Combine auto-onboarding with edge groups and dynamic tags to build a scalable zero-touch provisioning pipeline for ARM device fleets.
