# How to Fix Docker 'No Space Left on Device' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Storage, Troubleshooting, DevOps, Disk Space

Description: Learn how to diagnose and resolve Docker disk space issues, clean up unused images and containers, manage Docker's storage driver, and prevent space problems.

---

Docker can consume significant disk space with images, containers, volumes, and build cache. When you hit "no space left on device" errors, you need to identify what's consuming space and clean it up safely.

## Diagnose Space Usage

### Check Docker Disk Usage

```bash
# Overview of Docker disk usage
docker system df

# Example output:
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          50        10        15.2GB    12.1GB (79%)
# Containers      25        5         2.5GB     1.8GB (72%)
# Local Volumes   15        8         8.3GB     4.2GB (50%)
# Build Cache     0         0         5.1GB     5.1GB

# Detailed view
docker system df -v
```

### Check Host Disk Space

```bash
# Overall disk usage
df -h

# Docker's data directory specifically
df -h /var/lib/docker

# Find large directories
du -sh /var/lib/docker/*
```

### Identify Large Images

```bash
# List images by size
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | sort -k2 -h

# Find dangling images (untagged)
docker images -f "dangling=true"
```

### Identify Large Containers

```bash
# Container sizes
docker ps -as --format "table {{.Names}}\t{{.Size}}"

# Find stopped containers taking space
docker ps -a -f "status=exited" --format "table {{.Names}}\t{{.Size}}"
```

### Identify Large Volumes

```bash
# List volumes
docker volume ls

# Find volume sizes (requires checking each)
for vol in $(docker volume ls -q); do
  size=$(docker run --rm -v $vol:/data alpine du -sh /data 2>/dev/null | cut -f1)
  echo "$vol: $size"
done
```

## Quick Cleanup

### Remove Everything Unused (Nuclear Option)

```bash
# WARNING: Removes all unused data
docker system prune -a --volumes

# What this removes:
# - All stopped containers
# - All networks not used by containers
# - All dangling images
# - All dangling build cache
# - All unused volumes (with --volumes)
```

### Selective Cleanup

```bash
# Remove only stopped containers
docker container prune

# Remove only unused images
docker image prune

# Remove only dangling images (untagged)
docker image prune -a

# Remove only unused volumes
docker volume prune

# Remove only build cache
docker builder prune

# Remove networks not used by containers
docker network prune
```

## Targeted Cleanup

### Remove Specific Images

```bash
# Remove images older than 24 hours
docker image prune -a --filter "until=24h"

# Remove images matching a pattern
docker images | grep "myapp" | awk '{print $3}' | xargs docker rmi

# Remove all versions except latest
docker images myapp | tail -n +2 | awk '{print $3}' | xargs docker rmi
```

### Remove Specific Containers

```bash
# Remove containers stopped more than 1 hour ago
docker container prune --filter "until=1h"

# Remove containers by name pattern
docker ps -a | grep "test-" | awk '{print $1}' | xargs docker rm

# Remove containers with specific label
docker container prune --filter "label=environment=dev"
```

### Clean Up Build Cache

```bash
# Remove all build cache
docker builder prune -a

# Remove cache older than 7 days
docker builder prune --filter "until=168h"

# Keep only 5GB of cache
docker builder prune --keep-storage 5GB
```

## Automated Cleanup

### Cron Job for Regular Cleanup

```bash
# Add to crontab (crontab -e)
# Daily cleanup at 3 AM
0 3 * * * docker system prune -f --filter "until=48h"

# Weekly deep clean on Sundays
0 4 * * 0 docker system prune -af --filter "until=168h"
```

### Cleanup Script

```bash
#!/bin/bash
# docker-cleanup.sh

echo "Docker Disk Usage Before Cleanup:"
docker system df

echo -e "\nRemoving stopped containers..."
docker container prune -f

echo -e "\nRemoving unused images..."
docker image prune -af --filter "until=48h"

echo -e "\nRemoving unused volumes..."
docker volume prune -f

echo -e "\nRemoving build cache..."
docker builder prune -f --keep-storage 2GB

echo -e "\nDocker Disk Usage After Cleanup:"
docker system df
```

### Docker Compose Cleanup

```bash
# Remove containers, networks, and images for a project
docker compose down --rmi all --volumes

# Remove only containers and networks
docker compose down

# Remove orphan containers
docker compose down --remove-orphans
```

## Prevent Space Issues

### Configure Docker Storage Limits

```json
// /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.size=10G"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker after changes:
```bash
sudo systemctl restart docker
```

### Limit Container Log Sizes

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Or system-wide in daemon.json:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Multi-Stage Builds

Reduce image size with multi-stage builds:

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - much smaller
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
```

### Use Smaller Base Images

```dockerfile
# Instead of
FROM ubuntu:22.04      # ~77MB

# Use
FROM alpine:3.19       # ~7MB
FROM debian:bookworm-slim  # ~74MB
FROM gcr.io/distroless/static  # ~2MB
```

## Emergency Space Recovery

### When Disk Is 100% Full

```bash
# Find and remove large log files
sudo find /var/lib/docker/containers -name "*.log" -size +100M -delete

# Or truncate logs without removing
sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'

# Remove exited containers forcefully
docker rm $(docker ps -aq -f status=exited) 2>/dev/null

# Force remove dangling images
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null
```

### Move Docker Data Directory

If /var is full, move Docker to another partition:

```bash
# Stop Docker
sudo systemctl stop docker

# Move data
sudo mv /var/lib/docker /new/location/docker

# Create symlink
sudo ln -s /new/location/docker /var/lib/docker

# Or configure new location
# /etc/docker/daemon.json
{
  "data-root": "/new/location/docker"
}

# Start Docker
sudo systemctl start docker
```

## Monitor Docker Space

### Monitoring Script

```bash
#!/bin/bash
# docker-space-monitor.sh

THRESHOLD=80
DOCKER_USAGE=$(docker system df --format '{{.Size}}' | head -1)
DISK_USAGE=$(df /var/lib/docker | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
  echo "WARNING: Docker disk usage at ${DISK_USAGE}%"
  docker system df
  # Optionally trigger cleanup
  # docker system prune -f --filter "until=24h"
fi
```

### Set Up Alerts

```bash
# Add to crontab
*/15 * * * * /path/to/docker-space-monitor.sh | mail -s "Docker Space Alert" admin@example.com
```

## Troubleshoot Storage Driver Issues

### Check Storage Driver

```bash
docker info | grep "Storage Driver"
```

### Overlay2 Cleanup

```bash
# Check overlay2 usage
du -sh /var/lib/docker/overlay2

# List layer sizes
for layer in /var/lib/docker/overlay2/*/; do
  du -sh "$layer" 2>/dev/null
done | sort -h | tail -20
```

### Reset Docker Storage (Last Resort)

```bash
# WARNING: Removes ALL Docker data
sudo systemctl stop docker
sudo rm -rf /var/lib/docker
sudo systemctl start docker
```

## Quick Reference

| Command | What It Removes |
|---------|-----------------|
| `docker system prune` | Stopped containers, unused networks, dangling images |
| `docker system prune -a` | Above + all unused images |
| `docker system prune -a --volumes` | Above + unused volumes |
| `docker container prune` | Stopped containers |
| `docker image prune` | Dangling images |
| `docker image prune -a` | All unused images |
| `docker volume prune` | Unused volumes |
| `docker builder prune` | Build cache |

## Summary

| Task | Command |
|------|---------|
| Check space usage | `docker system df` |
| Quick cleanup | `docker system prune` |
| Deep cleanup | `docker system prune -a --volumes` |
| Remove old images | `docker image prune -a --filter "until=24h"` |
| Limit log size | Configure daemon.json log-opts |
| Monitor space | Script with df and alerts |

Regularly clean up unused Docker resources to prevent disk space issues. Use multi-stage builds and smaller base images to reduce image sizes. Configure log rotation to prevent log files from growing unbounded. For production systems, set up monitoring and automated cleanup.

