# How to Remove Unused Docker Images in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Cleanup, DevOps

Description: Learn how to identify and remove unused Docker images in Portainer to free up disk space and keep your environment clean.

## Introduction

Docker images accumulate over time as you pull new versions, build images, and update containers. Unused images can consume gigabytes of disk space. Portainer provides tools to remove individual images and perform bulk cleanup of unused images.

## Prerequisites

- Portainer installed with a connected Docker environment

## Understanding Image Usage

Docker distinguishes between dangling and unused images:
- A dangling image has no tag and is not referenced by any container.
- An unused image may still have a tag, but no running or stopped container references it.
- An older image version often becomes unused only after containers have been recreated on a newer image.

## Step 1: Remove a Single Image via Portainer

1. Navigate to **Images** in Portainer.
2. Find the image to remove.
3. Click the **Remove** button (trash icon) next to the image.
4. Confirm the removal.

Portainer will refuse to remove images in use by containers (running or stopped).

## Step 2: Remove Multiple Images at Once

1. Navigate to **Images**.
2. Check the checkboxes next to images to remove.
3. Click **Remove** in the bulk action bar.

## Step 3: Remove Unused Images (Prune)

Portainer's prune feature removes all unused images at once:

1. Navigate to **Images**.
2. Click **Prune** or look for the available cleanup option.
3. Confirm the prune action.

This removes all images not referenced by any container.

## Step 4: Docker CLI Image Pruning

For more control, use the Docker CLI:

```bash
# Remove all dangling (untagged) images:

docker image prune

# Remove ALL unused images (including tagged but not used):
docker image prune -a

# Remove unused images without confirmation:
docker image prune -af

# Remove images not used for more than 24 hours:
docker image prune -a --filter "until=24h"

# Remove images with a specific label:
docker image prune -a --filter "label=environment=test"

# Remove images matching a specific repository/tag pattern:
docker images --filter=reference='myorg/*:*' -q | xargs docker rmi -f

# Remove all images (aggressive - removes everything including in-use):
# WARNING: This will break running containers if they need to restart
docker images -aq | xargs docker rmi -f
```

## Step 5: Check Disk Usage Before and After

```bash
# Check Docker disk usage:
docker system df

# Output:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          15        8         12.3GB    7.8GB (63%)
Containers      20        5         45MB      42MB (93%)
Local Volumes   10        5         2.5GB     1.2GB (48%)
Build Cache     0         0         0B        0B

# After pruning:
docker system df
# Images: reduced from 12.3GB to 4.5GB
```

## Step 6: Automated Cleanup

Schedule regular cleanup to prevent image accumulation:

```bash
#!/bin/bash
# image-cleanup.sh
# Run via cron: 0 3 * * 0 /opt/scripts/image-cleanup.sh (weekly, Sunday 3am)

LOG_FILE="/var/log/docker-cleanup.log"
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

echo "=== Docker Image Cleanup: ${TIMESTAMP} ===" >> "${LOG_FILE}"

# Record disk usage before:
BEFORE=$(docker system df | awk '$1 == "Images" {print; exit}')
echo "Before: ${BEFORE}" >> "${LOG_FILE}"

# Remove unused images older than 7 days:
docker image prune -a --filter "until=168h" --force >> "${LOG_FILE}" 2>&1

# Record disk usage after:
AFTER=$(docker system df | awk '$1 == "Images" {print; exit}')
echo "After: ${AFTER}" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

echo "Cleanup complete. See ${LOG_FILE} for details."
```

## Step 7: Full System Cleanup

For a comprehensive cleanup of unused Docker resources:

```bash
# Remove all unused Docker resources (careful!):
docker system prune

# More aggressive: also removes unused anonymous volumes:
docker system prune --volumes

# Most aggressive: removes unused containers, networks, images, build cache, and anonymous volumes:
docker system prune -a --volumes --force
```

In Portainer, you can do this per-resource type:
- **Images > Prune** - unused images
- **Containers > Remove** stopped containers
- **Volumes > Prune** - unused volumes
- **Networks > Prune** - unused networks

## Step 8: Protecting Images from Cleanup

If you want to mark images you care about, tag them clearly:

```bash
# Tag images for tracking (this does not protect them from prune):
docker tag myapp:v2.1.0 myapp:release-keep

# To protect an image from `docker image prune -a`, keep at least one
# created, stopped, or running container that references it:
docker create --name keep-image-reference myapp:v2.1.0

# Better: use a private registry for long-term image storage
# Local Docker host storage ≠ long-term image archive
```

## Checking Which Containers Use Which Images

Before removing, verify an image isn't in use:

```bash
# Find all containers using a specific image:
docker ps -aq --filter "ancestor=myapp:v2.0.0"
# Returns container IDs using this image

# If output is empty, the image is not in use

# List all images and their users:
docker images --format "{{.ID}} {{.Repository}}:{{.Tag}}" | while read id tag; do
    containers=$(docker ps -aq --filter "ancestor=${id}" | wc -l)
    if [ "$containers" -eq 0 ]; then
        echo "UNUSED: ${tag} (${id})"
    else
        echo "IN USE (${containers} containers): ${tag} (${id})"
    fi
done
```

## Conclusion

Removing unused images in Portainer and Docker CLI is essential maintenance for keeping your hosts clean and avoiding disk exhaustion. Use the prune commands for quick bulk cleanup, schedule weekly automated cleanup crons, and monitor disk usage with `docker system df`. For production environments, ensure your CI/CD pipeline cleans up old images after deploying new ones, preventing unlimited image accumulation.
