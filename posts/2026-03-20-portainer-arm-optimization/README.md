# How to Optimize Portainer Performance on ARM Devices - Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ARM, Raspberry Pi, Performance, Optimization

Description: Learn how to tune Portainer and Docker for optimal performance on resource-constrained ARM devices like Raspberry Pi, Jetson, and other SBCs.

## ARM Devices Running Portainer

Portainer's ARM images primarily target ARM64, with ARMv7 support also available. Common devices:

| Device | Arch | RAM | Notes |
|--------|------|-----|-------|
| Raspberry Pi 3 | arm64 / armv7 | 1GB | Limited RAM, ARMv7 support is available |
| Raspberry Pi 4 | arm64 | 1-8GB | Good performance with 4GB+ |
| Raspberry Pi 5 | arm64 | 1-16GB | Best Pi for Portainer |
| NVIDIA Jetson Nano | arm64 | 4GB | GPU available |
| Orange Pi 5 | arm64 | 4-32GB | High performance ARM |

## Step 1: Use Minimal Portainer Memory Settings

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --memory=256m \
  --memory-swap=512m \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 2: Enable Swap on the Host

ARM devices often have limited RAM. Swap helps prevent OOM kills:

```bash
# Create a 2GB swapfile

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Reduce swappiness (prefer RAM, use swap only when necessary)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 3: Use a Fast Storage Device

ARM device performance is heavily limited by SD card speed. Use an SSD. On fresh Docker Engine 29+ installs, image data may also be stored under `/var/lib/containerd`, so place both Docker and containerd data on fast storage. If you are migrating an existing installation, copy the current contents of `/var/lib/docker` and `/var/lib/containerd` to the new locations before restarting the services.

```bash
# Check current storage speed
dd if=/dev/zero of=/tmp/test bs=1M count=1000 oflag=sync
rm -f /tmp/test

sudo systemctl stop docker
sudo systemctl stop containerd
sudo mkdir -p /mnt/ssd/docker /mnt/ssd/containerd-data
```

Set `/etc/docker/daemon.json` to:

```json
{
  "data-root": "/mnt/ssd/docker"
}
```

In `/etc/containerd/config.toml`, set:

```toml
version = 2
root = "/mnt/ssd/containerd-data"
```

```bash
sudo systemctl start containerd
sudo systemctl start docker
```

## Step 4: Optimize Docker Daemon for ARM

Merge these settings into the existing `/etc/docker/daemon.json` file instead of overwriting it:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
```

## Step 5: Use ARM-Optimized Images

Always use ARM-native images, not emulated x86 images:

```bash
# Pull the image for your device's native platform
docker pull nginx:alpine

# Check the pulled image architecture
docker image inspect --format '{{.Architecture}}' nginx:alpine
# Should match your device, such as "arm64" or "arm"

# Check what platforms the image publishes
docker buildx imagetools inspect nginx:alpine
```

Use multi-arch images from official sources - they automatically pull the correct architecture.

## Step 6: Limit Edge Agent Polling

Reduce Edge Agent background activity on low-memory devices:

- If you use Edge Agents, **Settings → General**: increase **Edge agent default poll frequency** from 5s to a higher interval, such as 60s
- Avoid running resource-intensive stacks on the same device as Portainer

## Step 7: Reduce Python Overhead in Containers

For Python applications on ARM:

```dockerfile
# Use slim or alpine variants
FROM python:3.12-slim-bookworm

WORKDIR /app
COPY . /app

# Pre-compile Python files after copying the application code
RUN python -m compileall /app
```

## Memory Monitoring

```bash
# Watch memory usage
watch -n 5 'free -h && docker stats --no-stream --format "{{.Name}}\t{{.MemUsage}}"'

# Check if swap is being used heavily
vmstat 5 | awk 'NR > 2 {print $7, $8}'    # si=swap in, so=swap out
# High values indicate RAM pressure
```

## Conclusion

Portainer runs well on ARM devices with proper tuning. The most impactful changes are adding swap memory, moving Docker storage to a fast SSD, and ensuring you're using native ARM images. On Raspberry Pi 4 with 4GB+ RAM and an SSD, Portainer can perform well for small deployments.
