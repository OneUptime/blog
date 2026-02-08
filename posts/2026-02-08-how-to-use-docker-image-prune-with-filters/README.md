# How to Use Docker Image Prune with Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker image prune, images, cleanup, disk space, filters, maintenance

Description: Master docker image prune with filters to reclaim disk space while keeping the images you actually need.

---

Docker images pile up quickly. Every build creates new layers. Every pull brings down a full image. Over time, your disk fills with old versions, intermediate build images, and dangling layers that nothing references. On CI/CD servers, this problem is especially severe because builds run constantly and produce new images with every commit.

The `docker image prune` command reclaims this space, and its filter options let you be surgical about what gets removed. This guide covers all the filtering options with practical examples for development machines, CI servers, and production hosts.

## Understanding Image Types

Before pruning, understand what Docker considers removable:

- **Dangling images**: Images with no tag and no container reference. These are typically old build layers that were replaced by newer builds. They show up as `<none>:<none>` in `docker images`.
- **Unused images**: Images that no running or stopped container references. This includes tagged images that you pulled but are not currently using.

The default `docker image prune` only removes dangling images. The `-a` flag removes all unused images.

## Basic Prune Commands

Remove dangling images only:

```bash
# Remove images with no tag and no container reference (dangling)
docker image prune -f
```

Remove all unused images (including tagged ones that no container uses):

```bash
# Remove all images not referenced by any container
docker image prune -a -f
```

Check what counts as dangling vs unused:

```bash
# List dangling images
docker images --filter dangling=true

# List all images and their sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
```

## Filtering by Time with "until"

The `until` filter removes images older than a specified duration. This is the safest filter for automated cleanup because it preserves recent images.

Remove images created more than 7 days ago:

```bash
# Prune dangling images older than 7 days
docker image prune -f --filter "until=168h"
```

Remove all unused images older than 30 days:

```bash
# Prune all unused images older than 30 days
docker image prune -a -f --filter "until=720h"
```

Remove images created before a specific date:

```bash
# Prune images created before February 1, 2026
docker image prune -a -f --filter "until=2026-02-01T00:00:00"
```

The time is based on when the image was created (built or pulled), not when it was last used. An image pulled 60 days ago but used by a running container will not be pruned because it is not "unused."

## Filtering by Labels

Label-based filtering gives you application-level control over which images survive pruning.

### Prune Images with a Specific Label

Remove images built with a specific label:

```bash
# Prune images labeled as build artifacts
docker image prune -a -f --filter "label=stage=build"

# Prune images from a specific project
docker image prune -a -f --filter "label=project=frontend"
```

### Prune Images Without a Specific Label

Keep images with a protection label:

```bash
# Prune unused images that do NOT have the "keep" label
docker image prune -a -f --filter "label!=keep"
```

### Adding Labels to Your Builds

Set labels in your Dockerfile:

```dockerfile
# Dockerfile - Add labels for prune filtering
FROM node:20-alpine

# Label the image so prune filters can target it
LABEL project="my-app"
LABEL environment="development"
LABEL maintainer="team@example.com"

WORKDIR /app
COPY . .
RUN npm ci && npm run build

CMD ["node", "dist/server.js"]
```

Or set labels at build time without modifying the Dockerfile:

```bash
# Add labels during the build command
docker build -t my-app:v1.2.3 \
  --label "project=my-app" \
  --label "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "git-commit=$(git rev-parse --short HEAD)" \
  .
```

## Combining Filters

Use multiple filters together for precise cleanup:

```bash
# Remove development images older than 3 days
docker image prune -a -f \
  --filter "until=72h" \
  --filter "label=environment=development"

# Remove old images but keep production ones
docker image prune -a -f \
  --filter "until=168h" \
  --filter "label!=environment=production"
```

## CI/CD Cleanup Strategy

CI servers build many images and run out of disk space frequently. Here is a cleanup script tailored for CI:

```bash
#!/bin/bash
# ci-image-cleanup.sh - Aggressive image cleanup for CI/CD servers

echo "=== CI Image Cleanup ==="
echo "Disk usage before cleanup:"
docker system df

# Step 1: Remove all dangling images (these are always safe to remove)
echo ""
echo "Removing dangling images..."
docker image prune -f

# Step 2: Remove unused images older than 48 hours
# This keeps images from recent builds in case a rollback is needed
echo ""
echo "Removing unused images older than 48 hours..."
docker image prune -a -f --filter "until=48h"

# Step 3: Remove build cache older than 24 hours
echo ""
echo "Clearing old build cache..."
docker builder prune -f --filter "until=24h"

echo ""
echo "Disk usage after cleanup:"
docker system df
```

Schedule this to run between build windows:

```bash
# Run cleanup every 6 hours on the CI server
0 */6 * * * /usr/local/bin/ci-image-cleanup.sh >> /var/log/ci-cleanup.log 2>&1
```

## Development Machine Cleanup

For local development, you want to keep images you use regularly but clean up old experiments:

```bash
#!/bin/bash
# dev-cleanup.sh - Gentle cleanup for development machines

# Remove dangling images (old build layers)
docker image prune -f

# Remove unused images older than 30 days
# This preserves images you've pulled recently
docker image prune -a -f --filter "until=720h"

# Show what remains
echo ""
echo "Remaining images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}" | head -20
```

## Production Host Cleanup

On production servers, be conservative. Only remove images that are clearly old and unused:

```bash
#!/bin/bash
# production-cleanup.sh - Conservative cleanup for production

# Only remove dangling images (safest option)
docker image prune -f

# Remove unused images older than 90 days
# Keep recent images for fast rollbacks
docker image prune -a -f --filter "until=2160h"

# Log the action
echo "$(date): Image prune completed" >> /var/log/docker-maintenance.log
```

## Checking Image Sizes and Ages

Before pruning, understand what is consuming space:

```bash
# List images sorted by size, largest first
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}\t{{.CreatedSince}}" | sort -hr

# Show total image disk usage
docker system df -v | head -5
```

Find images that share layers (so removing one may not free as much space as its listed size suggests):

```bash
# Show the actual unique size per image (not shared layer size)
docker system df -v 2>/dev/null | grep -A 1000 "^Images" | head -30
```

## Prune vs Remove

`docker image prune` removes unused/dangling images. `docker rmi` removes specific images by name. Use each for its intended purpose.

Remove a specific image:

```bash
# Remove a specific image by name and tag
docker rmi my-app:v1.0.0

# Force remove even if a stopped container references it
docker rmi -f my-app:v1.0.0
```

Remove all images matching a pattern:

```bash
# Remove all versions of the my-app image
docker rmi $(docker images my-app -q) 2>/dev/null

# Remove all images from a specific registry
docker rmi $(docker images registry.example.com/* -q) 2>/dev/null
```

These targeted removals complement pruning. Use `docker rmi` for specific cleanup and `docker image prune` for broad maintenance.

## Monitoring Image Disk Usage

Track image disk usage over time to know when cleanup is needed:

```bash
#!/bin/bash
# monitor-images.sh - Log image disk usage for trend tracking

TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
TOTAL_IMAGES=$(docker images -q | wc -l | tr -d ' ')
DANGLING=$(docker images --filter dangling=true -q | wc -l | tr -d ' ')
DISK_USAGE=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1)

echo "${TIMESTAMP},${TOTAL_IMAGES},${DANGLING},${DISK_USAGE}" >> /var/log/docker-image-stats.csv
```

Run this hourly and review the CSV to identify trends:

```bash
# View the last 24 entries
tail -24 /var/log/docker-image-stats.csv
```

## What Prune Will NOT Remove

Keep these boundaries in mind:

- Images used by running containers are never pruned
- Images used by stopped containers are not pruned (unless you remove those containers first)
- Images you have explicitly tagged are not pruned by the default `docker image prune` (you need `-a`)
- Build cache is separate (use `docker builder prune` for that)

The order of cleanup matters:

```bash
# Clean up in the right order for maximum space recovery
# 1. Remove stopped containers first (releases their image references)
docker container prune -f --filter "until=168h"

# 2. Then prune images (now more images qualify as "unused")
docker image prune -a -f --filter "until=168h"

# 3. Clean up volumes
docker volume prune -f

# 4. Clean up build cache
docker builder prune -f --filter "until=72h"
```

## Summary

`docker image prune` with filters is essential for managing Docker disk usage across development, CI, and production environments. Use the `until` filter to protect recent images while cleaning up old ones. Use label filters to create categories of images with different retention policies. Always prune stopped containers before images to maximize the number of images that qualify as unused. For CI servers, run aggressive cleanup on a schedule. For production, keep 90 days of images for rollback safety. Check `docker system df` regularly to stay ahead of disk space issues.
