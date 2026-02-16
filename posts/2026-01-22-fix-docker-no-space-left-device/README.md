# How to Fix Docker 'No Space Left on Device' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Disk Space, Troubleshooting, DevOps, Maintenance

Description: Resolve Docker disk space exhaustion by identifying space consumers, cleaning unused resources, and implementing preventive measures to avoid future 'no space left on device' errors.

---

The "no space left on device" error stops Docker operations abruptly. Builds fail, containers cannot start, and even simple commands like `docker ps` might hang. Docker accumulates images, containers, volumes, and build cache over time, often consuming far more disk space than expected.

## Diagnosing the Problem

First, confirm disk usage and identify the culprit:

```bash
# Check overall disk usage
df -h

# Check Docker's disk usage
docker system df

# Detailed breakdown
docker system df -v
```

Sample output:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        12        15.2GB    8.5GB (55%)
Containers      23        5         1.2GB     950MB (79%)
Local Volumes   18        8         25.3GB    12.1GB (47%)
Build Cache     -         -         8.9GB     8.9GB
```

The "RECLAIMABLE" column shows how much space can be freed.

## Quick Fix: Docker System Prune

The fastest way to reclaim space:

```bash
# Remove unused containers, networks, and dangling images
docker system prune

# Also remove unused volumes (data loss risk!)
docker system prune --volumes

# Remove everything unused including all unused images
docker system prune -a

# Skip confirmation prompt
docker system prune -af --volumes
```

Warning: `--volumes` removes volumes not attached to containers. Ensure you have backups of important data.

## Targeted Cleanup

For more control, clean specific resource types:

### Remove Unused Images

```bash
# Remove dangling images (untagged, not used by containers)
docker image prune

# Remove all unused images (not just dangling)
docker image prune -a

# Remove images older than 24 hours
docker image prune -a --filter "until=24h"

# Remove images matching a pattern
docker images | grep "none" | awk '{print $3}' | xargs docker rmi
```

### Remove Stopped Containers

```bash
# Remove all stopped containers
docker container prune

# Remove containers stopped more than 1 hour ago
docker container prune --filter "until=1h"

# List and remove by name pattern
docker ps -a | grep "test-" | awk '{print $1}' | xargs docker rm
```

### Remove Unused Volumes

```bash
# List volumes
docker volume ls

# Remove specific volume
docker volume rm myvolume

# Remove all unused volumes
docker volume prune

# Find large volumes
docker system df -v | grep -A 100 "Local Volumes" | sort -k3 -h
```

### Clear Build Cache

```bash
# Remove build cache
docker builder prune

# Remove all build cache (including in-use layers)
docker builder prune -a

# Keep only cache from the last 7 days
docker builder prune --filter "until=168h"
```

## Finding Space Hogs

### Large Images

```bash
# Sort images by size
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -h

# Find images larger than 1GB
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | grep -E "^[0-9]+(\.[0-9]+)?GB"
```

### Large Containers

```bash
# Check container sizes
docker ps -as --format "table {{.Names}}\t{{.Size}}"

# Find containers with large writable layers
docker ps -a --format "{{.Names}}" | while read name; do
    size=$(docker inspect "$name" --format '{{.SizeRw}}' 2>/dev/null || echo 0)
    echo "$size $name"
done | sort -n | tail -20
```

### Large Volumes

```bash
# Inspect volume locations
docker volume inspect myvolume --format '{{.Mountpoint}}'

# Check size of all volumes
for vol in $(docker volume ls -q); do
    path=$(docker volume inspect "$vol" --format '{{.Mountpoint}}')
    if [ -d "$path" ]; then
        size=$(sudo du -sh "$path" 2>/dev/null | cut -f1)
        echo "$size $vol"
    fi
done | sort -h
```

### Docker Root Directory

```bash
# Find Docker's storage location
docker info | grep "Docker Root Dir"

# Check subdirectory sizes
sudo du -sh /var/lib/docker/*
```

Typical output:

```
12G     /var/lib/docker/overlay2
5.2G    /var/lib/docker/volumes
2.1G    /var/lib/docker/image
1.5G    /var/lib/docker/buildkit
100M    /var/lib/docker/containers
```

## Preventing Future Issues

### Set Log Rotation

Container logs can grow unbounded:

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

### Limit Build Cache

```json
// /etc/docker/daemon.json
{
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "20GB"
    }
  }
}
```

### Automated Cleanup Script

```bash
#!/bin/bash
# docker-cleanup.sh - Run periodically via cron

# Remove containers stopped more than 1 day ago
docker container prune -f --filter "until=24h"

# Remove unused images older than 1 week
docker image prune -af --filter "until=168h"

# Remove build cache older than 1 week
docker builder prune -f --filter "until=168h"

# Remove unused volumes (be careful!)
# docker volume prune -f

# Report current usage
docker system df
```

Add to cron:

```bash
# Run daily at 3 AM
0 3 * * * /path/to/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1
```

### Monitor Disk Usage

```bash
#!/bin/bash
# monitor-docker-disk.sh

THRESHOLD=80
USAGE=$(df /var/lib/docker | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "Docker disk usage is ${USAGE}% (threshold: ${THRESHOLD}%)"
    docker system df
    # Send alert
    curl -X POST "https://alerts.example.com/webhook" \
        -d "{\"message\": \"Docker disk usage at ${USAGE}%\"}"
fi
```

## Handling Emergency Situations

When Docker is completely stuck:

### Clear Container Logs Directly

```bash
# Find and truncate large log files
sudo find /var/lib/docker/containers -name "*.log" -size +100M -exec truncate -s 0 {} \;
```

### Remove Dangling Overlay Layers

```bash
# Stop Docker first
sudo systemctl stop docker

# Find overlay directories not linked to any image
sudo du -sh /var/lib/docker/overlay2/* | sort -h | tail -20

# Restart Docker to let it clean up
sudo systemctl start docker
```

### Move Docker to Different Disk

If the current disk is too small:

```bash
# Stop Docker
sudo systemctl stop docker

# Move Docker directory
sudo mv /var/lib/docker /new-disk/docker

# Create symlink or update daemon.json
sudo ln -s /new-disk/docker /var/lib/docker

# Or configure in daemon.json
# { "data-root": "/new-disk/docker" }

# Start Docker
sudo systemctl start docker
```

## CI/CD Considerations

CI systems need aggressive cleanup:

```yaml
# GitLab CI example
after_script:
  - docker system prune -f --filter "until=1h"

# GitHub Actions example
- name: Clean up Docker
  if: always()
  run: |
    docker system prune -f
    docker volume prune -f
```

### Build Cleanup in Pipelines

```bash
# After building and pushing, remove the local image
docker build -t myregistry/app:$SHA .
docker push myregistry/app:$SHA
docker rmi myregistry/app:$SHA

# Or tag and remove
docker build -t app:build .
docker tag app:build myregistry/app:$SHA
docker push myregistry/app:$SHA
docker rmi app:build myregistry/app:$SHA
```

## Best Practices Summary

1. **Enable log rotation** in daemon.json
2. **Set build cache limits** to prevent unbounded growth
3. **Run cleanup scripts** on a schedule
4. **Monitor disk usage** and alert before critical
5. **Use multi-stage builds** to reduce image sizes
6. **Remove images** after pushing to registry in CI/CD
7. **Audit volumes** periodically for orphaned data

---

Docker disk space issues are preventable with proper configuration and regular maintenance. Configure log rotation and build cache limits, run automated cleanup scripts, and monitor disk usage proactively. When emergencies occur, targeted cleanup of specific resource types is safer than blanket deletion commands.
