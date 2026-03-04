# How to Clean Up Orphaned Docker Volumes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Cleanup, Maintenance, Disk Space, DevOps

Description: Learn how to find, analyze, and safely remove orphaned Docker volumes that waste disk space on your servers.

---

Orphaned Docker volumes are volumes that exist on disk but are no longer attached to any container. They accumulate silently over time as you create and destroy containers, especially during development. On a busy CI/CD server or a developer workstation, orphaned volumes can eat gigabytes of disk space without you noticing until your disk fills up and things start breaking.

This guide shows you how to find orphaned volumes, understand what is in them before deleting, and set up automated cleanup routines.

## How Volumes Become Orphaned

Volumes become orphaned in several common scenarios:

1. You stop and remove a container with `docker rm` but forget the `-v` flag
2. Docker Compose creates anonymous volumes that persist after `docker compose down`
3. A build process creates temporary volumes that never get cleaned up
4. You recreate services in Compose, which creates new anonymous volumes while old ones stick around

Here is a quick demonstration:

```bash
# Create a container with an anonymous volume, then remove the container without -v
docker run -d --name temp_app -v /data alpine sleep 3600
docker stop temp_app
docker rm temp_app
# The anonymous volume for /data still exists on disk
```

## Finding Orphaned Volumes

Docker provides a built-in filter to find volumes not referenced by any container:

```bash
# List all volumes that are not attached to any container (dangling volumes)
docker volume ls --filter dangling=true
```

To see how much space these volumes use, combine with `docker system df`:

```bash
# Show disk usage breakdown including volume space
docker system df -v
```

The output includes a section for volumes showing each volume's name, size, and how many containers reference it. Volumes with zero references are orphaned.

For a more detailed view, you can script the inspection:

```bash
# List each dangling volume with its size and creation date
docker volume ls --filter dangling=true -q | while read vol; do
  SIZE=$(docker volume inspect "$vol" --format '{{ .Mountpoint }}')
  CREATED=$(docker volume inspect "$vol" --format '{{ .CreatedAt }}')
  echo "Volume: $vol"
  echo "  Created: $CREATED"
  echo "  Mount: $SIZE"
  echo "  Size: $(sudo du -sh "$SIZE" 2>/dev/null | cut -f1)"
  echo ""
done
```

## Inspecting Volumes Before Deletion

Never blindly delete volumes in production. Always check what is inside first:

```bash
# Mount a volume in a temporary container to inspect its contents
docker run --rm -v my_suspicious_volume:/data alpine ls -la /data
```

For a deeper look at the contents:

```bash
# Recursively list all files in a volume with sizes
docker run --rm -v my_suspicious_volume:/data alpine find /data -type f -exec ls -lh {} \;
```

If you recognize the data as belonging to a service that no longer exists, it is safe to remove. If you are unsure, back it up first:

```bash
# Back up a volume to a tar file before deleting
docker run --rm -v my_suspicious_volume:/data -v /tmp/backups:/backup alpine \
  tar czf /backup/volume-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## Removing Orphaned Volumes

### Remove a Single Volume

```bash
# Remove a specific volume by name
docker volume rm my_old_volume
```

If Docker says the volume is in use, find which container references it:

```bash
# Find containers using a specific volume
docker ps -a --filter volume=my_old_volume --format "{{.ID}} {{.Names}} {{.Status}}"
```

### Remove All Dangling Volumes

```bash
# Remove all volumes not attached to any container
docker volume prune -f
```

The `-f` flag skips the confirmation prompt. Remove it if you want to review what will be deleted first.

### Remove All Unused Volumes (More Aggressive)

```bash
# Remove ALL unused volumes, even named ones not attached to running containers
docker volume prune -a -f
```

The `-a` flag is more aggressive. It removes any volume not currently mounted by a running container, including named volumes. Use this with caution in production.

## Docker System Prune

For a comprehensive cleanup that includes volumes along with stopped containers, unused networks, and dangling images:

```bash
# Full system cleanup including volumes (destructive - use carefully)
docker system prune --volumes -f
```

This single command reclaims the most space but is also the most destructive. Only run it when you are sure nothing stopped or detached needs to be preserved.

## Automated Cleanup with Cron

Set up a cron job to clean orphaned volumes regularly:

```bash
# Create a cleanup script
cat > /usr/local/bin/docker-volume-cleanup.sh << 'SCRIPT'
#!/bin/bash
# Clean orphaned Docker volumes and log the results
LOG="/var/log/docker-cleanup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Count dangling volumes before cleanup
BEFORE=$(docker volume ls --filter dangling=true -q | wc -l)

# Get space used by Docker before cleanup
SPACE_BEFORE=$(docker system df --format '{{.Size}}' | head -1)

# Remove dangling volumes (only truly orphaned, not all unused)
docker volume prune -f >> "$LOG" 2>&1

# Count remaining after cleanup
AFTER=$(docker volume ls --filter dangling=true -q | wc -l)

echo "${TIMESTAMP} - Cleaned $((BEFORE - AFTER)) orphaned volumes. Space before: ${SPACE_BEFORE}" >> "$LOG"
SCRIPT

chmod +x /usr/local/bin/docker-volume-cleanup.sh
```

Add it to cron:

```bash
# Run volume cleanup every Sunday at 3 AM
echo "0 3 * * 0 /usr/local/bin/docker-volume-cleanup.sh" | sudo crontab -
```

## Docker Compose Cleanup

Docker Compose creates volumes with a project-name prefix. When you tear down a project, volumes persist by default:

```bash
# Stop containers but keep volumes (default behavior)
docker compose down

# Stop containers AND remove associated volumes
docker compose down -v
```

If you already ran `docker compose down` without `-v`, find the leftover volumes:

```bash
# Find volumes belonging to a specific Compose project
docker volume ls --filter name=myproject
```

Then remove them:

```bash
# Remove all volumes matching a project name prefix
docker volume ls --filter name=myproject -q | xargs -r docker volume rm
```

## Preventing Orphaned Volumes

### Use Named Volumes in Compose

Anonymous volumes are the biggest source of orphans. Always name your volumes:

```yaml
# Good: named volumes are easier to track and manage
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
    name: myapp_pgdata    # Explicit name prevents Compose prefix issues
```

### Always Use -v When Removing Containers

```bash
# Remove container AND its anonymous volumes
docker rm -v my_container
```

### Use --rm for Temporary Containers

```bash
# Container and its anonymous volumes are removed automatically when it exits
docker run --rm -v /tmp/scratch alpine echo "done"
```

## Monitoring Volume Disk Usage

Set up a simple monitoring check that alerts when Docker volumes exceed a threshold:

```bash
#!/bin/bash
# Alert if Docker volume storage exceeds threshold
THRESHOLD_GB=50
VOLUME_DIR="/var/lib/docker/volumes"

USAGE_KB=$(sudo du -s "$VOLUME_DIR" | cut -f1)
USAGE_GB=$((USAGE_KB / 1024 / 1024))

if [ "$USAGE_GB" -gt "$THRESHOLD_GB" ]; then
  echo "WARNING: Docker volumes using ${USAGE_GB}GB (threshold: ${THRESHOLD_GB}GB)"
  echo "Top 10 volumes by size:"
  sudo du -sh "$VOLUME_DIR"/*/ | sort -rh | head -10
fi
```

Integrate this with your monitoring system, or run it as a cron job that sends email alerts.

## Summary

Orphaned Docker volumes are an inevitable part of working with containers. The key is building habits and automation to keep them under control. Use `docker volume prune` regularly, always use named volumes, remove containers with the `-v` flag, and set up automated cleanup for CI/CD servers. A few minutes of maintenance prevents the frustrating midnight alert that your production disk is full.
