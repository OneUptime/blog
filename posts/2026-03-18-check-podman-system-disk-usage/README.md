# How to Check Podman System Disk Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Disk Usage, Storage Management

Description: Learn how to monitor and analyze disk usage across Podman images, containers, and volumes to keep your system storage under control.

---

> Unchecked container storage growth is one of the most common causes of disk exhaustion on container hosts, and Podman gives you the tools to catch it early.

Container images, stopped containers, and unused volumes can silently consume gigabytes of disk space over time. Podman provides the `podman system df` command to give you a clear picture of how storage is being used. This guide walks through checking disk usage, interpreting results, and setting up monitoring to prevent storage problems.

---

## Basic Disk Usage Overview

The `podman system df` command provides a summary of disk usage across all Podman objects.

```bash
# Display a summary of Podman disk usage

podman system df
```

This shows a table with categories such as Images, Containers, and Local Volumes. Each row displays the total count, active count, total size, and reclaimable space.

## Detailed Disk Usage

For a granular breakdown of individual objects, use the verbose flag.

```bash
# Display detailed disk usage for every image, container, and volume
podman system df -v
```

The verbose output lists each image with its repository, tag, size, shared size, unique size, and how many containers reference it. This helps identify which specific images or volumes are consuming the most space.

## Formatting Disk Usage Output

Use Go templates to extract specific metrics for scripting.

```bash
# Show only image disk usage in a custom format
podman system df --format '{{.Type}}\t{{.Total}}\t{{.Size}}\t{{.Reclaimable}}'

# Output disk usage as JSON for programmatic parsing
podman system df --format json

# Parse JSON output with jq to get reclaimable space
podman system df --format json | jq '.[].Reclaimable'
```

## Checking Individual Image Sizes

Inspect the size of each image on your system.

```bash
# List all images with their sizes, sorted by size
podman images --sort size --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}"

# Find the largest images
podman images --sort size --format '{{.Repository}}:{{.Tag}} - {{.Size}}' | tail -10

# Show total disk usage of all images
podman images --format json | jq '[.[].size] | add'
```

## Checking Container Disk Usage

Containers can accumulate data in their writable layers.

```bash
# Show the size of each container including its writable layer
podman ps -a --size --format "table {{.Names}}\t{{.Size}}\t{{.Status}}"

# Find containers with the largest writable layers
podman ps -a --size --format '{{.Names}}: {{.Size}}' | sort -t: -k2 -h

# Check disk usage of a specific container
podman container inspect --size --format '{{.SizeRw}}' my-container
```

## Checking Volume Disk Usage

Volumes can grow significantly, especially for databases and log storage.

```bash
# List all volumes with their driver information
podman volume ls

# Inspect a specific volume to find its mount point
podman volume inspect my-volume --format '{{.Mountpoint}}'

# Check actual disk usage of a volume mount point
du -sh $(podman volume inspect my-volume --format '{{.Mountpoint}}')

# Check disk usage for all volumes
for vol in $(podman volume ls -q); do
    MOUNT=$(podman volume inspect "$vol" --format '{{.Mountpoint}}')
    SIZE=$(du -sh "$MOUNT" 2>/dev/null | cut -f1)
    echo "$vol: $SIZE"
done
```

## Monitoring Storage Growth Over Time

Create a script that logs disk usage periodically for trend analysis.

```bash
#!/bin/bash
# podman-disk-monitor.sh - Log Podman disk usage for monitoring

LOG_FILE="/var/log/podman-disk-usage.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Collect disk usage data as JSON
DATA=$(podman system df --format json 2>/dev/null)

# Extract key metrics
IMAGES_SIZE=$(echo "$DATA" | jq -r '.[0].Size // "0"')
CONTAINERS_SIZE=$(echo "$DATA" | jq -r '.[1].Size // "0"')
VOLUMES_SIZE=$(echo "$DATA" | jq -r '.[2].Size // "0"')
RECLAIMABLE=$(echo "$DATA" | jq -r '.[0].Reclaimable // "0"')

# Log the data
echo "${TIMESTAMP} images=${IMAGES_SIZE} containers=${CONTAINERS_SIZE} volumes=${VOLUMES_SIZE} reclaimable=${RECLAIMABLE}" >> "$LOG_FILE"

echo "Disk usage logged at ${TIMESTAMP}"
```

## Setting Up Disk Usage Alerts

Configure alerts when Podman storage exceeds a threshold.

```bash
#!/bin/bash
# podman-disk-alert.sh - Alert when Podman disk usage exceeds threshold

# Set threshold as filesystem usage percentage
THRESHOLD_PERCENT=80

# Get the graph root directory
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}')

# Check available space on the filesystem containing the graph root
USED_PERCENT=$(df "$GRAPH_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USED_PERCENT" -gt "$THRESHOLD_PERCENT" ]; then
    echo "WARNING: Podman storage filesystem is ${USED_PERCENT}% full"
    echo "Graph Root: $GRAPH_ROOT"
    echo ""
    echo "Current usage breakdown:"
    podman system df
    echo ""
    echo "Consider running: podman system prune"
fi
```

## Identifying Dangling and Unused Resources

Find resources that are consuming space but are no longer needed.

```bash
# List dangling images (untagged, not referenced by any container)
podman images --filter dangling=true

# List stopped containers that can be removed
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Size}}\t{{.Status}}"

# List volumes not attached to any container
podman volume ls --filter dangling=true

# Show how much space can be reclaimed
podman system df --format '{{.Type}}: {{.Reclaimable}} reclaimable out of {{.Size}}'
```

## Summary

Regular monitoring of Podman disk usage prevents unexpected storage exhaustion and keeps your container host running smoothly. Use `podman system df` for quick overviews, the verbose flag for detailed breakdowns, and automated scripts for ongoing monitoring. Combine these checks with periodic pruning to maintain a healthy and efficient Podman environment.
