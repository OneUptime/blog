# How to Optimize Portainer Performance on ARM Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ARM, Raspberry Pi, Performance, Container Management

Description: Learn how to optimize Portainer performance on ARM-based devices like Raspberry Pi, including memory tuning, storage optimization, and lightweight deployment configurations.

## Introduction

Portainer runs well on ARM devices like Raspberry Pi, but the default configuration isn't optimized for resource-constrained environments. This guide covers tuning Portainer and the underlying Docker daemon to maximize performance on ARM hardware.

## Prerequisites

- Raspberry Pi 4 (4GB+ RAM recommended) or similar ARM device
- Raspberry Pi OS (64-bit) or Ubuntu Server ARM
- Docker installed for ARM64
- Basic Linux administration knowledge

## Step 1: Use the ARM64 Portainer Image

Portainer provides multi-architecture images. Verify you're using the right one:

```bash
docker inspect portainer/portainer-ce:latest | grep Architecture
# Should show "arm64" on ARM hardware

```

Pull and run the ARM-optimized version:

```bash
docker volume create portainer_data

docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --memory="256m" \
  --memory-swap="512m" \
  --cpus="1.5" \
  portainer/portainer-ce:latest
```

## Step 2: Optimize Docker Daemon Settings

Edit `/etc/docker/daemon.json` to tune Docker for ARM:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-shm-size": "64m",
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3,
  "live-restore": true
}
```

Restart Docker:

```bash
systemctl restart docker
```

## Step 3: Use a Fast Storage Backend

SD cards are slow. Move Docker data directory to an SSD if possible:

```bash
# Stop Docker
systemctl stop docker

# Move Docker data
rsync -av /var/lib/docker/ /mnt/ssd/docker/

# Update daemon.json - add "data-root" to the existing JSON object.
# daemon.json must be a single JSON object, so merge the key in (here using jq):
jq '. + {"data-root": "/mnt/ssd/docker"}' /etc/docker/daemon.json \
  > /etc/docker/daemon.json.tmp && mv /etc/docker/daemon.json.tmp /etc/docker/daemon.json

# Start Docker
systemctl start docker
```

## Step 4: Enable Portainer Edge Agent Lightweight Mode

If running Portainer Agent on ARM (not the full server), use the lightweight agent:

```bash
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  --memory="64m" \
  portainer/agent:latest
```

The agent uses significantly less memory than the full Portainer server.

## Step 5: Limit Log Output

Excessive logging degrades ARM performance. In Portainer's container configuration, limit logs:

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '1.5'
```

## Step 6: Disable Unused Portainer Features

In Portainer settings, disable features you don't use:
1. Navigate to **Settings** > **General**.
2. Disable **Enable snapshot functionality** if you don't need it.
3. Reduce **Snapshot interval** if snapshots are needed.

## Step 7: Optimize the Host System

```bash
# Enable memory cgroup (required for container memory limits)
# Add to /boot/firmware/cmdline.txt (Raspberry Pi OS)
cgroup_enable=memory cgroup_memory=1

# Disable swap (or use a fast SSD swap)
swapoff -a

# Minimize GPU memory allocation for headless (no GUI) operation
# to free RAM for system/containers. Add to /boot/firmware/config.txt
gpu_mem=16

# Enable zram for compressed memory
apt-get install zram-tools
echo "ALGO=lz4" >> /etc/default/zramswap
echo "PERCENT=50" >> /etc/default/zramswap
systemctl enable zramswap
```

## Step 8: Prune Unused Resources

Regularly clean up unused Docker resources on ARM to free space and memory:

```bash
# Clean up unused images, containers, networks, and volumes
docker system prune -a --volumes

# Or schedule via cron
echo "0 3 * * 0 docker system prune -af --filter 'until=168h'" | crontab -
```

In Portainer, you can also navigate to **Images** > **Clean up unused images** from the UI.

## Monitoring Resource Usage

Monitor Portainer's resource consumption:

```bash
docker stats portainer --no-stream
```

Expected output on optimized Pi 4:
```text
CONTAINER  CPU %  MEM USAGE / LIMIT   MEM %
portainer  2.1%   180MiB / 256MiB     70%
```

## Best Practices for ARM

- Use 64-bit ARM OS for better performance and container compatibility.
- Prefer USB SSD or NVMe hat over SD card for Docker storage.
- Set explicit memory limits on all containers to prevent OOM kills.
- Use Portainer Agent on remote ARM nodes and Portainer Server on a more powerful host.
- Keep base images small (Alpine-based) to reduce memory pressure.

## Conclusion

Portainer runs reliably on ARM devices with proper tuning. By limiting memory, using fast storage, configuring Docker daemon settings, and pruning unused resources, you can run a responsive Portainer instance even on a Raspberry Pi 4, enabling centralized container management for home labs and edge deployments.
