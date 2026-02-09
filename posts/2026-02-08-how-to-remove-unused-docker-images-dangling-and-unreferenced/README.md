# How to Remove Unused Docker Images (Dangling and Unreferenced)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Cleanup, Disk Space, DevOps, Docker Commands, Maintenance

Description: A practical guide to identifying and removing dangling, unreferenced, and unused Docker images to reclaim disk space.

---

Docker images pile up faster than most people realize. Every build creates new layers. Every pull downloads a new image. Rebuilding with the same tag leaves the old image hanging around without a name. Before you know it, Docker is consuming 50GB or more of your disk. Cleaning up unused images is a necessary maintenance task for any system running Docker.

This guide covers every method for removing Docker images, from targeted deletion of specific images to aggressive cleanup of everything unused.

## Understanding Image Types

Before deleting anything, it helps to understand the different categories of images on your system.

**Tagged images** have a repository name and tag like `nginx:alpine` or `myapp:v2.1`. These are images you pulled or built intentionally.

**Dangling images** show up as `<none>:<none>` in the image list. They are layers that are no longer associated with any tagged image. This typically happens when you rebuild an image with the same tag. The old layers lose their tag and become dangling.

**Unreferenced images** are tagged images that are not used by any container (running or stopped). They are valid images but nothing depends on them.

See all these categories on your system:

```bash
# Show all images including dangling ones
docker images -a

# Show only dangling images
docker images --filter "dangling=true"

# Check disk usage to see what is reclaimable
docker system df
```

## Removing a Specific Image

The simplest cleanup is removing a specific image by name, tag, or ID.

Remove individual images:

```bash
# Remove by repository and tag
docker rmi nginx:alpine

# Remove by image ID
docker rmi a1b2c3d4e5f6

# Remove by full image ID (unambiguous)
docker rmi sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

# Remove multiple images at once
docker rmi nginx:alpine python:3.12 postgres:16
```

If a container is using the image, Docker refuses to remove it. Force removal with the `-f` flag:

```bash
# Force remove an image even if containers reference it
docker rmi -f nginx:alpine
```

Be careful with force removal. It untags the image but does not delete the underlying layers if a container still references them. Stopping and removing the container first is cleaner.

## Removing All Dangling Images

Dangling images are the safest to remove because nothing references them.

Clean up all dangling images:

```bash
# Remove all dangling images
docker image prune

# Skip the confirmation prompt
docker image prune -f

# See what would be removed without actually removing
docker images --filter "dangling=true" --format "{{.ID}}\t{{.Size}}\t{{.CreatedSince}}"
```

The `docker image prune` command only removes dangling images by default. It leaves tagged images and images referenced by containers untouched.

## Removing All Unused Images

To go further and remove all images not used by any container, add the `-a` flag.

Remove all images not associated with a running or stopped container:

```bash
# Remove ALL unused images (not just dangling)
docker image prune -a

# Skip confirmation
docker image prune -a -f

# Preview what will be removed
docker image prune -a --filter "until=24h" --dry-run 2>/dev/null || \
    echo "Note: --dry-run not available, use filter to be selective"
```

This is aggressive. It removes every image that is not currently used by at least one container. If you have images you pulled for future use, they will be deleted.

## Filtering by Age

Remove only images older than a certain time period.

Clean up old images while keeping recent ones:

```bash
# Remove dangling images older than 24 hours
docker image prune --filter "until=24h"

# Remove all unused images older than 7 days
docker image prune -a --filter "until=168h"

# Remove unused images older than 30 days
docker image prune -a --filter "until=720h"

# You can also use date format
docker image prune -a --filter "until=2026-01-01T00:00:00"
```

The `until` filter is useful in CI/CD environments where you want to keep recent images for quick rollbacks but remove anything stale.

## Filtering by Label

If your images have labels, use them to control which images get pruned.

Remove images with or without specific labels:

```bash
# Remove unused images that have a specific label
docker image prune -a --filter "label=environment=staging"

# Remove unused images that do NOT have a specific label
docker image prune -a --filter "label!=keep=true"
```

This enables a "keep" pattern where you label images you want to protect:

```dockerfile
# In your Dockerfile, add a keep label
FROM python:3.12-slim
LABEL keep="true"
LABEL version="2.1"
```

Then prune everything except labeled images:

```bash
# Remove all unused images EXCEPT those labeled with keep=true
docker image prune -a --filter "label!=keep=true" -f
```

## Nuclear Option: docker system prune

When you want to clean up everything at once, not just images but also stopped containers, unused networks, and the build cache.

Clean up all unused Docker resources:

```bash
# Remove stopped containers, dangling images, unused networks, and build cache
docker system prune

# Include ALL unused images (not just dangling)
docker system prune -a

# Also remove unused volumes (careful - this deletes data!)
docker system prune -a --volumes

# Skip confirmation
docker system prune -a -f

# Prune with time filter
docker system prune -a --filter "until=168h"
```

The `--volumes` flag is dangerous. It permanently deletes data stored in Docker volumes. Only use it when you are certain no important data lives in Docker volumes.

## Scripted Cleanup

Automate image cleanup with scripts.

A cleanup script for regular maintenance:

```bash
#!/bin/bash
# docker-cleanup.sh - Automated Docker image cleanup

set -euo pipefail

echo "=== Docker Disk Usage Before Cleanup ==="
docker system df

echo ""
echo "=== Removing dangling images ==="
docker image prune -f

echo ""
echo "=== Removing unused images older than 7 days ==="
docker image prune -a -f --filter "until=168h"

echo ""
echo "=== Removing stopped containers ==="
docker container prune -f

echo ""
echo "=== Removing unused build cache ==="
docker builder prune -f --filter "until=168h"

echo ""
echo "=== Docker Disk Usage After Cleanup ==="
docker system df
```

Make it executable and schedule it:

```bash
# Make the script executable
chmod +x docker-cleanup.sh

# Run it manually
./docker-cleanup.sh

# Schedule it as a daily cron job
echo "0 2 * * * /path/to/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1" | crontab -
```

## Removing Images by Pattern

Remove images matching a specific pattern using shell commands.

Delete images matching a repository pattern:

```bash
# Remove all images from a specific repository
docker images "myapp" -q | xargs -r docker rmi

# Remove all images matching a wildcard pattern
docker images --format "{{.Repository}}:{{.Tag}}" | grep "^staging-" | xargs -r docker rmi

# Remove all images with a specific tag across all repositories
docker images --format "{{.Repository}}:{{.Tag}}" | grep ":dev$" | xargs -r docker rmi

# Remove all images except those tagged "latest" or "production"
docker images --format "{{.Repository}}:{{.Tag}}" | \
    grep -v -E ":(latest|production)$" | \
    grep -v "<none>" | \
    xargs -r docker rmi 2>/dev/null
```

## Removing Build Cache

The Docker build cache can grow large, especially with BuildKit.

Clean up the build cache:

```bash
# Show build cache usage
docker builder prune --dry-run 2>/dev/null || docker buildx du

# Remove all build cache
docker builder prune -f

# Remove build cache older than 7 days
docker builder prune -f --filter "until=168h"

# Remove ALL build cache (including named caches)
docker builder prune -a -f
```

## Preventing Image Accumulation

A few practices help prevent images from piling up in the first place.

Configure Docker to garbage-collect automatically by setting up a cron job or using Docker Desktop's built-in cleanup features.

Use specific tags instead of `latest` to make it easier to identify and remove old versions:

```bash
# Pull with specific version tags
docker pull nginx:1.25.4
# Instead of
docker pull nginx:latest
```

In CI/CD pipelines, clean up after each build:

```yaml
# GitHub Actions - clean up after build
- name: Clean up Docker images
  if: always()
  run: docker image prune -f
```

## Checking What Would Be Removed

Before running destructive commands, preview what will be affected.

Preview cleanup impact:

```bash
# See all dangling images and their sizes
docker images --filter "dangling=true" --format "{{.ID}}\t{{.Size}}\t{{.CreatedSince}}"

# Count images and total size that would be pruned
echo "Dangling images:"
docker images --filter "dangling=true" -q | wc -l

echo "Total unused images:"
docker images --format "{{.Repository}}:{{.Tag}}" | wc -l

# Check which images are actually in use
echo "Images in use by containers:"
docker ps -a --format "{{.Image}}" | sort -u
```

## Summary

Start with `docker image prune` to remove dangling images safely. Use `docker image prune -a` to remove all unused images. Add `--filter "until=168h"` to keep recent images around. For a complete cleanup, use `docker system prune -a`, but think twice before adding `--volumes`. Automate cleanup with a cron job to prevent disk space from growing unchecked. Label important images and use the label filter to protect them during cleanup operations.
