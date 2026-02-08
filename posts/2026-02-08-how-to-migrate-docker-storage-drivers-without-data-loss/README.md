# How to Migrate Docker Storage Drivers Without Data Loss

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, storage drivers, migration, overlay2, data migration, Docker daemon, DevOps

Description: Safely migrate Docker storage drivers without losing container data, images, or volumes using a tested step-by-step backup and restore process.

---

Docker storage drivers control how image layers and container writable layers are stored on disk. Migrating from one storage driver to another is something most teams only do once, but getting it wrong means losing all your images, containers, and potentially your data. The Docker daemon will not read data written by a different storage driver, so a careless switch wipes out everything.

This guide walks through the safe migration process, with proper backups at every step.

## Understanding Docker Storage Drivers

Docker supports several storage drivers:

- **overlay2** - The default and recommended driver for most Linux systems
- **btrfs** - Uses Btrfs filesystem features for thin provisioning
- **zfs** - Leverages ZFS copy-on-write filesystem
- **devicemapper** - Uses device mapper thin provisioning (deprecated)
- **vfs** - Simple directory copy, no copy-on-write (slowest, but most compatible)

Check your current storage driver:

```bash
# Show the current storage driver and Docker root directory
docker info --format '{{.Driver}}'
docker info --format '{{.DockerRootDir}}'

# Get more details about storage configuration
docker info | grep -A 5 "Storage Driver"
```

## Why Migrate Storage Drivers

Common reasons for migrating include:

1. Moving from deprecated devicemapper to overlay2
2. Switching to a filesystem-native driver (btrfs or zfs) for better performance
3. Fixing stability issues caused by an incompatible driver-filesystem combination
4. Standardizing across a fleet of servers

## Pre-Migration Checklist

Before changing anything, complete this checklist:

```bash
#!/bin/bash
# pre-migration-check.sh
# Validates the system is ready for a storage driver migration

echo "=== Docker Storage Driver Migration Pre-Check ==="

# Current driver
CURRENT_DRIVER=$(docker info --format '{{.Driver}}')
echo "Current storage driver: $CURRENT_DRIVER"

# Docker root directory
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}')
echo "Docker root: $DOCKER_ROOT"

# Disk space check
DISK_USAGE=$(du -sh "$DOCKER_ROOT" 2>/dev/null | cut -f1)
AVAILABLE=$(df -h "$DOCKER_ROOT" | tail -1 | awk '{print $4}')
echo "Docker data size: $DISK_USAGE"
echo "Available disk space: $AVAILABLE"

# Count resources to migrate
IMAGES=$(docker images -q | wc -l)
CONTAINERS=$(docker ps -a -q | wc -l)
VOLUMES=$(docker volume ls -q | wc -l)
echo "Images: $IMAGES"
echo "Containers: $CONTAINERS"
echo "Volumes: $VOLUMES"

# Check running containers
RUNNING=$(docker ps -q | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    echo "WARNING: $RUNNING containers are currently running. Stop them before migration."
fi

# Verify target filesystem supports overlay2
FILESYSTEM=$(df -T "$DOCKER_ROOT" | tail -1 | awk '{print $2}')
echo "Filesystem type: $FILESYSTEM"
if [ "$FILESYSTEM" = "xfs" ]; then
    FTYPE=$(xfs_info "$DOCKER_ROOT" 2>/dev/null | grep ftype | awk '{print $NF}')
    if [ "$FTYPE" != "1" ]; then
        echo "WARNING: XFS filesystem does not have ftype=1. overlay2 requires ftype=1."
    fi
fi
```

## Step 1: Back Up Everything

This is the most critical step. Back up images, volumes, and container configurations.

```bash
#!/bin/bash
# backup-docker-data.sh
# Creates a complete backup of all Docker data before storage driver migration

BACKUP_DIR="/opt/docker-migration-backup"
mkdir -p "$BACKUP_DIR"/{images,volumes,configs}

echo "=== Backing up Docker data ==="
echo "Backup directory: $BACKUP_DIR"

# Back up all images as tar archives
echo ""
echo "--- Backing up images ---"
docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read IMAGE; do
    SAFE_NAME=$(echo "$IMAGE" | tr '/:' '_')
    echo "  Saving: $IMAGE"
    docker save "$IMAGE" > "${BACKUP_DIR}/images/${SAFE_NAME}.tar"
done

# Save all images in a single archive as a fallback
echo "  Creating combined archive..."
ALL_IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | tr '\n' ' ')
if [ -n "$ALL_IMAGES" ]; then
    docker save $ALL_IMAGES | gzip > "${BACKUP_DIR}/images/all-images.tar.gz"
fi

# Back up all named volumes
echo ""
echo "--- Backing up volumes ---"
for VOLUME in $(docker volume ls -q); do
    echo "  Backing up volume: $VOLUME"
    docker run --rm \
        -v "${VOLUME}:/source:ro" \
        -v "${BACKUP_DIR}/volumes:/backup" \
        alpine tar czf "/backup/${VOLUME}.tar.gz" -C /source .
done

# Back up container configurations
echo ""
echo "--- Backing up container configs ---"
for CONTAINER_ID in $(docker ps -a -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    echo "  Saving config: $NAME"
    docker inspect "$CONTAINER_ID" > "${BACKUP_DIR}/configs/${NAME}.json"
done

# Back up Docker daemon configuration
echo ""
echo "--- Backing up daemon config ---"
cp /etc/docker/daemon.json "${BACKUP_DIR}/daemon.json" 2>/dev/null || echo "No daemon.json found"

# Calculate backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "Backup complete. Total size: $TOTAL_SIZE"
echo "Location: $BACKUP_DIR"
```

## Step 2: Stop Docker and All Containers

```bash
# Stop all running containers gracefully
docker stop $(docker ps -q) 2>/dev/null

# Stop the Docker daemon
sudo systemctl stop docker
sudo systemctl stop docker.socket

# Verify Docker is fully stopped
sudo systemctl status docker
```

## Step 3: Preserve the Old Data Directory

Do not delete the old data. Rename it so you can recover if something goes wrong.

```bash
# Rename the existing Docker data directory
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
sudo mv "$DOCKER_ROOT" "${DOCKER_ROOT}.bak-$(date +%Y%m%d)"

# Create a fresh data directory
sudo mkdir -p "$DOCKER_ROOT"
```

## Step 4: Configure the New Storage Driver

Edit the Docker daemon configuration to use the new driver:

```bash
# Create or update the Docker daemon configuration
sudo tee /etc/docker/daemon.json << 'EOF'
{
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "50m",
        "max-file": "5"
    }
}
EOF
```

For ZFS migration:

```json
{
    "storage-driver": "zfs",
    "storage-opts": [
        "zfs.fsname=tank/docker"
    ]
}
```

For Btrfs migration:

```json
{
    "storage-driver": "btrfs"
}
```

## Step 5: Start Docker with the New Driver

```bash
# Start Docker with the new storage driver
sudo systemctl start docker

# Verify the new storage driver is active
docker info --format '{{.Driver}}'

# Check for any errors
journalctl -u docker --since "5 minutes ago" --no-pager
```

## Step 6: Restore Images

```bash
#!/bin/bash
# restore-images.sh
# Restores Docker images from the backup

BACKUP_DIR="/opt/docker-migration-backup"

echo "=== Restoring Docker images ==="

# Try restoring from the combined archive first
if [ -f "${BACKUP_DIR}/images/all-images.tar.gz" ]; then
    echo "Loading combined image archive..."
    gunzip -c "${BACKUP_DIR}/images/all-images.tar.gz" | docker load
else
    # Fall back to individual image archives
    for TAR in "${BACKUP_DIR}/images/"*.tar; do
        if [ -f "$TAR" ]; then
            echo "Loading: $(basename "$TAR")"
            docker load < "$TAR"
        fi
    done
fi

echo ""
echo "Restored images:"
docker images
```

## Step 7: Restore Volumes

```bash
#!/bin/bash
# restore-volumes.sh
# Restores Docker volumes from the backup

BACKUP_DIR="/opt/docker-migration-backup"

echo "=== Restoring Docker volumes ==="

for ARCHIVE in "${BACKUP_DIR}/volumes/"*.tar.gz; do
    if [ ! -f "$ARCHIVE" ]; then
        continue
    fi

    VOLUME_NAME=$(basename "$ARCHIVE" .tar.gz)
    echo "Restoring volume: $VOLUME_NAME"

    # Create the volume
    docker volume create "$VOLUME_NAME"

    # Restore data from the backup archive
    docker run --rm \
        -v "${VOLUME_NAME}:/target" \
        -v "${BACKUP_DIR}/volumes:/backup:ro" \
        alpine tar xzf "/backup/${VOLUME_NAME}.tar.gz" -C /target

    # Verify the restore
    SIZE=$(docker run --rm -v "${VOLUME_NAME}:/data:ro" alpine du -sh /data | cut -f1)
    echo "  Restored: $VOLUME_NAME ($SIZE)"
done
```

## Step 8: Recreate Containers

If you use Docker Compose, simply bring the stack back up:

```bash
# For Docker Compose applications
docker compose up -d
```

If you need to recreate individual containers, use the saved configurations:

```bash
#!/bin/bash
# restore-containers.sh
# Recreates containers from saved inspection data

BACKUP_DIR="/opt/docker-migration-backup"

echo "=== Recreating containers ==="
echo "Review each container config in ${BACKUP_DIR}/configs/ and recreate as needed."
echo "For Docker Compose applications, use: docker compose up -d"
echo ""
echo "Saved configurations:"
ls "${BACKUP_DIR}/configs/"
```

## Step 9: Verify the Migration

```bash
#!/bin/bash
# verify-migration.sh
# Validates that the storage driver migration was successful

echo "=== Migration Verification ==="

# Confirm new storage driver
DRIVER=$(docker info --format '{{.Driver}}')
echo "Storage driver: $DRIVER"

# Check image count
IMAGE_COUNT=$(docker images -q | wc -l)
echo "Images loaded: $IMAGE_COUNT"

# Check volume count
VOLUME_COUNT=$(docker volume ls -q | wc -l)
echo "Volumes restored: $VOLUME_COUNT"

# Check running containers
RUNNING=$(docker ps -q | wc -l)
echo "Running containers: $RUNNING"

# Test basic operations
echo ""
echo "Testing basic Docker operations..."

# Pull a test image
docker pull alpine:latest > /dev/null 2>&1 && echo "PASS: Image pull works" || echo "FAIL: Image pull failed"

# Run a test container
docker run --rm alpine echo "storage driver test" > /dev/null 2>&1 && echo "PASS: Container run works" || echo "FAIL: Container run failed"

# Test volume creation
docker volume create test_migration > /dev/null 2>&1 && echo "PASS: Volume creation works" || echo "FAIL: Volume creation failed"
docker volume rm test_migration > /dev/null 2>&1

echo ""
echo "Check container health and application functionality manually."
```

## Rollback Procedure

If the migration fails, roll back to the original storage driver:

```bash
#!/bin/bash
# rollback-migration.sh
# Rolls back to the previous storage driver if the migration fails

DOCKER_ROOT="/var/lib/docker"
BACKUP_DATE=$(ls -d ${DOCKER_ROOT}.bak-* 2>/dev/null | head -1 | sed 's/.*bak-//')

echo "=== Rolling back storage driver migration ==="

# Stop Docker
sudo systemctl stop docker
sudo systemctl stop docker.socket

# Remove the new (failed) data directory
sudo rm -rf "$DOCKER_ROOT"

# Restore the original data directory
sudo mv "${DOCKER_ROOT}.bak-${BACKUP_DATE}" "$DOCKER_ROOT"

# Restore the original daemon.json
BACKUP_DIR="/opt/docker-migration-backup"
if [ -f "${BACKUP_DIR}/daemon.json" ]; then
    sudo cp "${BACKUP_DIR}/daemon.json" /etc/docker/daemon.json
else
    # Remove the new config to use defaults
    sudo rm -f /etc/docker/daemon.json
fi

# Start Docker
sudo systemctl start docker

# Verify rollback
echo "Storage driver: $(docker info --format '{{.Driver}}')"
echo "Images: $(docker images -q | wc -l)"
echo "Containers: $(docker ps -a -q | wc -l)"
echo "Rollback complete"
```

## Cleanup After Successful Migration

Once you have verified the migration is successful and everything is working correctly, clean up:

```bash
# Remove the old Docker data directory (only after thorough verification)
DOCKER_ROOT="/var/lib/docker"
OLD_DIR=$(ls -d ${DOCKER_ROOT}.bak-* 2>/dev/null)

if [ -n "$OLD_DIR" ]; then
    echo "Old Docker data directory: $OLD_DIR"
    echo "Size: $(du -sh "$OLD_DIR" | cut -f1)"
    echo ""
    echo "Remove it with: sudo rm -rf $OLD_DIR"
    echo "Only do this after confirming everything works correctly."
fi
```

## Summary

Migrating Docker storage drivers is a careful, multi-step process: inventory your resources, back up everything (images, volumes, configurations), stop Docker, switch the driver in the daemon configuration, start Docker with the new driver, and restore your data. Always keep the old data directory until you have thoroughly verified the migration. Having a tested rollback procedure is not optional. The entire process can be completed in a maintenance window of 30 minutes to a few hours, depending on the amount of data involved.
