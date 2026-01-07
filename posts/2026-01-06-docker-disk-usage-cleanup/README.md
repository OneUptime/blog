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

This is the first command to run when diagnosing Docker disk usage. It provides a summary of space used by each resource type:

```bash
# Display disk space used by Docker resources
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

The verbose flag provides detailed information about each individual image, container, and volume:

```bash
# Verbose output with individual items
# Shows each image, container, and volume with its size
docker system df -v
```

This shows every image, container, and volume with their sizes.

### Image Inspection

These commands help you identify which images are consuming the most space:

```bash
# List all images with sizes in a formatted table
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Sort by size (largest first) - pipe through sort for custom ordering
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -hr

# Find dangling images (no tag, not used by any container)
# These are safe to delete and often accumulate from builds
docker images -f "dangling=true"

# Show image layer history to understand what's consuming space in an image
docker history myapp:latest
```

### Container Inspection

These commands help identify stopped containers and their disk usage:

```bash
# All containers with size (includes writable layer size)
docker ps -a -s

# Just stopped containers - these are candidates for removal
docker ps -a -f "status=exited"
```

### Volume Inspection

Volume inspection requires some creative approaches since Docker doesn't provide built-in size reporting:

```bash
# List all volumes
docker volume ls

# Find unused volumes (not attached to any container)
# These are candidates for cleanup but may contain important data
docker volume ls -f "dangling=true"

# Check volume size (no built-in command, use du via a temporary container)
# This mounts the volume and runs du to check size
docker run --rm -v myvolume:/data alpine du -sh /data
```

---

## Safe Cleanup Commands

### The Nuclear Option (Use Carefully)

This command removes everything not currently in use. Use with extreme caution, especially on production systems:

```bash
# Remove everything not currently in use
# WARNING: This is destructive - verify you want to remove ALL unused resources
docker system prune -a --volumes

# What this removes:
# - All stopped containers
# - All networks not used by containers
# - All dangling images
# - All images without containers (with -a flag)
# - All build cache
# - All unused volumes (with --volumes flag)
```

**Warning:** The `-a` flag removes ALL images not attached to running containers. Skip it to preserve tagged images.

### Targeted Cleanup (Recommended)

#### 1. Remove Stopped Containers

Removing stopped containers is generally safe and often recovers significant space:

```bash
# Preview what will be removed before actually deleting
docker container ls -a -f "status=exited"

# Remove all stopped containers
docker container prune

# Remove containers stopped more than 24 hours ago
# Using time filters prevents accidentally removing recently stopped containers
docker container prune --filter "until=24h"
```

#### 2. Remove Dangling Images

Dangling images have no tag and aren't used by any container:

Dangling images are leftover artifacts from builds and are safe to remove:

```bash
# List dangling images to see what will be removed
docker images -f "dangling=true"

# Remove them - this is safe as they're not referenced by any container or tag
docker image prune

# This is safe - dangling images are build artifacts
```

#### 3. Remove Unused Images

This is more aggressive than removing dangling images and will remove tagged images not in use:

```bash
# Remove images not used by any container
# WARNING: This removes ALL unused images, including tagged ones
docker image prune -a

# Keep images created in last 7 days (168 hours)
# Safer approach that preserves recent builds
docker image prune -a --filter "until=168h"
```

#### 4. Clean Build Cache

Build cache can grow very large, especially in CI environments:

```bash
# Remove all build cache - frees significant space but slows next build
docker builder prune

# Keep cache used in last 24 hours - balance between space and build speed
docker builder prune --filter "until=24h"

# Remove only orphaned cache (safest) - removes only cache no longer valid
docker builder prune --filter "unused-for=24h"
```

#### 5. Remove Unused Volumes

Volume cleanup requires extra caution as volumes may contain important data:

```bash
# List orphaned volumes - not attached to any container
docker volume ls -f "dangling=true"

# Remove them - DESTRUCTIVE: verify these volumes are truly not needed
docker volume prune

# BE CAREFUL: This deletes data permanently
# Always verify the volume isn't needed first
```

---

## Automation Scripts

### Daily Cleanup Cron Job

This script automates daily cleanup of Docker resources, keeping your system healthy:

```bash
#!/bin/bash
# /usr/local/bin/docker-cleanup.sh
# Automated daily Docker cleanup script

# Log cleanup start time for monitoring
echo "Docker cleanup started at $(date)" >> /var/log/docker-cleanup.log

# Remove containers stopped more than 24h ago
# -f flag skips confirmation prompt
docker container prune -f --filter "until=24h"

# Remove dangling images (untagged, unreferenced)
docker image prune -f

# Remove build cache older than 7 days (168 hours)
docker builder prune -f --filter "until=168h"

# Log completion time
echo "Docker cleanup completed at $(date)" >> /var/log/docker-cleanup.log
```

Add to crontab:

```bash
# Run daily at 3 AM during low-traffic hours
0 3 * * * /usr/local/bin/docker-cleanup.sh
```

### CI/CD Cleanup Script

This script monitors available disk space and triggers cleanup when needed:

```bash
#!/bin/bash
# Run after each build to prevent disk exhaustion
# Designed for CI/CD environments where disk space is critical

# Set threshold in GB - cleanup triggers below this value
THRESHOLD_GB=50

# Get available space in GB for Docker storage partition
# Uses awk to parse df output and convert KB to GB
AVAILABLE=$(df /var/lib/docker | awk 'NR==2 {print int($4/1024/1024)}')

# Check if cleanup is needed
if [ "$AVAILABLE" -lt "$THRESHOLD_GB" ]; then
  echo "Disk space below ${THRESHOLD_GB}GB, running cleanup..."

  # Aggressive cleanup - remove more than daily script
  docker container prune -f
  # Remove images older than 48 hours
  docker image prune -a -f --filter "until=48h"
  # Remove build cache older than 24 hours
  docker builder prune -f --filter "until=24h"
  # Remove unused volumes (be careful in production)
  docker volume prune -f

  # Report space reclaimed
  NEW_AVAILABLE=$(df /var/lib/docker | awk 'NR==2 {print int($4/1024/1024)}')
  echo "Reclaimed $((NEW_AVAILABLE - AVAILABLE))GB"
fi
```

---

## Preventing Disk Bloat

### 1. Use Multi-Stage Builds

Multi-stage builds produce smaller images by discarding build-time dependencies:

Multi-stage builds dramatically reduce image size by separating build tools from runtime:

```dockerfile
# Build stage - contains all build tools and dependencies
FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
# Use npm ci for reproducible builds
RUN npm ci
COPY . .
# Build the application
RUN npm run build

# Production stage - only runtime files, much smaller
FROM node:22-alpine
WORKDIR /app
# Copy only the built artifacts, not the build tools or source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# Run the built application
CMD ["node", "dist/index.js"]
```

### 2. Use .dockerignore

Exclude unnecessary files from build context:

A proper .dockerignore reduces build context size and prevents accidentally including sensitive files:

```
# .dockerignore
# Dependencies are installed fresh in container
node_modules
# Git history is not needed in images
.git
# Documentation doesn't belong in production images
*.md
# Never include environment files - security risk
.env*
# Test output and coverage reports
coverage
.nyc_output
# Build output is created during docker build
dist
# Log files
*.log
```

### 3. Configure Log Limits

Container logs grow unbounded by default:

Docker logs can consume significant disk space. Configure limits at the daemon level:

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
# Limit logs to 10MB with 3 rotated files (30MB total max per container)
docker run --log-opt max-size=10m --log-opt max-file=3 myapp
```

### 4. Set Build Cache Limits

Limit how much space the build cache can consume:

```bash
# Limit build cache to 10GB - removes oldest entries beyond this limit
docker builder prune --keep-storage 10GB
```

In BuildKit:

```bash
# Set max cache size via environment variable (in MB)
BUILDKIT_CACHE_SIZE_MB=10000 docker build .
```

---

## Troubleshooting Large Disk Usage

### Find the Biggest Offenders

When Docker consumes unexpected disk space, investigate the storage directories:

```bash
# Total Docker disk usage
sudo du -sh /var/lib/docker

# Breakdown by directory to identify the culprit
sudo du -sh /var/lib/docker/*

# Usually the culprits are:
# /var/lib/docker/overlay2  - Image and container layers
# /var/lib/docker/volumes   - Volume data
# /var/lib/docker/containers - Container logs and metadata
```

### Identify Large Container Logs

Container logs are a common cause of unexpected disk usage:

```bash
# Find large log files (over 100MB)
sudo find /var/lib/docker/containers -name "*.log" -size +100M

# Truncate a specific container's log (if you must)
# WARNING: This loses log data permanently
sudo truncate -s 0 /var/lib/docker/containers/<container_id>/<container_id>-json.log
```

### Find Orphaned Layers

After crashes, Docker may leave orphaned layers that consume space:

```bash
# Count overlay2 layers not referenced by any image
# This shouldn't happen normally, but can occur after crashes
docker run --rm -v /var/lib/docker:/docker alpine \
  find /docker/overlay2 -maxdepth 1 -type d | wc -l

# Compare to the number of images (should be roughly similar)
docker image ls -q | wc -l
```

---

## Quick Reference

Common Docker disk usage commands for quick reference:

```bash
# View disk usage - first command to run
docker system df
# Verbose view with individual items
docker system df -v

# Safe daily cleanup - low risk
docker container prune -f      # Remove stopped containers
docker image prune -f          # Remove dangling images
docker builder prune -f        # Remove build cache

# Aggressive cleanup (careful!)
# Removes ALL unused resources including tagged images
docker system prune -a --volumes -f

# Check what will be removed (dry run) - no actual deletion
docker container prune --dry-run
docker image prune -a --dry-run

# Remove images older than 7 days (168 hours)
docker image prune -a -f --filter "until=168h"

# Remove specific image by name
docker rmi myapp:old-version

# Remove all images matching pattern using xargs
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
