# How to Remove All Unused Volumes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage, Cleanup

Description: Learn how to use podman volume prune to remove all unused volumes at once, freeing disk space from orphaned container storage.

---

> The podman volume prune command removes all volumes not currently mounted by any container, making it the fastest way to reclaim wasted disk space.

As you create and remove containers over time, volumes can become orphaned. They consume disk space but serve no purpose. The `podman volume prune` command removes all these unused volumes in one step. This guide covers how to use it safely.

---

## Basic Prune

```bash
# Remove all unused volumes

podman volume prune
```

Podman asks for confirmation before proceeding:

```text
WARNING! This will remove all not currently used volumes.
Are you sure you want to continue? [y/N] y
```

## Skip Confirmation

In scripts, skip the interactive prompt:

```bash
# Prune without confirmation
podman volume prune --force
```

## Check What Will Be Removed

Before pruning, see which volumes are unused:

```bash
# List volumes not attached to any container
podman volume list --filter dangling=true

# Check volume disk usage details
podman system df -v | grep -A 999 "Local Volumes"
```

## Filter-Based Pruning

Use filters to selectively prune volumes:

```bash
# Only prune volumes with a specific label
podman volume prune --filter label=env=test --force

# Only prune volumes without a specific label
podman volume prune --filter label!=keep=true --force
```

## Protecting Important Volumes

Use labels to mark volumes that should not be pruned:

```bash
# Create volumes with a protection label
podman volume create --label keep=true production-db
podman volume create --label keep=true production-config

# Create temporary volumes without the label
podman volume create temp-cache
podman volume create test-data

# Prune only volumes without the keep=true label
podman volume prune --filter label!=keep=true --force

# Or use a script if you want to print each decision:

#!/bin/bash
# selective-prune.sh - Prune only volumes without the 'keep' label

podman volume list --filter dangling=true --format '{{.Name}}' | while read -r VOL; do
    KEEP=$(podman volume inspect "${VOL}" --format '{{index .Labels "keep"}}' 2>/dev/null)
    if [ "${KEEP}" != "true" ]; then
        echo "Removing: ${VOL}"
        podman volume rm "${VOL}"
    else
        echo "Keeping: ${VOL} (labeled keep=true)"
    fi
done
```

## Combining with System Prune

`podman system prune` also removes unused volumes when given the `--volumes` flag:

```bash
# Remove unused containers, images, AND volumes
podman system prune --volumes --force

# Remove everything including all unused images
podman system prune --all --volumes --force
```

## Disk Space Recovery

```bash
# Check disk usage before prune
echo "Before prune:"
podman system df

# Prune unused volumes
podman volume prune --force

# Check disk usage after prune
echo "After prune:"
podman system df
```

## Automated Cleanup Schedule

Set up periodic volume cleanup:

```bash
#!/bin/bash
# cleanup-volumes.sh - Run as a cron job or systemd timer

LOG_FILE="/var/log/podman-volume-cleanup.log"

echo "=== Volume Cleanup: $(date) ===" >> "${LOG_FILE}"

# Count volumes before cleanup
BEFORE=$(podman volume list --format '{{.Name}}' | wc -l)

# Prune unused volumes
PRUNED=$(podman volume prune --force 2>&1)
echo "${PRUNED}" >> "${LOG_FILE}"

# Count volumes after cleanup
AFTER=$(podman volume list --format '{{.Name}}' | wc -l)
REMOVED=$((BEFORE - AFTER))

echo "Removed ${REMOVED} unused volumes." >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"
```

Add to crontab:

```bash
# Run weekly volume cleanup
# crontab -e
0 2 * * 0 /path/to/cleanup-volumes.sh
```

## Dry Run Approach

Podman does not have a built-in dry-run for volume prune, but you can simulate it:

```bash
# Show what would be pruned without actually removing anything
echo "The following unused volumes would be removed:"
podman volume list --filter dangling=true --format '{{.Name}}'

TOTAL=$(podman volume list --filter dangling=true --format '{{.Name}}' | wc -l)
echo ""
echo "Total: ${TOTAL} volumes"
echo ""
echo "Run 'podman volume prune --force' to remove them."
```

## Emergency Recovery

If you accidentally pruned a needed volume, the data is gone. To prevent this:

```bash
# Before pruning, back up all volumes
#!/bin/bash
BACKUP_DIR="/backups/volumes/$(date +%Y%m%d)"
mkdir -p "${BACKUP_DIR}"

podman volume list --format '{{.Name}}' | while read -r VOL; do
    MOUNTPOINT=$(podman volume inspect "${VOL}" --format '{{.Mountpoint}}')
    echo "Backing up ${VOL}..."
    tar czf "${BACKUP_DIR}/${VOL}.tar.gz" -C "${MOUNTPOINT}" . 2>/dev/null
done

echo "Backups saved to ${BACKUP_DIR}"
echo "Safe to prune now."
```

## Summary

Use `podman volume prune --force` to remove all volumes not currently attached to any container. Protect important volumes with labels and use selective cleanup scripts when needed. Always check what will be removed before pruning, and consider backing up volume data if any of it might be needed later.
