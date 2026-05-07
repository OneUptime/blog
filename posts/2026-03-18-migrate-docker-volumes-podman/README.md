# How to Migrate Docker Volumes to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Migration, Volumes, Storage

Description: Learn how to migrate Docker volumes and their data to Podman volumes, ensuring no data is lost during the transition.

---

> Migrating Docker volumes to Podman requires exporting the volume data and importing it into Podman's volume system, since the two tools store volumes in different locations.

Docker and Podman both support named volumes, but they store them in different filesystem locations. Docker volumes live under `/var/lib/docker/volumes/`, while Podman rootful volumes are in `/var/lib/containers/storage/volumes/` and rootless volumes are in the user's home directory. This guide covers how to safely migrate volume data between the two systems.

---

## Understanding Volume Storage Locations

First, understand where each tool stores its volumes.

```bash
# Docker volume storage location

docker info | grep "Docker Root Dir"
# Typically: /var/lib/docker
# Volumes at: /var/lib/docker/volumes/

# Podman rootful volume storage
podman info | grep graphRoot
# Typically: /var/lib/containers/storage

# Podman rootless volume storage
podman info | grep graphRoot
# Typically: $XDG_DATA_HOME/containers/storage or ~/.local/share/containers/storage

# List Docker volumes and their mount points
docker volume ls
docker volume inspect mydata | jq '.[0].Mountpoint'

# List Podman volumes
podman volume ls
podman volume inspect mydata | jq '.[0].Mountpoint'
```

## Inventory Docker Volumes

Before migrating, take stock of all Docker volumes and their sizes.

```bash
# List all Docker volumes
docker volume ls --format "table {{.Name}}\t{{.Driver}}"

# Check the size of each volume
docker system df -v | grep -A 100 "VOLUME NAME"

# Export a detailed inventory
docker volume ls -q | while read VOL; do
  SIZE=$(sudo du -sh "/var/lib/docker/volumes/${VOL}/_data" 2>/dev/null | cut -f1)
  echo "${VOL}: ${SIZE}"
done
```

## Migrating a Single Volume

The standard approach uses a temporary container to copy data from a Docker volume to a tar file, then imports it into a Podman volume.

```bash
# Step 1: Export the Docker volume data to a tar file
docker run --rm \
  -v mydata:/source:ro \
  -v /tmp:/backup \
  alpine \
  tar czf /backup/mydata-backup.tar.gz -C /source .

# Step 2: Create the equivalent Podman volume
podman volume create mydata

# Step 3: Import the data into the Podman volume
podman run --rm \
  -v mydata:/dest \
  -v /tmp:/backup:ro \
  alpine \
  tar xzf /backup/mydata-backup.tar.gz -C /dest

# Step 4: Verify the data was imported correctly
podman run --rm \
  -v mydata:/data:ro \
  alpine \
  ls -la /data
```

## Batch Volume Migration Script

Automate the migration of all Docker volumes to Podman.

```bash
#!/bin/bash
# migrate-volumes.sh - Migrate all Docker volumes to Podman

BACKUP_DIR="/tmp/volume-backups"
mkdir -p "$BACKUP_DIR"

echo "Starting Docker volume migration to Podman..."

# Get all Docker volume names
VOLUMES=$(docker volume ls -q)

for VOL in $VOLUMES; do
  echo "=== Migrating volume: ${VOL} ==="

  # Skip if the Podman volume already exists
  if podman volume exists "$VOL" 2>/dev/null; then
    echo "SKIP: Podman volume '${VOL}' already exists."
    continue
  fi

  # Export from Docker
  echo "  Exporting from Docker..."
  docker run --rm \
    -v "${VOL}:/source:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine \
    tar czf "/backup/${VOL}.tar.gz" -C /source .

  if [ $? -ne 0 ]; then
    echo "  FAILED to export ${VOL}" >&2
    continue
  fi

  # Create Podman volume
  echo "  Creating Podman volume..."
  podman volume create "$VOL"

  # Import into Podman
  echo "  Importing into Podman..."
  podman run --rm \
    -v "${VOL}:/dest" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine \
    tar xzf "/backup/${VOL}.tar.gz" -C /dest

  if [ $? -eq 0 ]; then
    echo "  SUCCESS: ${VOL} migrated."
  else
    echo "  FAILED to import ${VOL}" >&2
  fi
done

echo "Volume migration complete."
echo "Backup files are in ${BACKUP_DIR}"
```

## Direct Filesystem Copy Method

For rootful Podman, you can copy volume data directly at the filesystem level.

```bash
# Create the Podman volume first
sudo podman volume create mydata

# Get the Podman volume mount point
PODMAN_VOL=$(sudo podman volume inspect mydata | jq -r '.[0].Mountpoint')

# Copy data directly from Docker volume to Podman volume
sudo cp -a /var/lib/docker/volumes/mydata/_data/. "$PODMAN_VOL/"

# Fix ownership only if needed by the UID/GID your container runs as
APP_UID=1000
APP_GID=1000
sudo chown -R "${APP_UID}:${APP_GID}" "$PODMAN_VOL"

# Verify
sudo podman run --rm -v mydata:/data:ro alpine ls -la /data
```

For rootless Podman, prefer the tar export/import method above. If you need to unpack an archive directly into a rootless volume, do it from Podman's user namespace.

```bash
podman volume create mydata
podman unshare sh -c '
  PODMAN_VOL=$(podman volume inspect mydata | jq -r ".[0].Mountpoint")
  tar xzf /tmp/mydata-backup.tar.gz -C "$PODMAN_VOL"
'
```

## Migrating Bind Mounts

Bind mounts do not need migration since they reference host filesystem paths directly. Just update your run commands and, on SELinux systems, add the appropriate Podman relabel option such as `:Z` or `:z` if the container cannot access the path.

```bash
# Docker bind mount
docker run -d \
  -v /host/data:/container/data \
  --name myapp \
  myimage:latest

# Podman equivalent - same basic syntax
podman run -d \
  -v /host/data:/container/data \
  --name myapp \
  myimage:latest

# The host directory /host/data remains unchanged
```

## Handling Volume Drivers and Options

Docker volumes with custom drivers need special handling.

```bash
# Check if any Docker volumes use non-default drivers
docker volume ls --format '{{.Name}}: {{.Driver}}' | grep -v "local"

# For local driver volumes with mount options, recreate in Podman
# Check Docker volume options
docker volume inspect mydata | jq '.[0].Options'

# Recreate with the same options in Podman
podman volume create \
  --opt type=tmpfs \
  --opt o=size=100m \
  mytmpfs

# For NFS volumes
podman volume create \
  --opt type=nfs \
  --opt o=addr=nfs-server.example.com,rw \
  --opt device=:/exports/data \
  mynfs-volume
```

## Verifying Migrated Volumes

After migration, verify data integrity.

```bash
#!/bin/bash
# verify-volumes.sh - Compare Docker and Podman volume contents

VOLUMES=$(docker volume ls -q)

for VOL in $VOLUMES; do
  echo "Verifying volume: ${VOL}"

  # Get file count from Docker volume
  DOCKER_COUNT=$(docker run --rm -v "${VOL}:/data:ro" alpine \
    find /data -type f | wc -l)

  # Get file count from Podman volume
  PODMAN_COUNT=$(podman run --rm -v "${VOL}:/data:ro" alpine \
    find /data -type f | wc -l)

  if [ "$DOCKER_COUNT" = "$PODMAN_COUNT" ]; then
    echo "  MATCH: ${DOCKER_COUNT} files"
  else
    echo "  MISMATCH: Docker=${DOCKER_COUNT}, Podman=${PODMAN_COUNT}"
  fi
done
```

## Summary

Migrating Docker volumes to Podman requires exporting the volume data and importing it into Podman's volume system, since the two tools use different storage paths. Use the container-based tar export/import method for a reliable, portable approach, or copy files directly at the filesystem level for faster transfers. Bind mounts require no migration at all since they reference host paths directly. Always verify data integrity after migration by comparing file counts and testing application functionality with the migrated volumes.
