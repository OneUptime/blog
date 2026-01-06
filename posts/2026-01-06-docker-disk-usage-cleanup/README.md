# How to Inspect and Clean Up Docker Disk Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Maintenance, Storage

Description: Master docker system df, prune commands, dangling images, build cache, and reclaiming space safely without breaking running workloads.

Docker disk usage grows silently until your CI server fails mid-build or your laptop refuses to pull new images. Understanding where space goes and how to reclaim it safely keeps your systems healthy without accidentally deleting production data.

---

## Understanding Docker Storage

Docker consumes disk space in five main areas:

1. **Images** - Base images and your built images
2. **Containers** - Writable layers for stopped containers
3. **Volumes** - Persistent data mounts
4. **Build cache** - Cached layers from `docker build`
5. **Networks** - Minimal, but they accumulate

The first step is always visibility.

---

## Inspecting Current Usage

### The Overview Command

```bash
docker system df
```

Output:
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          47        12        8.234GB   5.1GB (61%)
Containers      23        3         2.145GB   2.0GB (93%)
Local Volumes   15        8         12.45GB   4.2GB (33%)
Build Cache     89                  3.456GB   3.456GB
```

**ACTIVE** means currently in use. **RECLAIMABLE** is what you can safely remove.

### Detailed Breakdown

```bash
# Verbose output with individual items
docker system df -v
```

This shows every image, container, and volume with their sizes.

### Image Inspection

```bash
# List all images with sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Sort by size (largest first)
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr

# Find dangling images (no tag, not used)
docker images -f "dangling=true"

# Show image layer history
docker history myapp:latest
```

### Container Inspection

```bash
# All containers with size
docker ps -a -s

# Just stopped containers
docker ps -a -f "status=exited"
```

### Volume Inspection

```bash
# List all volumes
docker volume ls

# Find unused volumes
docker volume ls -f "dangling=true"

# Check volume size (no built-in command, use du)
docker run --rm -v myvolume:/data alpine du -sh /data
```

---

## Safe Cleanup Commands

### The Nuclear Option (Use Carefully)

```bash
# Remove everything not currently in use
docker system prune -a --volumes

# What this removes:
# - All stopped containers
# - All networks not used by containers
# - All dangling images
# - All images without containers
# - All build cache
# - All unused volumes (with --volumes flag)
```

**Warning:** The `-a` flag removes ALL images not attached to running containers. Skip it to preserve tagged images.

### Targeted Cleanup (Recommended)

#### 1. Remove Stopped Containers

```bash
# Preview what will be removed
docker container ls -a -f "status=exited"

# Remove all stopped containers
docker container prune

# Remove containers stopped more than 24 hours ago
docker container prune --filter "until=24h"
```

#### 2. Remove Dangling Images

Dangling images have no tag and aren't used by any container:

```bash
# List dangling images
docker images -f "dangling=true"

# Remove them
docker image prune

# This is safe - dangling images are build artifacts
```

#### 3. Remove Unused Images

```bash
# Remove images not used by any container
docker image prune -a

# Keep images created in last 7 days
docker image prune -a --filter "until=168h"
```

#### 4. Clean Build Cache

```bash
# Remove all build cache
docker builder prune

# Keep cache used in last 24 hours
docker builder prune --filter "until=24h"

# Remove only orphaned cache (safest)
docker builder prune --filter "unused-for=24h"
```

#### 5. Remove Unused Volumes

```bash
# List orphaned volumes
docker volume ls -f "dangling=true"

# Remove them
docker volume prune

# BE CAREFUL: This deletes data permanently
# Always verify the volume isn't needed first
```

---

## Automation Scripts

### Daily Cleanup Cron Job

```bash
#!/bin/bash
# /usr/local/bin/docker-cleanup.sh

# Log cleanup
echo "Docker cleanup started at $(date)" >> /var/log/docker-cleanup.log

# Remove containers stopped more than 24h ago
docker container prune -f --filter "until=24h"

# Remove dangling images
docker image prune -f

# Remove build cache older than 7 days
docker builder prune -f --filter "until=168h"

echo "Docker cleanup completed at $(date)" >> /var/log/docker-cleanup.log
```

Add to crontab:
```bash
# Run daily at 3 AM
0 3 * * * /usr/local/bin/docker-cleanup.sh
```

### CI/CD Cleanup Script

```bash
#!/bin/bash
# Run after each build to prevent disk exhaustion

THRESHOLD_GB=50

# Get available space
AVAILABLE=$(df /var/lib/docker | awk 'NR==2 {print int($4/1024/1024)}')

if [ "$AVAILABLE" -lt "$THRESHOLD_GB" ]; then
  echo "Disk space below ${THRESHOLD_GB}GB, running cleanup..."

  # Aggressive cleanup
  docker container prune -f
  docker image prune -a -f --filter "until=48h"
  docker builder prune -f --filter "until=24h"
  docker volume prune -f

  NEW_AVAILABLE=$(df /var/lib/docker | awk 'NR==2 {print int($4/1024/1024)}')
  echo "Reclaimed $((NEW_AVAILABLE - AVAILABLE))GB"
fi
```

---

## Preventing Disk Bloat

### 1. Use Multi-Stage Builds

Multi-stage builds produce smaller images by discarding build-time dependencies:

```dockerfile
# Build stage
FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - only runtime files
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 2. Use .dockerignore

Exclude unnecessary files from build context:

```
# .dockerignore
node_modules
.git
*.md
.env*
coverage
.nyc_output
dist
*.log
```

### 3. Configure Log Limits

Container logs grow unbounded by default:

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Or per-container:
```bash
docker run --log-opt max-size=10m --log-opt max-file=3 myapp
```

### 4. Set Build Cache Limits

```bash
# Limit build cache to 10GB
docker builder prune --keep-storage 10GB
```

In BuildKit:
```bash
# Set max cache size via environment
BUILDKIT_CACHE_SIZE_MB=10000 docker build .
```

---

## Troubleshooting Large Disk Usage

### Find the Biggest Offenders

```bash
# Total Docker disk usage
sudo du -sh /var/lib/docker

# Breakdown by directory
sudo du -sh /var/lib/docker/*

# Usually the culprits are:
# /var/lib/docker/overlay2  - Image and container layers
# /var/lib/docker/volumes   - Volume data
# /var/lib/docker/containers - Container logs and metadata
```

### Identify Large Container Logs

```bash
# Find large log files
sudo find /var/lib/docker/containers -name "*.log" -size +100M

# Truncate a specific container's log (if you must)
sudo truncate -s 0 /var/lib/docker/containers/<container_id>/<container_id>-json.log
```

### Find Orphaned Layers

```bash
# Overlay2 layers not referenced by any image
# This shouldn't happen, but can after crashes
docker run --rm -v /var/lib/docker:/docker alpine \
  find /docker/overlay2 -maxdepth 1 -type d | wc -l

# Compare to
docker image ls -q | wc -l
```

---

## Quick Reference

```bash
# View disk usage
docker system df
docker system df -v

# Safe daily cleanup
docker container prune -f
docker image prune -f
docker builder prune -f

# Aggressive cleanup (careful!)
docker system prune -a --volumes -f

# Check what will be removed (dry run)
docker container prune --dry-run
docker image prune -a --dry-run

# Remove images older than 7 days
docker image prune -a -f --filter "until=168h"

# Remove specific image
docker rmi myapp:old-version

# Remove all images matching pattern
docker images --format "{{.Repository}}:{{.Tag}}" | grep "myapp" | xargs docker rmi
```

---

## Summary

- Run `docker system df` regularly to understand where space goes
- Use targeted prune commands rather than `docker system prune -a`
- Automate cleanup in CI/CD and on development machines
- Configure log rotation to prevent unbounded growth
- Use multi-stage builds and `.dockerignore` to reduce image sizes
- Never prune volumes without verifying they're truly unused

A few minutes of proactive cleanup prevents hours of emergency disk space recovery.
