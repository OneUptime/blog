# How to Remove Volumes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Cleanup, DevOps

Description: Learn how to safely remove Docker volumes in Portainer, including how to avoid accidental data loss and clean up unused volumes.

## Introduction

Docker volumes persist data independently of containers - this is their primary advantage. But when volumes are no longer needed, they take up disk space and clutter the Portainer UI. Removing volumes correctly requires care to avoid data loss. This guide covers safe volume removal practices.

## Prerequisites

- Portainer installed with a connected Docker environment

## Important Warning

Removing a Docker volume permanently deletes all data stored in it. Unlike containers, there's no "restore from stopped" option. Always:

1. Verify the volume is not needed before deleting.
2. Back up the volume data if there's any doubt.
3. Ensure no containers are using the volume.

## Step 1: Remove a Volume via Portainer

1. Navigate to **Volumes** in Portainer.
2. Find the volume to remove.
3. Click the **Remove** button (trash icon).
4. Confirm the removal.

Portainer will refuse to remove volumes that are currently in use by containers (running or stopped).

## Step 2: Remove Multiple Volumes

1. Navigate to **Volumes**.
2. Check the checkboxes next to volumes to remove.
3. Click **Remove** in the bulk action bar.

## Step 3: Remove Unused Volumes (Prune)

Remove unused volumes. In current Docker releases, `docker volume prune` removes unused anonymous volumes by default; add `--all` to include unused named volumes too:

1. Navigate to **Volumes** in Portainer.
2. Click **Prune** (if available).

Via Docker CLI:

```bash
# Remove unused anonymous volumes:

docker volume prune

# Include unused named volumes too:
docker volume prune --all

# Without confirmation:
docker volume prune --all --force

# "unused" means not referenced by any container, including stopped containers.
# A volume attached to a stopped container is not pruned until that container is removed.

# Remove labeled unused volumes, including named volumes:
docker volume prune --all --filter "label=environment=test"
```

## Step 4: Verify Volume Is Safe to Remove

Before removing, check what's using a volume:

```bash
# Check which containers use a volume (running or stopped):
for container in $(docker ps -aq); do
  docker inspect --format \
    '{{.Name}} {{range .Mounts}}{{if .Name}}{{.Name}} {{end}}{{end}}' \
    "$container"
done | grep -F "my-volume-name"

# If this returns nothing, no existing container references the volume.

# To check only running containers:
docker ps --filter "volume=my-volume-name"

# Check volume size before deleting:
docker run --rm \
  -v my-volume-name:/data \
  alpine:latest \
  du -sh /data
```

## Step 5: Back Up Before Removing

Always back up important data before deleting:

```bash
#!/bin/bash
# backup-volume.sh
# Back up a volume before removing it

VOLUME_NAME="${1:?Volume name required}"
BACKUP_DIR="${2:-/backups/volumes}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${VOLUME_NAME}_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "Backing up volume: ${VOLUME_NAME}"
echo "Destination: ${BACKUP_FILE}"

docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:latest \
  tar czf "/backup/${VOLUME_NAME}_${TIMESTAMP}.tar.gz" -C /data .

echo "Backup size: $(du -sh "${BACKUP_FILE}" | cut -f1)"
echo "Backup complete: ${BACKUP_FILE}"
echo ""
echo "To restore: docker run --rm -v ${VOLUME_NAME}:/data -v ${BACKUP_DIR}:/backup alpine:latest tar xzf /backup/${VOLUME_NAME}_${TIMESTAMP}.tar.gz -C /data"
```

## Step 6: Remove Volume and Associated Container Together

When removing a temporary service (container + volume):

```bash
# Remove container and its anonymous volumes:
docker rm -f --volumes my-container

# For named volumes, you must remove separately:
docker rm -f my-container
docker volume rm my-named-volume

# Remove via Docker Compose (removes attached anonymous volumes and
# named volumes declared in the Compose file):
docker compose down --volumes
# WARNING: External volumes are not removed
```

In Portainer when removing a stack:
1. Navigate to **Stacks**.
2. Tick the checkbox next to the stack.
3. Click **Remove**.
4. Remove any now-unused volumes separately from **Volumes** if data deletion is intended.

## Step 7: Volume Removal for Different Scenarios

### After a Failed Deployment

```bash
# Deployment created volumes but failed - clean up:
docker compose down --volumes
# Removes containers, networks, attached anonymous volumes, and
# non-external volumes declared in the compose file
```

### Development Environment Cleanup

```bash
# Remove all test volumes (labeled as test environment):
docker volume ls --filter "label=environment=test" -q | \
    xargs docker volume rm 2>/dev/null || true

# Broader cleanup in dev:
docker system prune -a --volumes --force
# WARNING: Removes stopped containers, unused networks, unused images,
# build cache, and anonymous volumes
```

### Production Volume Cleanup

```bash
# Only remove a specific volume after verifying it's empty and unused:
VOLUME="old-app-data-v1"

# 1. Verify Docker sees it as unused:
docker volume ls -q --filter "dangling=true" --filter "name=${VOLUME}" | \
  grep -Fxq "${VOLUME}" || { echo "ERROR: Volume is still in use or not found!"; exit 1; }

# 2. Check it's actually empty:
SIZE=$(docker run --rm -v "${VOLUME}:/data" alpine du -sk /data | cut -f1)
if [ "$SIZE" -gt 100 ]; then
  echo "WARNING: Volume has ${SIZE} KB of data!"
  read -r -p "Delete anyway? [y/N] " confirm
  [ "$confirm" != "y" ] && [ "$confirm" != "Y" ] && exit 0
fi

# 3. Remove
docker volume rm "${VOLUME}"
echo "Volume removed: ${VOLUME}"
```

## Step 8: Automating Volume Cleanup

```bash
#!/bin/bash
# volume-cleanup.sh
# Remove volumes with cleanup labels

# Remove volumes labeled for cleanup:
docker volume ls --filter "label=auto-cleanup=true" -q | \
    while read -r volume; do
        echo "Removing cleanup-labeled volume: ${volume}"
        docker volume rm "${volume}" 2>/dev/null || echo "  ${volume} is in use - skipped"
    done
```

## Common Errors When Removing Volumes

```bash
# Error: "volume is in use"
# Fix: find and remove the container using it
for container in $(docker ps -aq); do
  docker inspect --format \
    '{{.Id}} {{range .Mounts}}{{if .Name}}{{.Name}} {{end}}{{end}}' \
    "$container"
done | grep -F "my-volume"
docker rm -f <container_id>
docker volume rm my-volume

# Error: "volume not found"
# Fix: verify the exact volume name
docker volume ls | grep my-volume

# Error: "device or resource busy"
# Fix: unmount any external mounts
# Check: cat /proc/mounts | grep my-volume
```

## Conclusion

Removing volumes in Portainer is permanent and irreversible - always back up data before deletion. Use the prune command for batch cleanup of unused volumes, verify no containers are using a volume before removal, and label your volumes with retention metadata to make cleanup decisions easier. For production environments, implement a backup-before-remove policy using automation scripts.
