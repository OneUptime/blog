# How to Create Docker Container Snapshots for Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, snapshots, container recovery, backup, docker commit, docker export, disaster recovery

Description: Learn how to create Docker container snapshots using commit, export, and checkpoint commands for reliable recovery workflows.

---

When a Docker container enters a broken state, you need a way to roll back quickly. Docker container snapshots give you that ability. Whether you are debugging a production issue, testing a risky configuration change, or preparing for a migration, snapshots let you capture the exact state of a container and restore it later.

Docker offers several mechanisms for snapshotting containers. Each one captures different aspects of the container state. This guide covers all the practical approaches and helps you pick the right one for your situation.

## Understanding Container State

A Docker container has multiple layers of state:

1. **Filesystem state** - files written inside the container since it started
2. **Runtime state** - running processes, memory contents, open file handles
3. **Volume state** - data in mounted volumes (external to the container filesystem)
4. **Network state** - IP addresses, connections, port mappings

Different snapshot methods capture different combinations of these states. No single method captures everything perfectly.

## Method 1: Docker Commit

The `docker commit` command creates a new image from a running container's filesystem. It captures all changes made to the container's writable layer since it started.

```bash
# Create a snapshot image from a running container
# This captures filesystem changes but not volume data or running processes
docker commit my_container my_container_snapshot:20260208

# Verify the snapshot was created
docker images | grep my_container_snapshot
```

You can add metadata to the commit:

```bash
# Commit with author info and a descriptive message
docker commit \
  --author "ops-team" \
  --message "Snapshot before config migration" \
  --change 'ENV SNAPSHOT_DATE=2026-02-08' \
  my_container my_container_snapshot:pre-migration
```

To restore from this snapshot, stop the original container and start a new one from the snapshot image:

```bash
# Stop the current container
docker stop my_container

# Start a new container from the snapshot image with the same configuration
docker run -d \
  --name my_container_restored \
  --network my_network \
  -p 8080:8080 \
  -v my_data:/data \
  my_container_snapshot:pre-migration
```

### When to Use Docker Commit

Docker commit works well for capturing application state that lives in the container filesystem, like configuration files, installed packages, or generated assets. It does not capture data in mounted volumes, running process state, or memory contents.

## Method 2: Docker Export and Import

The `docker export` command saves a container's entire filesystem as a tar archive. Unlike `docker commit`, it flattens all image layers into a single layer.

```bash
# Export a container's filesystem to a tar archive
docker export my_container > my_container_snapshot.tar

# Check the archive size
ls -lh my_container_snapshot.tar

# List the contents to verify
tar tf my_container_snapshot.tar | head -20
```

To restore, import the archive as a new image:

```bash
# Import the tar archive as a new Docker image
docker import my_container_snapshot.tar my_container_restored:latest

# Start a container from the imported image
# Note: you must specify the command since import does not preserve CMD/ENTRYPOINT
docker run -d \
  --name my_container_restored \
  my_container_restored:latest \
  /usr/local/bin/my-application --config /etc/app/config.yml
```

The key difference from `docker commit` is that export/import loses all image metadata (CMD, ENTRYPOINT, ENV, EXPOSE, etc.). You need to specify these when running the restored container.

## Method 3: Docker Checkpoint (Experimental)

Docker checkpoint uses CRIU (Checkpoint/Restore In Userspace) to freeze a running container and save its complete runtime state, including memory, process trees, and open files. This is the closest thing to a true VM snapshot.

First, enable experimental features in the Docker daemon:

```json
{
  "experimental": true
}
```

```bash
# Restart Docker to apply the experimental setting
sudo systemctl restart docker

# Verify experimental features are enabled
docker version --format '{{.Server.Experimental}}'
```

Now create a checkpoint:

```bash
# Create a checkpoint of a running container
# The --leave-running flag keeps the container running after checkpointing
docker checkpoint create my_container checkpoint_20260208 --leave-running

# List available checkpoints for a container
docker checkpoint ls my_container
```

Restore from the checkpoint:

```bash
# Stop the container first
docker stop my_container

# Start the container from the checkpoint
docker start --checkpoint checkpoint_20260208 my_container
```

### Limitations of Docker Checkpoint

CRIU has real constraints you should know about. Network connections get dropped during checkpoint/restore. Applications with complex socket states may not restore cleanly. GPU workloads and containers with special device mappings often fail. Always test checkpoint/restore with your specific application before relying on it.

## Method 4: Volume Snapshots

Container filesystem snapshots do not include volume data. You need a separate strategy for volumes.

```bash
#!/bin/bash
# snapshot-volumes.sh
# Creates point-in-time copies of Docker volumes for a given container

CONTAINER="$1"
SNAPSHOT_TAG=$(date +%Y%m%d_%H%M%S)

if [ -z "$CONTAINER" ]; then
    echo "Usage: snapshot-volumes.sh <container_name>"
    exit 1
fi

# Get all volume mounts for the container
VOLUMES=$(docker inspect "$CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}')

for VOLUME in $VOLUMES; do
    SNAPSHOT_NAME="${VOLUME}_snapshot_${SNAPSHOT_TAG}"
    echo "Snapshotting volume: $VOLUME -> $SNAPSHOT_NAME"

    # Create a new volume for the snapshot
    docker volume create "$SNAPSHOT_NAME"

    # Copy data from the source volume to the snapshot volume
    docker run --rm \
        -v "${VOLUME}:/source:ro" \
        -v "${SNAPSHOT_NAME}:/target" \
        alpine sh -c "cp -a /source/. /target/"

    echo "Snapshot created: $SNAPSHOT_NAME"
done
```

## Building a Complete Snapshot Script

Combine filesystem and volume snapshots into one comprehensive script:

```bash
#!/bin/bash
# full-snapshot.sh
# Creates a complete snapshot of a container including filesystem and volumes

set -euo pipefail

CONTAINER="$1"
SNAPSHOT_DIR="/opt/snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_PREFIX="${CONTAINER}_${TIMESTAMP}"

if [ -z "$CONTAINER" ]; then
    echo "Usage: full-snapshot.sh <container_name>"
    exit 1
fi

mkdir -p "$SNAPSHOT_DIR"

echo "[$(date)] Starting full snapshot of container: $CONTAINER"

# Step 1: Pause the container to get a consistent state
echo "[$(date)] Pausing container..."
docker pause "$CONTAINER"

# Step 2: Commit the container filesystem
echo "[$(date)] Committing container filesystem..."
docker commit "$CONTAINER" "${SNAPSHOT_PREFIX}:snapshot"

# Step 3: Snapshot all mounted volumes
VOLUMES=$(docker inspect "$CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}')

for VOLUME in $VOLUMES; do
    echo "[$(date)] Backing up volume: $VOLUME"
    docker run --rm \
        -v "${VOLUME}:/source:ro" \
        -v "${SNAPSHOT_DIR}:/backup" \
        alpine tar czf "/backup/${SNAPSHOT_PREFIX}_vol_${VOLUME}.tar.gz" -C /source .
done

# Step 4: Save container configuration (environment, ports, networks)
echo "[$(date)] Saving container configuration..."
docker inspect "$CONTAINER" > "${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}_inspect.json"

# Step 5: Unpause the container
echo "[$(date)] Unpausing container..."
docker unpause "$CONTAINER"

# Step 6: Save the committed image as a tar file
echo "[$(date)] Exporting image..."
docker save "${SNAPSHOT_PREFIX}:snapshot" > "${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}_image.tar"

echo "[$(date)] Snapshot complete. Files saved to ${SNAPSHOT_DIR}/"
ls -lh "${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}"*
```

## Restoring from a Full Snapshot

```bash
#!/bin/bash
# restore-snapshot.sh
# Restores a container from a full snapshot (image + volumes + config)

SNAPSHOT_PREFIX="$1"
SNAPSHOT_DIR="/opt/snapshots"
NEW_CONTAINER="${2:-restored_container}"

if [ -z "$SNAPSHOT_PREFIX" ]; then
    echo "Usage: restore-snapshot.sh <snapshot_prefix> [new_container_name]"
    exit 1
fi

# Load the snapshot image
echo "Loading snapshot image..."
docker load < "${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}_image.tar"

# Restore volumes
for VOLUME_ARCHIVE in "${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}_vol_"*.tar.gz; do
    # Extract volume name from the archive filename
    VOLUME_NAME=$(basename "$VOLUME_ARCHIVE" | sed "s/${SNAPSHOT_PREFIX}_vol_//" | sed 's/.tar.gz//')
    RESTORED_VOLUME="${VOLUME_NAME}_restored"

    echo "Restoring volume: $VOLUME_NAME -> $RESTORED_VOLUME"
    docker volume create "$RESTORED_VOLUME"

    docker run --rm \
        -v "${RESTORED_VOLUME}:/target" \
        -v "${SNAPSHOT_DIR}:/backup:ro" \
        alpine tar xzf "/backup/$(basename "$VOLUME_ARCHIVE")" -C /target
done

# Start the restored container
echo "Starting restored container..."
docker run -d --name "$NEW_CONTAINER" "${SNAPSHOT_PREFIX}:snapshot"

echo "Restoration complete: $NEW_CONTAINER"
```

## Managing Snapshot Storage

Snapshots consume disk space quickly. Set up automatic cleanup:

```bash
#!/bin/bash
# cleanup-snapshots.sh
# Removes snapshots older than the specified number of days

SNAPSHOT_DIR="/opt/snapshots"
RETENTION_DAYS=7

echo "Cleaning up snapshots older than $RETENTION_DAYS days..."

# Remove old snapshot files from disk
find "$SNAPSHOT_DIR" -name "*_snapshot_*" -mtime +$RETENTION_DAYS -delete

# Remove old snapshot images from Docker
docker images --format '{{.Repository}}:{{.Tag}}' | grep ':snapshot' | while read IMAGE; do
    CREATED=$(docker inspect --format '{{.Created}}' "$IMAGE")
    AGE_DAYS=$(( ($(date +%s) - $(date -d "$CREATED" +%s)) / 86400 ))
    if [ "$AGE_DAYS" -gt "$RETENTION_DAYS" ]; then
        echo "Removing old snapshot image: $IMAGE"
        docker rmi "$IMAGE"
    fi
done
```

## Choosing the Right Snapshot Method

| Method | Filesystem | Volumes | Processes/Memory | Speed |
|--------|-----------|---------|-----------------|-------|
| docker commit | Yes | No | No | Fast |
| docker export | Yes (flat) | No | No | Medium |
| docker checkpoint | Yes | No | Yes | Slow |
| Volume copy | No | Yes | No | Varies |
| Full snapshot script | Yes | Yes | No | Slow |

For most production recovery scenarios, the combination of `docker commit` plus volume backup gives you the best balance of reliability and coverage. Docker checkpoint is powerful but still experimental and not available on all platforms.

## Summary

Docker container snapshots are a practical tool for recovery, debugging, and migration workflows. Use `docker commit` for quick filesystem captures, export/import for portable archives, checkpoint/restore for full process state (when supported), and volume copies for persistent data. Combine these methods for comprehensive snapshots, and always test your restore process before you actually need it.
