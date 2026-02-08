# How to Implement Volume Snapshots for Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Snapshots, Backup, Storage, DevOps, Data Protection

Description: Practical methods for creating point-in-time snapshots of Docker volumes using tar, LVM, Btrfs, and ZFS.

---

Docker does not have a built-in volume snapshot feature. This is a problem when you need point-in-time copies of your data for backups, testing, or rollback. If your database container is running and you copy files directly, you risk getting a corrupted, half-written snapshot. You need a strategy that captures a consistent state of the volume at a specific moment.

This guide covers four approaches to Docker volume snapshots, ranging from simple tar-based copies to filesystem-level snapshots with LVM, Btrfs, and ZFS.

## Approach 1: Tar-Based Snapshots

The simplest method uses a temporary container to create a compressed archive of a volume. This works on any system and requires no special filesystem setup.

### Creating a Snapshot

```bash
# Create a compressed snapshot of a Docker volume
docker run --rm \
  -v myapp_data:/source:ro \
  -v /opt/snapshots:/snapshots \
  alpine tar czf /snapshots/myapp_data-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .
```

Key details:
- The source volume is mounted read-only (`:ro`) to prevent modifications during the snapshot
- The snapshot is saved to a host directory `/opt/snapshots`
- The filename includes a timestamp for easy identification

### Restoring from a Snapshot

```bash
# Restore a volume from a tar snapshot
docker volume create myapp_data_restored

docker run --rm \
  -v myapp_data_restored:/target \
  -v /opt/snapshots:/snapshots:ro \
  alpine tar xzf /snapshots/myapp_data-20260208-143022.tar.gz -C /target
```

### Snapshot Script with Rotation

Here is a complete script that creates snapshots and keeps only the last N copies:

```bash
#!/bin/bash
# snapshot-volume.sh - Create a Docker volume snapshot with rotation
# Usage: ./snapshot-volume.sh <volume_name> [keep_count]

VOLUME_NAME=$1
KEEP_COUNT=${2:-7}
SNAPSHOT_DIR="/opt/snapshots/${VOLUME_NAME}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="${SNAPSHOT_DIR}/${VOLUME_NAME}-${TIMESTAMP}.tar.gz"

# Create snapshot directory if it does not exist
mkdir -p "$SNAPSHOT_DIR"

echo "Creating snapshot of volume '${VOLUME_NAME}'..."

# Create the snapshot using a temporary Alpine container
docker run --rm \
  -v "${VOLUME_NAME}:/source:ro" \
  -v "${SNAPSHOT_DIR}:/dest" \
  alpine tar czf "/dest/${VOLUME_NAME}-${TIMESTAMP}.tar.gz" -C /source .

if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$SNAPSHOT_FILE" | awk '{print $5}')
  echo "Snapshot created: ${SNAPSHOT_FILE} (${SIZE})"
else
  echo "ERROR: Snapshot failed"
  exit 1
fi

# Rotate old snapshots, keeping only the most recent N
SNAPSHOT_COUNT=$(ls -1 "${SNAPSHOT_DIR}"/*.tar.gz 2>/dev/null | wc -l)
if [ "$SNAPSHOT_COUNT" -gt "$KEEP_COUNT" ]; then
  DELETE_COUNT=$((SNAPSHOT_COUNT - KEEP_COUNT))
  ls -1t "${SNAPSHOT_DIR}"/*.tar.gz | tail -n "$DELETE_COUNT" | xargs rm -f
  echo "Rotated: removed ${DELETE_COUNT} old snapshot(s)"
fi
```

Use it with cron for automated daily snapshots:

```bash
# Run daily at 2 AM, keeping 7 days of snapshots
0 2 * * * /usr/local/bin/snapshot-volume.sh myapp_pgdata 7
```

## Approach 2: LVM Snapshots

If your Docker host uses LVM (Logical Volume Manager), you can create instant copy-on-write snapshots. These are nearly instantaneous regardless of volume size.

### Setting Up LVM for Docker Volumes

```bash
# Create a logical volume for Docker data
sudo lvcreate -L 20G -n docker_data vg_main

# Format and mount it
sudo mkfs.ext4 /dev/vg_main/docker_data
sudo mkdir -p /mnt/docker-data
sudo mount /dev/vg_main/docker_data /mnt/docker-data

# Create a Docker volume backed by this LVM mount
docker volume create --driver local \
  --opt type=none \
  --opt device=/mnt/docker-data \
  --opt o=bind \
  lvm_backed_volume
```

### Creating an LVM Snapshot

```bash
# Create an LVM snapshot (allocate 2GB for changed blocks)
sudo lvcreate -L 2G -s -n docker_data_snap /dev/vg_main/docker_data

# Mount the snapshot read-only for backup
sudo mkdir -p /mnt/snapshot
sudo mount -o ro /dev/vg_main/docker_data_snap /mnt/snapshot

# Copy data from the snapshot
sudo tar czf /opt/backups/lvm-snapshot-$(date +%Y%m%d).tar.gz -C /mnt/snapshot .

# Clean up the snapshot
sudo umount /mnt/snapshot
sudo lvremove -f /dev/vg_main/docker_data_snap
```

LVM snapshots are copy-on-write, meaning they only store blocks that change after the snapshot is created. The 2GB allocation in the example is for storing changes, not the full volume size.

## Approach 3: Btrfs Snapshots

Btrfs provides instant, zero-cost snapshots at the filesystem level. If your Docker storage driver is Btrfs, you can snapshot volumes directly.

### Configure Docker to Use Btrfs

Make sure your Docker data directory is on a Btrfs filesystem:

```bash
# Check if Docker's data directory is on Btrfs
df -T /var/lib/docker | grep btrfs
```

### Create and Manage Btrfs Snapshots

```bash
# Create a Btrfs subvolume for a Docker volume
sudo btrfs subvolume create /var/lib/docker/volumes/myapp_data/_data

# Take an instant snapshot
sudo btrfs subvolume snapshot -r \
  /var/lib/docker/volumes/myapp_data/_data \
  /opt/snapshots/myapp_data-$(date +%Y%m%d-%H%M%S)
```

The `-r` flag creates a read-only snapshot, which is safer for backup purposes.

### Restore from Btrfs Snapshot

```bash
# Create a new volume from a Btrfs snapshot
sudo btrfs subvolume snapshot \
  /opt/snapshots/myapp_data-20260208-143022 \
  /var/lib/docker/volumes/myapp_data_restored/_data
```

## Approach 4: ZFS Snapshots

ZFS provides the most robust snapshot capabilities. Snapshots are atomic, consistent, and can be sent to remote systems.

### Set Up ZFS for Docker

```bash
# Create a ZFS pool (using a disk or partition)
sudo zpool create docker-pool /dev/sdb

# Create a dataset for Docker volumes
sudo zfs create docker-pool/volumes

# Configure Docker to store volumes on ZFS
sudo mkdir -p /var/lib/docker/volumes
sudo zfs set mountpoint=/var/lib/docker/volumes docker-pool/volumes
```

### Create ZFS Snapshots

```bash
# Create an instant, atomic snapshot
sudo zfs snapshot docker-pool/volumes@snap-$(date +%Y%m%d-%H%M%S)

# List all snapshots
sudo zfs list -t snapshot

# Check snapshot space usage
sudo zfs list -t snapshot -o name,used,referenced
```

### Restore from ZFS Snapshot

```bash
# Roll back to a specific snapshot (destroys all changes after that point)
sudo zfs rollback docker-pool/volumes@snap-20260208-143022

# Or clone a snapshot to a new dataset (non-destructive)
sudo zfs clone docker-pool/volumes@snap-20260208-143022 docker-pool/volumes-restored
```

### Send Snapshots to a Remote System

ZFS can stream snapshots to another server for off-site backup:

```bash
# Send a snapshot to a remote ZFS system over SSH
sudo zfs send docker-pool/volumes@snap-20260208-143022 | \
  ssh backup-server sudo zfs receive backup-pool/docker-volumes

# Send incremental snapshots (only changes between two snapshots)
sudo zfs send -i @snap-20260207-020000 docker-pool/volumes@snap-20260208-020000 | \
  ssh backup-server sudo zfs receive backup-pool/docker-volumes
```

## Ensuring Consistent Snapshots

For databases, taking a snapshot while writes are happening can result in corruption. The safest approach is to quiesce the database first:

```bash
#!/bin/bash
# Consistent database snapshot with write pause

# Tell PostgreSQL to enter backup mode
docker exec myapp-postgres psql -U postgres -c "SELECT pg_backup_start('snapshot');"

# Take the snapshot while writes are paused
sudo zfs snapshot docker-pool/volumes@consistent-$(date +%Y%m%d-%H%M%S)

# Resume normal operations
docker exec myapp-postgres psql -U postgres -c "SELECT pg_backup_stop();"

echo "Consistent snapshot created"
```

## Choosing the Right Approach

| Method | Speed | Consistency | Complexity | Best For |
|--------|-------|-------------|------------|----------|
| Tar | Slow (full copy) | Good with :ro | Low | Small volumes, any filesystem |
| LVM | Fast | Good | Medium | Existing LVM setups |
| Btrfs | Instant | Excellent | Medium | Btrfs-native Docker hosts |
| ZFS | Instant | Excellent | Higher | Production with replication needs |

For most setups, start with tar-based snapshots. If you need instant snapshots on large volumes or remote replication, invest the time to set up ZFS. The reliability and flexibility of ZFS snapshots pay for themselves quickly in production environments.
