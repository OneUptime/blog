# How to Show Image Disk Usage with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Storage

Description: Learn how to check container image disk usage with Podman, including system-wide storage reports, per-image sizes, and identifying space-consuming images.

---

> Monitoring image disk usage prevents storage surprises and helps you maintain a lean, efficient container environment.

Container images can consume significant disk space, especially when working with multiple versions, large base images, or many projects. Podman provides several tools to monitor and analyze image storage usage. This guide shows you how to check disk usage at every level, from system-wide summaries to individual layer analysis.

---

## Quick System-Wide Disk Usage

Get an overview of all Podman storage consumption.

```bash
# Show disk usage summary

podman system df

# Sample output:
# TYPE           TOTAL   ACTIVE   SIZE     RECLAIMABLE
# Images         12      5        4.2GB    2.1GB (50%)
# Containers     5       2        120MB    80MB (66%)
# Local Volumes  3       2        500MB    200MB (40%)
```

## Detailed Disk Usage Report

Break down disk usage to see individual items.

```bash
# Show verbose disk usage with per-image details
podman system df -v

# This shows each image with:
# - Repository and tag
# - Image ID
# - Created date
# - Size
# - Shared size (layers shared with other images)
# - Unique size (layers only this image uses)
# - Number of containers using this image
```

## Checking Individual Image Sizes

View the size of specific images.

```bash
# List images sorted by size
podman images --sort size \
  --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

# Show the size of a specific image
podman images nginx:1.25 --format "{{.Size}}"

# Show image sizes in bytes in descending order
podman images --format "{{.VirtualSize}}\t{{.Repository}}:{{.Tag}}" | sort -nr
```

## Understanding Image Size Metrics

Podman reports different size metrics that are important to understand.

```bash
# Virtual size: total size of all layers
podman image inspect nginx:1.25 --format '{{.VirtualSize}}'

# Size in human-readable format from the images list
podman images nginx:1.25 --format "{{.Size}}"

# Show shared vs unique size using system df
podman system df -v 2>/dev/null | grep -A 1 "REPOSITORY"
```

## Finding the Largest Images

Identify which images consume the most disk space.

```bash
#!/bin/bash
# Find the top 10 largest images

echo "=== Top 10 Largest Images ==="
podman images --format "{{.VirtualSize}}\t{{.Repository}}:{{.Tag}}" \
  | sort -nr \
  | head -10

echo ""
echo "=== Total disk usage ==="
podman system df
```

## Analyzing Layer Sizes

Understand how much space each layer in an image consumes.

```bash
# Show the history of an image with layer sizes
podman history nginx:1.25

# Show history with human-readable sizes
podman history nginx:1.25 --format "table {{.Size}}\t{{.CreatedBy}}"

# Find the largest layers
podman history nginx:1.25 --human=false --format "{{.Size}}\t{{.CreatedBy}}" \
  | sort -nr | head -5
```

## Calculating Reclaimable Space

Determine how much space you can recover by cleaning up.

```bash
# Show reclaimable space from the system summary
podman system df

# Calculate space from dangling images
podman images --filter dangling=true --format "{{.VirtualSize}}" \
  | awk '{total += $1; count++} END {if (count) print total " bytes"; else print "No dangling images"}'

# Show unused images (not referenced by any container)
podman images --format json | jq -r '.[] |
  select(.Containers == 0) |
  "\(.Names[0] // .Id) - \(.Size)"'
```

## Monitoring Disk Usage Over Time

Set up periodic monitoring of image disk usage.

```bash
#!/bin/bash
# Log disk usage to a file for tracking over time

LOG_FILE="podman-disk-usage.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') | $(podman system df \
  --format '{{.Type}}: {{.Total}} items, {{.Size}} total, {{.Reclaimable}} reclaimable' \
  | head -1)" >> "$LOG_FILE"

# View the log
cat "$LOG_FILE"
```

## Checking Storage Driver Information

Understand your storage backend and its space usage.

```bash
# Show storage driver and configuration
podman info --format '{{.Store.GraphDriverName}}'

# Show the storage root directory
podman info --format '{{.Store.GraphRoot}}'

# Check actual disk usage of the storage directory
du -sh $(podman info --format '{{.Store.GraphRoot}}')

# Check filesystem space for the storage location
df -h $(podman info --format '{{.Store.GraphRoot}}')
```

## Cleaning Up to Reclaim Space

After identifying space-consuming images, clean up what you do not need.

```bash
# Remove dangling images to reclaim space
podman image prune

# Remove all unused images (not just dangling)
podman image prune -a

# Remove unused images older than 30 days
podman image prune -a --filter "until=720h"

# Full system cleanup including containers and volumes
podman system prune -a --volumes
```

## Summary

Podman provides comprehensive tools for monitoring image disk usage at every level. Use `podman system df` for quick overviews, `podman system df -v` for detailed breakdowns, and `podman history` for layer-level analysis. Regular monitoring and cleanup of unused images keeps your storage consumption under control and prevents disk space issues in production environments.
