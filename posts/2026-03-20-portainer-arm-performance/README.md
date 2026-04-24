# How to Optimize Portainer Performance on ARM Devices - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ARM, Raspberry Pi, Performance, Docker, Optimization, Self-Hosted

Description: Tune Docker and Portainer performance on ARM single-board computers to maximize container density and responsiveness on limited hardware.

## Introduction

ARM devices like Raspberry Pi, Orange Pi, and Jetson have limited CPU and memory compared to x86 servers. With proper tuning, you can significantly improve Portainer's performance and the number of containers you can run simultaneously. This guide covers Docker configuration, system tuning, and Portainer-specific optimizations.

## Docker Daemon Optimization

### Configure the Docker Daemon

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "live-restore": true,
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
EOF

sudo systemctl restart docker
```

Key settings explained:
- `overlay2`: Recommended storage driver for Docker on Linux
- `log-opts max-size/max-file`: Prevents log files from filling ARM's limited storage
- `live-restore`: Keeps containers running during Docker daemon restarts
- `max-concurrent-downloads`: Limits parallel image pulls (important for ARM with slow SD cards)

## System-Level Optimizations

### Reduce Memory Overhead

```bash
# On Raspberry Pi OS, disable the disk-backed swap file

sudo dphys-swapfile swapoff
sudo systemctl disable dphys-swapfile

# Or configure zram swap (especially useful on low-memory ARM systems)
sudo apt install -y zram-tools
sudo tee /etc/default/zramswap > /dev/null << 'EOF'
# Use 50% of RAM for zram swap
PERCENT=50
PRIORITY=100
EOF
sudo systemctl restart zramswap
```

### Increase File Descriptors

```bash
# Increase file descriptor limits for login sessions
sudo tee /etc/security/limits.d/docker.conf > /dev/null << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

# Apply sysctl optimizations
sudo tee /etc/sysctl.d/99-arm-performance.conf > /dev/null << 'EOF'
# Increase max file descriptors
fs.file-max = 2097152

# Optimize network buffers
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Reduce TCP connection overhead
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300

# Increase connection backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
EOF

sudo sysctl --system
```

## Storage Optimization

### Use SSD Instead of MicroSD

```bash
# Check current disk I/O speed
sudo dd if=/dev/zero of=/tmp/test bs=1M count=1024 oflag=direct
sudo dd if=/tmp/test of=/dev/null bs=1M iflag=direct

# Move Docker data to SSD
sudo systemctl stop docker

# Update daemon.json to use the SSD path without dropping the earlier settings
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/ssd/docker",
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "live-restore": true,
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
EOF

# Copy existing Docker data to SSD (if migrating)
sudo rsync -aP /var/lib/docker/ /ssd/docker/
sudo systemctl start docker
```

### Optimize Overlay2 Storage

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources regularly
docker system prune -f

# Remove unused images
docker image prune -a -f

# Set up automatic cleanup cron job
echo '0 3 * * 0 root docker system prune -f >> /var/log/docker-cleanup.log 2>&1' | \
  sudo tee /etc/cron.d/docker-cleanup
```

## Portainer-Specific Optimizations

### Reduce Portainer Memory Usage

Run Portainer with memory limits to prevent it from consuming all available RAM:

```bash
# 256MB RAM, 512MB total memory + swap, and half a CPU core
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  --memory=256m \
  --memory-swap=512m \
  --cpus=0.5 \
  -p 9000:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

### Configure Portainer Snapshot Interval

Portainer periodically takes environment snapshots. Reduce the snapshot frequency for ARM:

In Portainer: **Settings > General > Snapshot interval**: Increase from the default 5 minutes to 30 minutes.

## Container Resource Limits

Always set resource limits on ARM to prevent any single container from starving others:

```yaml
services:
  myapp:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'      # 50% of one core
          memory: 256M
        reservations:
          memory: 64M
    # For standalone (non-swarm) use mem_limit:
    mem_limit: 256m
    memswap_limit: 512m
    cpus: 0.5
```

## Monitoring ARM Performance

Deploy a lightweight monitoring container:

```yaml
services:
  # Lightweight cAdvisor for container metrics
  cadvisor:
    image: ghcr.io/google/cadvisor:latest
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    restart: unless-stopped
```

## Conclusion

ARM devices can comfortably run Portainer and dozens of containers with proper tuning. The most impactful changes are using an SSD instead of MicroSD for Docker storage, configuring log rotation to prevent storage exhaustion, and setting resource limits on containers. These changes transform an ARM SBC from a toy into a reliable home lab server.
