# How to Prune All Unused Resources with podman system prune

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage Management, Cleanup

Description: Learn how to use podman system prune to reclaim disk space by removing unused containers, images, volumes, and build cache in one command.

---

> A single prune command can reclaim gigabytes of wasted disk space by cleaning up the container resources you have forgotten about.

Over time, Podman environments accumulate stopped containers and pods, dangling images, unused volumes, and stale build cache. These unused resources silently consume disk space and can eventually fill up your filesystem. The `podman system prune` command provides a comprehensive cleanup mechanism that removes unused resources in one operation.

---

## Basic System Prune

The default prune command removes stopped containers, stopped pods, unused networks, dangling images, and dangling build cache.

```bash
# Prune unused resources (will prompt for confirmation)

podman system prune

# Skip the confirmation prompt with the force flag
podman system prune -f
```

By default, this does not remove unused volumes or non-dangling images. It targets only resources that are clearly no longer in use.

## Pruning Everything Including Volumes

To perform a more aggressive cleanup that includes volumes, add the `--volumes` flag.

```bash
# Prune all unused resources including volumes
podman system prune --volumes -f

# WARNING: This removes unused volumes that may contain data
# Always verify what will be removed before running this in production
```

## Pruning All Unused Images

By default, prune only removes dangling images (those without tags). To remove all images not associated with any container, use the `--all` flag.

```bash
# Remove all unused images, not just dangling ones
podman system prune --all -f

# Combine with volumes for maximum cleanup
podman system prune --all --volumes -f
```

## Understanding What Gets Pruned

Before running prune, understand what each category includes.

```bash
# Check what resources exist before pruning
echo "=== Stopped Containers ==="
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "=== Dangling Images ==="
podman images --filter dangling=true

echo ""
echo "=== All Unused Images ==="
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}"

echo ""
echo "=== Dangling Volumes ==="
podman volume ls --filter dangling=true

echo ""
echo "=== Current Disk Usage ==="
podman system df
```

## Selective Pruning

Instead of pruning everything at once, you can prune individual resource types.

```bash
# Prune only stopped containers
podman container prune -f

# Prune only dangling images
podman image prune -f

# Prune all unused images (not just dangling)
podman image prune --all -f

# Prune only unused volumes
podman volume prune -f

# Prune only unused networks
podman network prune -f
```

## Filtering What Gets Pruned

Use filters to control which resources are removed during pruning.

```bash
# Prune containers stopped more than 24 hours ago
podman container prune --filter until=24h -f

# Prune images created more than 48 hours ago
podman image prune --filter until=48h -f

# Prune images without a specific label
podman image prune --filter label!=keep=true -f
```

## Dry Run Before Pruning

Podman does not have a built-in dry-run mode for prune, but you can preview what would be removed.

```bash
#!/bin/bash
# podman-prune-preview.sh - Preview what a system prune would remove

echo "=== Resources That Would Be Pruned ==="
echo ""

# Stopped containers
CONTAINERS=$(podman ps -a --filter status=exited -q | wc -l | tr -d ' ')
echo "Stopped containers: $CONTAINERS"

# Dangling images
DANGLING=$(podman images --filter dangling=true -q | wc -l | tr -d ' ')
echo "Dangling images: $DANGLING"

# Unused volumes (only removed by system prune when --volumes is used)
VOLUMES=$(podman volume ls --filter dangling=true -q | wc -l | tr -d ' ')
echo "Unused volumes: $VOLUMES"

# Show reclaimable space
echo ""
echo "=== Reclaimable Space ==="
podman system df --format '{{.Type}}: {{.Reclaimable}} reclaimable'
```

## Automated Cleanup with Cron

Schedule regular pruning to keep disk usage in check.

```bash
# Create a cleanup script
cat > /usr/local/bin/podman-auto-prune.sh << 'SCRIPT'
#!/bin/bash
# Automated Podman cleanup - runs via cron
LOG="/var/log/podman-prune.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[$TIMESTAMP] Starting Podman prune" >> "$LOG"

# Record space before prune
BEFORE=$(df -h / | tail -1 | awk '{print $4}')

# Run prune (exclude volumes for safety)
podman system prune -f >> "$LOG" 2>&1

# Record space after prune
AFTER=$(df -h / | tail -1 | awk '{print $4}')

echo "[$TIMESTAMP] Disk free - Before: $BEFORE, After: $AFTER" >> "$LOG"
SCRIPT

# Make the script executable
chmod +x /usr/local/bin/podman-auto-prune.sh

# Add a daily cron job (runs at 2 AM)
echo "0 2 * * * /usr/local/bin/podman-auto-prune.sh" | crontab -
```

## Safe Pruning in Production

In production environments, take extra precautions before pruning.

```bash
#!/bin/bash
# safe-prune.sh - Production-safe Podman cleanup

# Only prune if disk usage exceeds threshold
THRESHOLD=80
USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USAGE" -lt "$THRESHOLD" ]; then
    echo "Disk usage at ${USAGE}% - below threshold, skipping prune"
    exit 0
fi

echo "Disk usage at ${USAGE}% - exceeds ${THRESHOLD}% threshold"

# Remove only stopped containers older than 7 days
podman container prune --filter until=168h -f

# Remove only dangling images (safe, these have no tags)
podman image prune -f

# Do NOT prune volumes in production without explicit review
echo "Skipping volume prune in production - review manually"
podman volume ls --filter dangling=true
```

## Summary

The `podman system prune` command is your go-to tool for reclaiming disk space from unused container resources. Use the basic form for safe everyday cleanup, add `--all` and `--volumes` for thorough cleanup, and leverage filters for fine-grained control. In production environments, prefer selective pruning with filters and schedule automated cleanup with cron to prevent storage issues before they affect your services.
