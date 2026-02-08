# How to Automate Docker Cleanup with Shell Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, cleanup, automation, shell scripts, disk space, maintenance, DevOps

Description: Automate Docker cleanup with shell scripts to reclaim disk space by removing unused images, containers, volumes, and build cache.

---

Docker is generous with disk space. Every pulled image, every stopped container, every orphaned volume, and every build cache layer stays on disk until you explicitly remove it. On a busy development machine or CI/CD server, Docker can consume tens or hundreds of gigabytes without anyone noticing, until the disk fills up and everything breaks.

Automated cleanup scripts solve this problem. Run them on a schedule, and Docker's disk usage stays under control. This guide provides production-ready scripts that you can deploy immediately.

## Understanding What Consumes Disk Space

Before cleaning, understand where the space goes:

```bash
# Show Docker disk usage summary
docker system df

# Show detailed breakdown including individual images and containers
docker system df -v
```

Typical output shows four categories:
- **Images** - Downloaded and built images
- **Containers** - Stopped containers and their writable layers
- **Local Volumes** - Named and anonymous volumes
- **Build Cache** - BuildKit layer cache

## The Quick Cleanup: Docker System Prune

Docker's built-in prune command removes unused resources:

```bash
# Remove stopped containers, unused networks, dangling images, and build cache
docker system prune -f

# Remove everything including unused images (not just dangling ones)
docker system prune -a -f

# Remove everything including volumes (be careful with this one)
docker system prune -a --volumes -f
```

The problem with `docker system prune` is that it is all-or-nothing. You cannot control retention periods, exclude certain resources, or add custom logic. That is where shell scripts come in.

## Script 1: Remove Old Stopped Containers

Keep recently stopped containers for debugging, but remove ones that have been dead for more than a set period.

```bash
#!/bin/bash
# cleanup-containers.sh
# Removes stopped containers older than the specified number of hours

MAX_AGE_HOURS="${1:-24}"
REMOVED=0

echo "[$(date)] Cleaning up containers stopped more than ${MAX_AGE_HOURS} hours ago"

# Get stopped containers with their finish time
for CONTAINER_ID in $(docker ps -a -q --filter status=exited --filter status=dead); do
    # Get the time the container stopped
    FINISHED=$(docker inspect --format '{{.State.FinishedAt}}' "$CONTAINER_ID")
    FINISHED_EPOCH=$(date -d "$FINISHED" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$FINISHED" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)

    # Calculate age in hours
    AGE_HOURS=$(( (NOW_EPOCH - FINISHED_EPOCH) / 3600 ))

    if [ "$AGE_HOURS" -ge "$MAX_AGE_HOURS" ]; then
        NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
        echo "  Removing: $NAME (stopped ${AGE_HOURS}h ago)"
        docker rm "$CONTAINER_ID"
        REMOVED=$((REMOVED + 1))
    fi
done

echo "[$(date)] Removed $REMOVED containers"
```

## Script 2: Remove Unused Images with Retention

Keep recent images but remove old ones that are not referenced by any container.

```bash
#!/bin/bash
# cleanup-images.sh
# Removes unused Docker images older than the specified number of days

MAX_AGE_DAYS="${1:-7}"
PROTECTED_PATTERNS="${2:-}"  # Comma-separated patterns to protect, e.g., "myapp,base-image"
REMOVED=0
RECLAIMED=0

echo "[$(date)] Cleaning up images older than ${MAX_AGE_DAYS} days"

# Get all image IDs
for IMAGE_ID in $(docker images -q --filter "dangling=false"); do
    # Get image creation time
    CREATED=$(docker inspect --format '{{.Created}}' "$IMAGE_ID")
    CREATED_EPOCH=$(date -d "$CREATED" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$CREATED" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    AGE_DAYS=$(( (NOW_EPOCH - CREATED_EPOCH) / 86400 ))

    # Skip if too young
    if [ "$AGE_DAYS" -lt "$MAX_AGE_DAYS" ]; then
        continue
    fi

    # Get image repo tags
    REPO_TAG=$(docker inspect --format '{{index .RepoTags 0}}' "$IMAGE_ID" 2>/dev/null || echo "<none>")

    # Check if image matches a protected pattern
    PROTECTED=false
    if [ -n "$PROTECTED_PATTERNS" ]; then
        IFS=',' read -ra PATTERNS <<< "$PROTECTED_PATTERNS"
        for PATTERN in "${PATTERNS[@]}"; do
            if [[ "$REPO_TAG" == *"$PATTERN"* ]]; then
                PROTECTED=true
                break
            fi
        done
    fi

    if [ "$PROTECTED" = true ]; then
        echo "  Protected: $REPO_TAG (${AGE_DAYS}d old)"
        continue
    fi

    # Check if any running container uses this image
    USED=$(docker ps -q --filter "ancestor=$IMAGE_ID" | head -1)
    if [ -n "$USED" ]; then
        continue
    fi

    # Get image size before removing
    SIZE=$(docker inspect --format '{{.Size}}' "$IMAGE_ID")
    SIZE_MB=$((SIZE / 1048576))

    echo "  Removing: $REPO_TAG (${AGE_DAYS}d old, ${SIZE_MB}MB)"
    docker rmi "$IMAGE_ID" 2>/dev/null && {
        REMOVED=$((REMOVED + 1))
        RECLAIMED=$((RECLAIMED + SIZE_MB))
    }
done

# Always remove dangling images (no tag, no reference)
echo ""
echo "Removing dangling images..."
DANGLING=$(docker images -q --filter "dangling=true")
if [ -n "$DANGLING" ]; then
    docker rmi $DANGLING 2>/dev/null
fi

echo "[$(date)] Removed $REMOVED images, reclaimed approximately ${RECLAIMED}MB"
```

## Script 3: Clean Up Orphaned Volumes

Volumes that are not attached to any container waste disk space silently.

```bash
#!/bin/bash
# cleanup-volumes.sh
# Removes Docker volumes that are not attached to any container

PROTECTED_VOLUMES="${1:-}"  # Comma-separated volume names to protect
REMOVED=0

echo "[$(date)] Cleaning up orphaned Docker volumes"

# Get volumes not used by any container
for VOLUME in $(docker volume ls -q); do
    # Check if the volume is in the protected list
    if [ -n "$PROTECTED_VOLUMES" ]; then
        if echo "$PROTECTED_VOLUMES" | grep -q "$VOLUME"; then
            echo "  Protected: $VOLUME"
            continue
        fi
    fi

    # Check if any container (running or stopped) references this volume
    USED=$(docker ps -a --filter volume="$VOLUME" -q | head -1)

    if [ -z "$USED" ]; then
        # Get volume size (requires inspecting the mount point)
        MOUNT=$(docker volume inspect --format '{{.Mountpoint}}' "$VOLUME")
        SIZE=$(du -sh "$MOUNT" 2>/dev/null | cut -f1)

        echo "  Removing orphaned volume: $VOLUME (${SIZE:-unknown size})"
        docker volume rm "$VOLUME"
        REMOVED=$((REMOVED + 1))
    fi
done

echo "[$(date)] Removed $REMOVED orphaned volumes"
```

## Script 4: Build Cache Cleanup

Docker BuildKit cache grows continuously. Clean it on a schedule.

```bash
#!/bin/bash
# cleanup-buildcache.sh
# Removes Docker build cache entries older than the specified number of days

MAX_AGE_DAYS="${1:-3}"
MAX_CACHE_SIZE="${2:-10G}"

echo "[$(date)] Cleaning up Docker build cache"

# Show current cache usage
echo "Current build cache usage:"
docker buildx du --verbose 2>/dev/null || docker builder prune --dry-run

# Remove cache older than the specified age
docker builder prune \
    --filter "until=${MAX_AGE_DAYS}d" \
    --force

# If cache still exceeds the size limit, prune more aggressively
CACHE_SIZE=$(docker system df --format '{{.Size}}' | tail -1)
echo "Cache size after age-based prune: $CACHE_SIZE"

# Keep a maximum cache size
docker builder prune \
    --keep-storage "$MAX_CACHE_SIZE" \
    --force

echo "[$(date)] Build cache cleanup complete"
```

## Script 5: The Master Cleanup Script

Combine everything into one comprehensive cleanup script:

```bash
#!/bin/bash
# docker-cleanup.sh
# Master cleanup script that handles containers, images, volumes, and build cache

set -euo pipefail

# Configuration
CONTAINER_MAX_AGE_HOURS=24
IMAGE_MAX_AGE_DAYS=7
CACHE_MAX_AGE_DAYS=3
PROTECTED_IMAGES="postgres,redis,registry"
PROTECTED_VOLUMES="pg_data,redis_data"
LOG_FILE="/var/log/docker-cleanup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Docker Cleanup Started ==="

# Record disk usage before cleanup
BEFORE=$(docker system df --format '{{.Type}}\t{{.Size}}\t{{.Reclaimable}}')
log "Disk usage before cleanup:"
log "$BEFORE"

# Step 1: Remove old stopped containers
log "--- Cleaning containers ---"
for CID in $(docker ps -a -q --filter status=exited); do
    FINISHED=$(docker inspect --format '{{.State.FinishedAt}}' "$CID" 2>/dev/null)
    if [ -n "$FINISHED" ]; then
        AGE_H=$(( ($(date +%s) - $(date -d "$FINISHED" +%s 2>/dev/null || echo 0)) / 3600 ))
        if [ "$AGE_H" -ge "$CONTAINER_MAX_AGE_HOURS" ]; then
            NAME=$(docker inspect --format '{{.Name}}' "$CID" | sed 's/^\//')
            log "  Removing container: $NAME (${AGE_H}h old)"
            docker rm "$CID" 2>/dev/null || true
        fi
    fi
done

# Step 2: Remove dangling images
log "--- Cleaning dangling images ---"
docker image prune -f 2>/dev/null

# Step 3: Remove old unused images (respecting protected patterns)
log "--- Cleaning old unused images ---"
docker image prune -a --filter "until=${IMAGE_MAX_AGE_DAYS}d" -f 2>/dev/null || true

# Step 4: Remove orphaned volumes
log "--- Cleaning orphaned volumes ---"
docker volume prune -f 2>/dev/null

# Step 5: Clean build cache
log "--- Cleaning build cache ---"
docker builder prune --filter "until=${CACHE_MAX_AGE_DAYS}d" -f 2>/dev/null

# Step 6: Clean unused networks
log "--- Cleaning unused networks ---"
docker network prune -f 2>/dev/null

# Record disk usage after cleanup
AFTER=$(docker system df --format '{{.Type}}\t{{.Size}}\t{{.Reclaimable}}')
log "Disk usage after cleanup:"
log "$AFTER"

log "=== Docker Cleanup Complete ==="
```

## Scheduling with Cron

```bash
# Run the master cleanup script daily at 2 AM
0 2 * * * /opt/scripts/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1

# Run aggressive cleanup weekly on Sundays (removes more aggressively)
0 3 * * 0 /opt/scripts/docker-cleanup.sh --aggressive >> /var/log/docker-cleanup.log 2>&1
```

## Monitoring Disk Usage with Alerts

Add a monitoring script that alerts when Docker disk usage gets too high:

```bash
#!/bin/bash
# docker-disk-monitor.sh
# Alerts when Docker disk usage exceeds the threshold

THRESHOLD_PERCENT=80
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}')

# Get the disk usage percentage for the Docker data directory
USAGE=$(df "$DOCKER_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USAGE" -ge "$THRESHOLD_PERCENT" ]; then
    echo "WARNING: Docker disk usage at ${USAGE}% (threshold: ${THRESHOLD_PERCENT}%)"
    echo "Running emergency cleanup..."

    # Run aggressive cleanup
    docker system prune -a --volumes -f

    # Alert the team
    curl -s -X POST "${SLACK_WEBHOOK}" \
        -H 'Content-type: application/json' \
        -d "{\"text\": \"Docker disk usage alert on $(hostname): ${USAGE}%. Emergency cleanup executed.\"}"
fi
```

## Summary

Automated Docker cleanup prevents disk space emergencies and keeps your infrastructure healthy. Start with the master cleanup script on a daily cron schedule. Customize the retention periods and protected resources for your environment. Add disk usage monitoring to catch situations where cleanup alone is not enough. The goal is to never think about Docker disk space again because your automation handles it.
