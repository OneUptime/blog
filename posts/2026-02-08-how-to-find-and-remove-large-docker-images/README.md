# How to Find and Remove Large Docker Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Disk Space, Cleanup, DevOps, Storage Management

Description: Learn how to identify oversized Docker images consuming disk space and safely remove them to reclaim storage on your system.

---

Docker images accumulate fast. After weeks of development, pulling base images, building variants, and testing different tags, your disk fills up with images you no longer need. Some of these images are surprisingly large, consuming gigabytes of precious storage.

This guide shows you how to find the biggest images on your system, understand why they are large, and remove them safely.

## Checking Overall Docker Disk Usage

Before hunting for large images specifically, get an overview of what Docker is consuming on your system.

```bash
# Show a summary of Docker disk usage
docker system df
```

This outputs a table like:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        12        18.73GB   14.21GB (75%)
Containers      15        3         1.234GB   892.1MB (72%)
Local Volumes   8         4         3.456GB   1.2GB (34%)
Build Cache     120       0         5.678GB   5.678GB (100%)
```

For a detailed breakdown per image:

```bash
# Show detailed disk usage including individual image sizes
docker system df -v
```

## Listing Images Sorted by Size

The default `docker images` output shows sizes, but sorting requires a bit of formatting work.

```bash
# List all images sorted by size (largest first)
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}\t{{.ID}}" | sort -rh
```

The `-rh` flag on `sort` performs a reverse human-readable sort, putting the largest images at the top.

For a cleaner output with consistent formatting:

```bash
# List images with size in megabytes for easier sorting
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | sort -k2 -rh | head -20
```

## Identifying the Largest Images

Let us build a more comprehensive view that includes creation dates to help decide what to remove.

```bash
# Show the top 10 largest images with creation dates
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}\t{{.ID}}" | head -20
```

You can also use a threshold approach to find images above a certain size:

```bash
# Find images larger than 1GB using docker inspect
docker images --format '{{.ID}} {{.Repository}}:{{.Tag}}' | while read id name; do
    size=$(docker inspect --format '{{.Size}}' "$id" 2>/dev/null)
    if [ -n "$size" ] && [ "$size" -gt 1073741824 ]; then
        size_mb=$((size / 1048576))
        echo "${size_mb}MB  $name"
    fi
done | sort -rn
```

## Understanding Why Images Are Large

Before removing images, it helps to understand what makes them big. Large images typically result from:

1. Using a full OS base image instead of a slim or Alpine variant
2. Including build tools and development dependencies in the final image
3. Not cleaning up package manager caches
4. Copying unnecessary files into the image

Check the layers of a large image to see where the size comes from:

```bash
# Show layer sizes for a specific image
docker history --format "table {{.CreatedBy}}\t{{.Size}}" nginx:latest
```

## Removing Specific Large Images

Once you have identified the offenders, remove them by name or ID.

```bash
# Remove a specific image by name and tag
docker rmi node:18-bullseye

# Remove by image ID
docker rmi abc123def456

# Force remove an image even if containers reference it
docker rmi -f abc123def456
```

## Removing Multiple Images at Once

When you have several images to remove, batch operations save time.

```bash
# Remove all images matching a pattern (e.g., all node images)
docker images --format '{{.Repository}}:{{.Tag}}' | grep "^node:" | xargs docker rmi

# Remove all images older than a specific date
docker images --format '{{.ID}} {{.CreatedAt}}' | while read id date; do
    if [[ "$date" < "2025-01-01" ]]; then
        docker rmi "$id" 2>/dev/null
    fi
done
```

## Removing Dangling Images

Dangling images are layers that no longer have a tag associated with them. They appear as `<none>:<none>` in the image list and often consume significant space.

```bash
# List dangling images
docker images -f "dangling=true"

# Remove all dangling images
docker image prune -f
```

The `-f` flag skips the confirmation prompt.

## Removing All Unused Images

If you want to reclaim maximum space, remove all images not currently used by a running container.

```bash
# Remove all unused images (not just dangling ones)
docker image prune -a -f
```

Be careful with this command. It removes every image that does not have a running container associated with it. This includes images you might want to use again soon, which will need to be re-pulled.

## A Smarter Cleanup Script

Here is a script that removes large, unused images while preserving recently pulled ones.

```bash
#!/bin/bash
# smart-cleanup.sh - Remove large unused images older than N days
# Usage: ./smart-cleanup.sh [days] [min-size-mb]
# Defaults: 30 days, 500MB minimum

DAYS=${1:-30}
MIN_SIZE_MB=${2:-500}
MIN_SIZE_BYTES=$((MIN_SIZE_MB * 1048576))
CUTOFF_DATE=$(date -d "-${DAYS} days" +%s 2>/dev/null || date -v-${DAYS}d +%s)

echo "Finding unused images larger than ${MIN_SIZE_MB}MB and older than ${DAYS} days..."

# Get IDs of images used by running containers
ACTIVE_IMAGES=$(docker ps --format '{{.Image}}' | sort -u)

docker images --format '{{.ID}}\t{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}' | while IFS=$'\t' read -r id name created; do
    # Skip if image is actively used
    if echo "$ACTIVE_IMAGES" | grep -q "${name}"; then
        continue
    fi

    # Check image size
    size=$(docker inspect --format '{{.Size}}' "$id" 2>/dev/null)
    if [ -z "$size" ] || [ "$size" -lt "$MIN_SIZE_BYTES" ]; then
        continue
    fi

    size_mb=$((size / 1048576))
    echo "Removing: $name (${size_mb}MB, created: $created)"
    docker rmi "$id" 2>/dev/null
done

echo "Cleanup complete."
```

## Using Docker Image Prune with Filters

Docker's built-in prune command supports filters that give you more control.

```bash
# Remove unused images created more than 24 hours ago
docker image prune -a --filter "until=24h" -f

# Remove unused images created more than 7 days ago
docker image prune -a --filter "until=168h" -f

# Remove unused images with a specific label
docker image prune -a --filter "label=environment=dev" -f
```

## Preventing Large Images in the First Place

The best strategy is to keep images small from the start. Use multi-stage builds to separate build dependencies from runtime.

```dockerfile
# Multi-stage build example - keeps final image small
# Stage 1: Build stage with all development dependencies
FROM node:20-bullseye AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production stage with only runtime dependencies
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

The builder stage might produce a 1.5GB image, but the final image could be under 200MB.

## Monitoring Disk Usage Over Time

Set up a cron job to alert you when Docker disk usage gets high.

```bash
# Add to crontab: check Docker disk usage daily
# crontab -e
# 0 9 * * * /path/to/check-docker-disk.sh

#!/bin/bash
# check-docker-disk.sh - Alert when Docker images exceed a threshold
THRESHOLD_GB=20
CURRENT=$(docker system df --format '{{.Size}}' | head -1 | sed 's/GB//')

if (( $(echo "$CURRENT > $THRESHOLD_GB" | bc -l) )); then
    echo "WARNING: Docker images using ${CURRENT}GB (threshold: ${THRESHOLD_GB}GB)"
    # Add your notification method here (email, Slack, etc.)
fi
```

## Conclusion

Large Docker images waste disk space, slow down pulls and pushes, and increase deployment times. Regular cleanup keeps your system healthy. Start with `docker system df` to understand the scope of the problem. Use `docker images` with sorting to identify the biggest offenders. Remove them selectively with `docker rmi` or broadly with `docker image prune`.

Build lean images from the start using multi-stage builds and Alpine base images. Automate periodic cleanup to prevent disk space issues from surprising you. For more cleanup strategies, check out our post on [Docker image pruning strategies](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-image-pruning-strategies/view).
