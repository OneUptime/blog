# How to Identify and Clean Up Unused Volumes in Portainer - Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Cleanup, DevOps

Description: Learn how to identify unused Docker volumes in Portainer and safely clean them up to recover disk space.

## Introduction

Unused volumes accumulate when containers are removed without their volumes, when stacks are deleted without cleaning up storage, or during development iterations. These orphaned volumes can consume significant disk space. Portainer and Docker CLI provide tools to identify and remove them safely.

## Prerequisites

- Portainer installed with a connected Docker environment

## Understanding Unused Volumes

A volume is "unused" when no containers (running or stopped) reference it. This happens when:

1. Container removed but volume wasn't (default behavior - volumes persist).
2. Compose project brought down without `docker compose down --volumes`.
3. Named volume was created but never assigned to a container.
4. Container recreated with a different volume name.

## Step 1: Identify Unused Volumes via Portainer

1. Navigate to **Volumes** in Portainer.
2. Look for Portainer's **unused** label/status in the volumes list.
3. If a volume is marked **external**, verify it with the Docker CLI before deleting it because Portainer may have limited visibility into its usage.

## Step 2: Identify Unused Volumes via CLI

```bash
# List all volumes:

docker volume ls

# Filter to show only unused volumes:
# (volumes not referenced by any container)
docker volume ls -f dangling=true

# More detailed view with container references:
docker volume ls --format "{{.Name}}" | while read -r volume; do
    container_count=$(docker ps -aq --filter "volume=${volume}" | wc -l)

    if [ "$container_count" -eq 0 ]; then
        size=$(docker run --rm -v "${volume}:/vol:ro" alpine du -sh /vol 2>/dev/null | cut -f1)
        echo "UNUSED: ${volume} (${size:-unknown})"
    else
        echo "IN USE: ${volume} (${container_count} containers)"
    fi
done
```

## Step 3: Check Volume Contents Before Removal

Before removing, check if there's important data:

```bash
#!/bin/bash
# audit-unused-volumes.sh
# Shows details of unused volumes before cleanup

echo "=== Unused Volume Audit ==="
echo ""

# Get all unused volumes
UNUSED_VOLUMES=$(docker volume ls -f dangling=true -q)

if [ -z "${UNUSED_VOLUMES}" ]; then
    echo "No unused volumes found."
    exit 0
fi

TOTAL_SIZE=0

for volume in ${UNUSED_VOLUMES}; do
    # Get volume size
    SIZE=$(docker run --rm -v "${volume}:/vol" alpine du -sh /vol 2>/dev/null | cut -f1)

    # Get volume creation date
    CREATED=$(docker volume inspect "${volume}" --format '{{.CreatedAt}}')

    # Get volume labels
    LABELS=$(docker volume inspect "${volume}" --format '{{json .Labels}}')

    # List top-level files
    FILES=$(docker run --rm -v "${volume}:/vol" alpine ls /vol 2>/dev/null | head -5 | tr '\n' ' ')

    echo "Volume: ${volume}"
    echo "  Created: ${CREATED}"
    echo "  Size: ${SIZE}"
    echo "  Labels: ${LABELS}"
    echo "  Contents: ${FILES}"
    echo ""
done

echo "Run 'docker volume prune --all' to remove all unused local volumes."
echo "Run 'docker volume prune' to remove unused anonymous local volumes only."
echo "Run 'docker volume rm <name>' to remove specific volumes."
```

## Step 4: Remove Unused Volumes via Portainer

### Remove Individual Unused Volumes

1. Navigate to **Volumes** in Portainer.
2. Tick the checkbox next to an unused volume and click **Remove**.
3. Confirm deletion.

### Bulk Remove Selected Volumes

1. Navigate to **Volumes** in Portainer.
2. If your Portainer version allows selecting multiple volumes, select the unused volumes you want to remove.
3. Click **Remove** and confirm.

## Step 5: Remove via Docker CLI

```bash
# Remove unused anonymous local volumes only:
docker volume prune

# Remove all unused local volumes, including named volumes (API 1.42+):
docker volume prune --all

# With confirmation bypass:
docker volume prune --all --force

# Remove unused local volumes by label (e.g., test volumes):
docker volume prune --all --filter "label=environment=test" --force

# Docker volume prune does not support age-based filters.
# Use a script like the one in Step 7 for age-based cleanup.

# Remove specific volumes:
docker volume rm old_app_data old_cache_data
```

## Step 6: Find and Remove Development Volumes

Development environments generate many temporary volumes:

```bash
#!/bin/bash
# cleanup-dev-volumes.sh
# Remove unused volumes from development/test environments

# Pattern 1: Remove unused volumes with test/dev labels
docker volume prune --all --filter "label=environment=test" --force
docker volume prune --all --filter "label=environment=development" --force

# Pattern 2: Remove unused volumes matching naming patterns
docker volume ls -q --filter "dangling=true" | grep -E "_test_|_dev_|_tmp_" | \
    while read -r vol; do
        echo "Removing: ${vol}"
        docker volume rm "${vol}"
    done
```

## Step 7: Automated Cleanup with Safety Checks

```bash
#!/bin/bash
# safe-volume-cleanup.sh
# Removes unused volumes with age checks and logging

SAFE_MIN_AGE_DAYS="${1:-7}"    # Don't remove volumes newer than 7 days
LOG_FILE="/var/log/volume-cleanup.log"

echo "=== Volume Cleanup: $(date) ===" >> "${LOG_FILE}"

# Get dangling volumes
for volume in $(docker volume ls -f dangling=true -q); do
    # Get creation date (Docker volume timestamps in RFC3339 format)
    CREATED_AT=$(docker volume inspect "${volume}" --format '{{.CreatedAt}}')
    NORMALIZED_CREATED_AT=$(printf '%s\n' "${CREATED_AT}" | sed -E 's/\.[0-9]+Z$/Z/')

    # Calculate age in days (simplified - uses date command)
    CREATED_EPOCH=$(date -d "${NORMALIZED_CREATED_AT}" +%s 2>/dev/null || date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "${NORMALIZED_CREATED_AT}" "+%s" 2>/dev/null)

    if [ -z "${CREATED_EPOCH}" ]; then
        echo "SKIP (unable to parse creation time): ${volume}" >> "${LOG_FILE}"
        continue
    fi

    NOW_EPOCH=$(date +%s)
    AGE_DAYS=$(( (NOW_EPOCH - CREATED_EPOCH) / 86400 ))

    if [ "${AGE_DAYS}" -lt "${SAFE_MIN_AGE_DAYS}" ]; then
        echo "SKIP (too new, ${AGE_DAYS}d): ${volume}" >> "${LOG_FILE}"
        continue
    fi

    # Get size for logging
    SIZE=$(docker run --rm -v "${volume}:/vol:ro" alpine du -sh /vol 2>/dev/null | cut -f1)

    echo "REMOVING (${AGE_DAYS}d old, ${SIZE}): ${volume}" >> "${LOG_FILE}"
    docker volume rm "${volume}" >> "${LOG_FILE}" 2>&1
done

echo "Cleanup complete." >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"
```

## Step 8: Monitor Volume Disk Usage

Prevent disk exhaustion by monitoring volume usage:

```bash
#!/bin/bash
# monitor-volume-usage.sh
# Reports estimated total volume usage and lists the largest volumes

# Estimated total usage across all volumes
TOTAL_KB=$(docker volume ls -q | while read -r vol; do
    docker run --rm -v "${vol}:/vol:ro" alpine du -sk /vol 2>/dev/null | awk '{print $1}'
done | awk '{sum+=$1} END{print sum+0}')
echo "Estimated total volume usage: $(( TOTAL_KB / 1024 ))MB"

# Per-volume breakdown:
echo ""
echo "Top 10 volumes by size:"
docker volume ls -q | while read -r vol; do
    size=$(docker run --rm -v "${vol}:/vol:ro" alpine du -sk /vol 2>/dev/null | awk '{print $1}')
    echo "${size:-0} ${vol}"
done | sort -rn | head -10 | while read -r size vol; do
    echo "  $(( size / 1024 ))MB: ${vol}"
done
```

## Conclusion

Keeping Docker volumes clean requires regular auditing and pruning. Use `docker volume prune` for quick cleanup of unused anonymous local volumes, or `docker volume prune --all` to include unused named local volumes. Check volume contents before mass deletion. For safe automated cleanup, implement age checks, record size information, and label volumes by environment (test, dev, production) to enable targeted cleanup. In production, implement a process to review unused volumes before removal to avoid data loss.
