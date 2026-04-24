# How to Fix Portainer Memory Issues on Low-Resource Hosts - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Performance, Self-Hosted, Low-Resource

Description: Optimize Portainer's memory usage on VPS instances or edge devices with limited RAM using resource limits, snapshot tuning, and agent deployment strategies.

## Introduction

Portainer runs well on most modern servers, but on low-resource hosts (1-2 GB RAM VPS, Raspberry Pi, edge devices), it can consume significant memory - especially when managing many containers or large Docker environments. This guide covers techniques to reduce Portainer's footprint.

## Understanding Portainer's Memory Usage

Portainer uses memory for:
- The web server and API
- Docker environment snapshots
- WebSocket connections for live stats
- The embedded BoltDB database
- Kubernetes cluster caches (if applicable)

## Step 1: Check Current Memory Usage

```bash
# Check Portainer's current memory consumption

docker stats portainer --no-stream

# Output example:
# NAME       CPU %  MEM USAGE / LIMIT  MEM %
# portainer  0.2%   245MB / 1GB        24.5%

# Monitor over time
docker stats portainer
```

## Step 2: Set Memory Limits on Portainer Container

Prevent Portainer from consuming all available RAM:

```bash
# Recreate with memory limit (adjust based on your available RAM)
docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  --memory="256m" \
  --memory-swap="512m" \
  --memory-reservation="128m" \
  --cpus="0.5" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

Or in Docker Compose:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    restart: unless-stopped
    mem_limit: 256m
    memswap_limit: 512m
    mem_reservation: 128m
    cpus: 0.5
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Step 3: Increase the Snapshot Interval

By default, Portainer takes environment snapshots every 5 minutes. Increasing the interval can lower background overhead on smaller hosts:

```bash
# Start Portainer with a longer snapshot interval
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --snapshot-interval=10m   # Snapshot every 10 minutes instead of the 5 minute default
```

## Step 4: Run Only the Portainer Agent on the Low-Resource Host

If a low-resource host is managed from another Portainer instance, run only the Agent on it instead of the full Portainer Server. For most new remote deployments, Portainer recommends the Edge Agent, but the standard Agent still works when port 9001 is reachable from the server:

```bash
# On the low-resource host, run ONLY the agent (very lightweight)
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  --memory="64m" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts

# Run the full Portainer server on a more powerful host
# and connect to this agent remotely
```

The Portainer Agent is stateless, with data shipped back to the Portainer Server, so it has a smaller footprint than running the full server on the same host.

## Step 5: Reduce the Number of Managed Environments

Each environment Portainer actively monitors consumes memory for snapshots:

1. In Portainer UI, go to **Environments**
2. Remove environments you're not actively using

## Step 6: Enable Swap on Low-RAM Hosts

If you can't reduce Portainer's memory usage further, ensure swap is available:

```bash
# Check current swap
free -h

# Create a swap file if none exists
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Reduce swappiness for SSD/flash storage (0-10 recommended)
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 7: Run Portainer on Raspberry Pi / ARM

For ARM-based devices like Raspberry Pi:

```bash
# Portainer provides multi-arch images for ARM64, with ARMv7 also available.
# ARMv6 and below are not supported.
docker pull portainer/portainer-ce:lts

# Run with strict memory limits appropriate for Pi
docker run -d \
  -p 9443:9443 \
  -p 9000:9000 \
  --name portainer \
  --restart=unless-stopped \
  --memory="192m" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --snapshot-interval=10m
```

## Step 8: Monitor with cAdvisor

To track memory usage trends and identify spikes:

```bash
# Deploy cAdvisor for container metrics
VERSION=v0.56.2

docker run -d \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --volume=/dev/disk/:/dev/disk:ro \
  --publish=8080:8080 \
  --name=cadvisor \
  --privileged \
  --device=/dev/kmsg \
  ghcr.io/google/cadvisor:${VERSION}
```

## Step 9: Tune the BoltDB Database

On long-running installations, the BoltDB database can grow large:

```bash
# Compact the database during the next Portainer startup
docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --compact-db
```

## Conclusion

Portainer's memory usage on low-resource hosts is manageable with a combination of container memory limits, increased snapshot intervals, and using an Agent on resource-constrained nodes. For the most minimal footprint, run just a Portainer Agent or Edge Agent on the low-resource device and connect it to a central Portainer Server on a more powerful machine.
