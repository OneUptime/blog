# How to Remove All Unused Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Cleanup, Storage

Description: Learn how to identify and remove all unused container images with Podman to reclaim disk space and keep your image store clean.

---

> Regularly removing unused images prevents disk space from filling up and keeps your container environment lean and manageable.

Unused container images accumulate quickly, especially on build servers and development machines. Podman provides straightforward commands to identify and remove images that are not referenced by any container. This guide shows you how to clean up unused images safely and effectively.

---

## What Are Unused Images

An unused image is one that is not referenced by any container, whether running or stopped.

```bash
# See which image IDs are actively used by containers

podman ps -a --no-trunc --format "{{.ImageID}}" | sort -u

# Compare with all local image IDs, including dangling images
podman images -a --no-trunc --format "{{.Id}}" | sort

# Images in the second list but not the first are candidates for removal
```

## Removing All Unused Images

The `podman image prune -a` command removes all images not used by at least one container.

```bash
# Remove all unused images (will prompt for confirmation)
podman image prune -a

# Remove all unused images without prompting
podman image prune -af

# List unused images before actually removing them
podman images -a --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Containers}}" | awk '$3 == "0" { print $1, $2 }'
```

## Checking Space Before and After

Monitor the impact of your cleanup.

```bash
# Check current disk usage
echo "=== Before Cleanup ==="
podman system df

# Remove unused images
podman image prune -af

# Check disk usage after cleanup
echo "=== After Cleanup ==="
podman system df
```

## Filtering Unused Images by Age

Remove only unused images older than a specific time period.

```bash
# Remove unused images older than 24 hours
podman image prune -a --filter "until=24h"

# Remove unused images older than 7 days
podman image prune -a --filter "until=168h"

# Remove unused images older than 30 days
podman image prune -a --filter "until=720h"
```

## Filtering by Label

Remove unused images that match specific label criteria.

```bash
# Remove unused images with a specific label
podman image prune -a --filter "label=environment=development"

# Remove unused images with a specific maintainer
podman image prune -a --filter "label=maintainer=devteam@example.com"

# Combine age and label filters
podman image prune -a \
  --filter "until=168h" \
  --filter "label=environment=staging"
```

## Using System Prune for Broader Cleanup

`podman system prune` removes unused images along with other unused resources.

```bash
# Remove stopped containers, unused networks, dangling images, and dangling build cache
podman system prune

# Remove ALL unused resources including volumes
podman system prune -a --volumes

# Force prune without confirmation
podman system prune -af

# Prune with age filter
podman system prune -a --filter "until=168h"
```

## Keeping Specific Images During Cleanup

Ensure important images are not removed during cleanup.

```bash
#!/bin/bash
# Clean up unused images while preserving a whitelist

WHITELIST=("nginx:1.25" "alpine:3.19" "postgres:16" "redis:7")

echo "Creating anchor containers for whitelisted images..."
for IMG in "${WHITELIST[@]}"; do
  SAFE_NAME=$(echo "$IMG" | tr ':/' '-')
  # Create a stopped container to anchor the image
  podman create --name "anchor-${SAFE_NAME}" "$IMG" true 2>/dev/null
done

# Now prune unused images - whitelisted ones are protected
echo "Pruning unused images..."
podman image prune -af

# Remove the anchor containers
echo "Cleaning up anchor containers..."
for IMG in "${WHITELIST[@]}"; do
  SAFE_NAME=$(echo "$IMG" | tr ':/' '-')
  podman rm "anchor-${SAFE_NAME}" 2>/dev/null
done

echo "Done. Remaining images:"
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
```

## Automating Cleanup with a Cron Job

Schedule regular cleanup to prevent disk space issues.

```bash
# Create a cleanup script
cat > ~/podman-cleanup.sh << 'SCRIPT'
#!/bin/bash
# Automated Podman image cleanup

LOG_FILE=~/podman-cleanup.log
echo "$(date): Starting cleanup" >> "$LOG_FILE"

# Record space before
BEFORE=$(podman system df --format '{{.Size}}' | head -1)

# Remove unused images older than 7 days
podman image prune -af --filter "until=168h" >> "$LOG_FILE" 2>&1

# Record space after
AFTER=$(podman system df --format '{{.Size}}' | head -1)

echo "$(date): Before: ${BEFORE}, After: ${AFTER}" >> "$LOG_FILE"
SCRIPT

chmod +x ~/podman-cleanup.sh

# Add to crontab to run weekly on Sunday at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * 0 $HOME/podman-cleanup.sh") | crontab -
```

## Previewing What Will Be Removed

Always check before removing in production environments.

```bash
# List all unused images without removing them
podman images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}" | while read -r LINE; do
  IMG_ID=$(echo "$LINE" | awk '{print $2}')
  CONTAINERS=$(podman ps -a --filter ancestor="$IMG_ID" -q 2>/dev/null | wc -l)
  if [ "$CONTAINERS" -eq 0 ]; then
    echo "UNUSED: $LINE"
  fi
done
```

## Summary

Removing unused images with `podman image prune -a` is the most effective way to reclaim disk space in your container environment. Use time-based filters to remove only older images, protect important images by ensuring they have associated containers, and automate cleanup on a schedule. Combined with `podman system prune`, you can maintain a clean and efficient container storage without manual intervention.
