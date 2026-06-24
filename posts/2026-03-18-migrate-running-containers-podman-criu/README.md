# How to Migrate Running Containers with Podman CRIU

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Live Migration, Container, DevOps

Description: A comprehensive guide to live-migrating running Podman containers between hosts using CRIU, with practical workflows for zero-downtime host maintenance and failover.

---

> Move running containers from one host to another without restarting them. Podman and CRIU make live container migration possible for low-downtime host maintenance and failover.

Server maintenance, hardware upgrades, and datacenter migrations all share a common problem: how do you move running workloads without service interruption? Virtual machines solved this years ago with live migration. Containers can do it too, using Podman's integration with CRIU (Checkpoint/Restore in Userspace). This guide covers the complete workflow for migrating running containers between hosts with minimal downtime.

---

## How Live Container Migration Works

Live container migration with Podman and CRIU follows these steps:

1. **Checkpoint** the running container on the source host, capturing its process state, memory, namespaces, and, when requested, established TCP connections. Exported checkpoints also include root filesystem changes unless disabled with `--ignore-rootfs`.
2. **Transfer** the checkpoint archive to the destination host.
3. **Restore** the container on the destination host from the checkpoint.

The container resumes on the new host as if it never stopped. From the container's perspective, nothing happened. The migration window (the time the container is not running on either host) depends on the container's memory footprint and the network speed between hosts.

## Prerequisites

Both the source and destination hosts must have:

```bash
# Install CRIU

sudo dnf install criu    # Fedora/RHEL
sudo apt install criu     # Debian/Ubuntu

# Verify versions match (or are compatible)
criu --version
podman --version
uname -r
```

Compatibility requirements:

- Same CPU architecture on both hosts.
- Same or compatible kernel versions (destination should be equal or newer).
- Compatible CRIU versions.
- Podman versions should be the same major version.
- Network connectivity between hosts (SSH access is sufficient).

## Basic Migration Workflow

### Step 1: Identify the container to migrate

```bash
# On source host
sudo podman ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

### Step 2: Checkpoint and export

```bash
# On source host
sudo podman container checkpoint my-app \
    --export /tmp/my-app-migration.tar.zst \
    --tcp-established
```

### Step 3: Transfer the checkpoint

```bash
# From source host
scp /tmp/my-app-migration.tar.zst user@dest-host:/tmp/
```

### Step 4: Restore on destination

```bash
# On destination host
sudo podman container restore \
    --import /tmp/my-app-migration.tar.zst \
    --tcp-established
```

### Step 5: Verify

```bash
# On destination host
sudo podman ps
sudo podman logs my-app | tail -5
```

## Reducing Migration Downtime

The total migration downtime is the sum of checkpoint time, transfer time, and restore time. Here is how to minimize each:

### Minimize checkpoint time

Use `--pre-checkpoint` to pre-dump memory while the container keeps running, then use `--with-previous` for the final checkpoint so only changed memory pages are written. This depends on kernel soft-dirty tracking and runtime support, so test it on your hosts first:

```bash
# Pre-checkpoint: dump memory without stopping the container
sudo podman container checkpoint my-app \
    --pre-checkpoint \
    --export /tmp/my-app-precheckpoint.tar.zst

# Transfer the pre-checkpoint (this can happen while container runs)
scp /tmp/my-app-precheckpoint.tar.zst user@dest-host:/tmp/

# Final checkpoint: stops the container and writes changed memory pages
sudo podman container checkpoint my-app \
    --with-previous \
    --export /tmp/my-app-final.tar.zst \
    --tcp-established

# Transfer the final checkpoint, then restore on the destination using both archives
scp /tmp/my-app-final.tar.zst user@dest-host:/tmp/

# On destination host
sudo podman container restore \
    --import-previous /tmp/my-app-precheckpoint.tar.zst \
    --import /tmp/my-app-final.tar.zst \
    --tcp-established
```

### Minimize transfer time

Podman compresses exported checkpoints with zstd by default. Use fast transfer methods, or choose a compression mode explicitly:

```bash
# Checkpoint and transfer in quick succession
sudo podman container checkpoint my-app \
    --tcp-established \
    --export /tmp/my-app-migration.tar.zst

scp /tmp/my-app-migration.tar.zst user@dest-host:/tmp/
```

For very large containers, consider using `rsync` with compression or a dedicated high-speed transfer tool.

### Minimize restore time

Pre-stage dependencies on the destination host before migration:

```bash
# On destination host: pre-pull the base image
sudo podman pull docker.io/library/python:3.12-slim

# Pre-create any required volumes
sudo podman volume create app-data

# Pre-configure networking
sudo podman network create app-network
```

## Automated Migration Script

Here is a complete migration script that handles the entire workflow:

```bash
#!/bin/bash
# migrate-live.sh - Live migrate a Podman container between hosts

set -e

CONTAINER="$1"
DEST_HOST="$2"
DEST_USER="${3:-root}"

if [ -z "$CONTAINER" ] || [ -z "$DEST_HOST" ]; then
    echo "Usage: $0 <container-name> <destination-host> [destination-user]"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CHECKPOINT_FILE="/tmp/${CONTAINER}-migrate-${TIMESTAMP}.tar.zst"

echo "=== Live Migration: $CONTAINER -> $DEST_HOST ==="
echo ""

# Step 1: Verify container exists and is running
echo "[1/6] Verifying source container..."
STATUS=$(sudo podman inspect "$CONTAINER" --format '{{.State.Status}}')
if [ "$STATUS" != "running" ]; then
    echo "ERROR: Container '$CONTAINER' is not running (status: $STATUS)"
    exit 1
fi
echo "  Container is running."

# Step 2: Check destination connectivity
echo "[2/6] Checking destination host..."
if ! ssh -o ConnectTimeout=5 "$DEST_USER@$DEST_HOST" "podman --version" > /dev/null 2>&1; then
    echo "ERROR: Cannot connect to $DEST_HOST or Podman is not installed"
    exit 1
fi
echo "  Destination host is reachable."

# Step 3: Check for name conflicts on destination
echo "[3/6] Checking for conflicts..."
CONFLICT=$(ssh "$DEST_USER@$DEST_HOST" "sudo podman ps -a --format '{{.Names}}' | grep -Fx '$CONTAINER' || true" 2>/dev/null)
if [ -n "$CONFLICT" ]; then
    echo "ERROR: Container '$CONTAINER' already exists on $DEST_HOST"
    echo "  Remove it first: sudo podman rm -f $CONTAINER"
    exit 1
fi
echo "  No conflicts found."

# Step 4: Checkpoint
echo "[4/6] Checkpointing container..."
START_TIME=$(date +%s)
sudo podman container checkpoint "$CONTAINER" \
    --export "$CHECKPOINT_FILE" \
    --tcp-established
CHECKPOINT_TIME=$(($(date +%s) - START_TIME))
CHECKPOINT_SIZE=$(du -h "$CHECKPOINT_FILE" | cut -f1)
echo "  Checkpoint complete: $CHECKPOINT_SIZE in ${CHECKPOINT_TIME}s"

# Step 5: Transfer
echo "[5/6] Transferring checkpoint..."
START_TIME=$(date +%s)
scp "$CHECKPOINT_FILE" "$DEST_USER@$DEST_HOST:/tmp/"
TRANSFER_TIME=$(($(date +%s) - START_TIME))
echo "  Transfer complete in ${TRANSFER_TIME}s"

# Step 6: Restore on destination
echo "[6/6] Restoring on destination..."
START_TIME=$(date +%s)
ssh "$DEST_USER@$DEST_HOST" "sudo podman container restore \
    --import /tmp/$(basename $CHECKPOINT_FILE) \
    --tcp-established"
RESTORE_TIME=$(($(date +%s) - START_TIME))
echo "  Restore complete in ${RESTORE_TIME}s"

# Summary
TOTAL_DOWNTIME=$((CHECKPOINT_TIME + TRANSFER_TIME + RESTORE_TIME))
echo ""
echo "=== Migration Complete ==="
echo "  Checkpoint: ${CHECKPOINT_TIME}s"
echo "  Transfer:   ${TRANSFER_TIME}s"
echo "  Restore:    ${RESTORE_TIME}s"
echo "  Total downtime: ${TOTAL_DOWNTIME}s"

# Cleanup
rm -f "$CHECKPOINT_FILE"
ssh "$DEST_USER@$DEST_HOST" "rm -f /tmp/$(basename $CHECKPOINT_FILE)"

# Verify
echo ""
echo "Container status on $DEST_HOST:"
ssh "$DEST_USER@$DEST_HOST" "sudo podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep '$CONTAINER'"
```

## Migrating Containers with Volumes

Exported checkpoints include associated Podman volume contents by default. If you want to keep the checkpoint archive smaller, or if the container uses bind-mounted host paths or external storage, sync that data separately and restore with `--ignore-volumes`:

```bash
#!/bin/bash

CONTAINER="$1"
DEST_HOST="$2"
DEST_USER="${3:-root}"

# Step 1: Sync volume data before checkpoint (while container runs)
VOLUMES=$(sudo podman inspect "$CONTAINER" --format '{{range .Mounts}}{{.Name}}:{{.Source}} {{end}}')

for vol_info in $VOLUMES; do
    VOL_NAME=$(echo "$vol_info" | cut -d: -f1)
    VOL_PATH=$(echo "$vol_info" | cut -d: -f2)

    echo "Pre-syncing volume: $VOL_NAME"

    # Create volume on destination
    ssh "$DEST_USER@$DEST_HOST" "sudo podman volume create $VOL_NAME"

    # Get destination volume path
    DEST_PATH=$(ssh "$DEST_USER@$DEST_HOST" "sudo podman volume inspect $VOL_NAME --format '{{.Mountpoint}}'")

    # Rsync volume data
    sudo rsync -avz "$VOL_PATH/" "$DEST_USER@$DEST_HOST:$DEST_PATH/"
done

# Step 2: Checkpoint the container
sudo podman container checkpoint "$CONTAINER" \
    --export /tmp/migration.tar.zst \
    --ignore-volumes \
    --tcp-established

# Step 3: Final volume sync (catch any changes during checkpoint)
for vol_info in $VOLUMES; do
    VOL_PATH=$(echo "$vol_info" | cut -d: -f2)
    DEST_PATH=$(ssh "$DEST_USER@$DEST_HOST" "sudo podman volume inspect $(echo $vol_info | cut -d: -f1) --format '{{.Mountpoint}}'")
    sudo rsync -avz "$VOL_PATH/" "$DEST_USER@$DEST_HOST:$DEST_PATH/"
done

# Step 4: Transfer and restore
scp /tmp/migration.tar.zst "$DEST_USER@$DEST_HOST:/tmp/"
ssh "$DEST_USER@$DEST_HOST" "sudo podman container restore \
    --import /tmp/migration.tar.zst \
    --ignore-volumes \
    --tcp-established"
```

## Migration Scenarios

### Host Maintenance

When you need to patch or reboot a host:

```bash
# Migrate all containers off the host
for container in $(sudo podman ps --format "{{.Names}}"); do
    ./migrate-live.sh "$container" standby-host
done

# Perform maintenance
sudo dnf update -y
sudo reboot

# After reboot, migrate containers back
# (run on standby-host)
for container in $(sudo podman ps --format "{{.Names}}"); do
    ./migrate-live.sh "$container" original-host
done
```

### Failover

For automated failover when a host becomes unresponsive, maintain recent checkpoints on a shared filesystem:

```bash
#!/bin/bash
# Periodic checkpoint for failover readiness

SHARED_STORAGE="/mnt/nfs/checkpoints"

while true; do
    for container in $(sudo podman ps --format "{{.Names}}"); do
        sudo podman container checkpoint "$container" \
            --leave-running \
            --export "$SHARED_STORAGE/${container}-latest.tar.zst"
    done
    sleep 300  # Every 5 minutes
done
```

When failover is needed:

```bash
# On the failover host
for checkpoint in /mnt/nfs/checkpoints/*-latest.tar.zst; do
    sudo podman container restore --import "$checkpoint"
done
```

## Limitations and Considerations

- **Root required**: CRIU needs root privileges. Rootless migration is not supported.
- **Architecture match**: Cannot migrate between x86_64 and ARM hosts.
- **Kernel compatibility**: The destination kernel must be the same version or newer.
- **GPU containers**: Containers using GPU passthrough cannot be checkpointed.
- **Large memory footprint**: Containers with gigabytes of memory will have longer checkpoint/restore times and larger checkpoint files.
- **Network state**: TCP connections may time out on the remote end during migration, and restored TCP sockets require the original addresses to be available on the destination. Protocols that reconnect cleanly tolerate migration better.

## Conclusion

Live container migration with Podman and CRIU enables low-downtime host maintenance, hardware migrations, and failover scenarios. The key is preparation: verify host compatibility, pre-stage dependencies, and test the migration workflow before you need it in production. While it requires rootful Podman and matching architectures, the ability to move running workloads between hosts without restarting them is a capability worth having in your operational toolkit.
