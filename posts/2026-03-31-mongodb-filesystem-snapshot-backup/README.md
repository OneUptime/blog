# How to Back Up MongoDB with Filesystem Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Filesystem Snapshot, LVM, WiredTiger

Description: Learn how to back up MongoDB using filesystem snapshots with LVM or cloud block storage, ensuring consistent backups with minimal downtime for large databases.

---

## Why Use Filesystem Snapshots

Filesystem snapshots provide a consistent point-in-time copy of the MongoDB data files without the time and write overhead of `mongodump`. They are the preferred backup method for large databases where `mongodump` would take hours.

Advantages over mongodump:
- Near-instantaneous snapshot creation.
- Backup time does not grow linearly with database size.
- Consistent across all collections at the same moment.
- Fast restore by copying or mounting the snapshot.

```mermaid
flowchart TD
    A[MongoDB - WiredTiger storage]
    A --> B["Flush checkpoint\n(ensure consistent state)"]
    B --> C[Take filesystem snapshot\n(LVM, EBS, GCP PD, Azure Disk)]
    C --> D[Copy or store snapshot offsite]
    D --> E[Restore: mount snapshot + start mongod]
```

## Prerequisites for Consistent Snapshots

For a consistent snapshot:
- **Use WiredTiger storage engine** (default since MongoDB 3.2) - it uses checkpoints that enable crash-consistent snapshots.
- **The data directory must be on an LVM volume** (for LVM snapshots) or a cloud block storage volume (EBS, GCP Persistent Disk, Azure Managed Disk).
- The snapshot must capture all MongoDB data files and journal files atomically.

If using a replica set, prefer snapshotting a secondary to avoid any impact on primary read/write traffic.

## Method 1: LVM Snapshot on Linux

### Step 1: Verify LVM Setup

```bash
# Check that MongoDB data directory is on an LVM volume
df -h /var/lib/mongodb
lvdisplay

# Example output showing /dev/datavg/datalv is mounted at /var/lib/mongodb
```

### Step 2: Create an LVM Snapshot

```bash
# Create a 10GB snapshot of the MongoDB data volume
sudo lvcreate \
  --size 10G \
  --snapshot \
  --name mongodb_snap_$(date +%Y%m%d_%H%M%S) \
  /dev/datavg/datalv
```

The snapshot is created atomically and MongoDB continues writing to the original volume.

### Step 3: Mount and Archive the Snapshot

```bash
# Mount the snapshot read-only
sudo mkdir -p /mnt/mongodb-snap
sudo mount -o ro /dev/datavg/mongodb_snap_20260331_020000 /mnt/mongodb-snap

# Archive the data files to your backup destination
sudo tar -czf /backup/mongodb-20260331.tar.gz -C /mnt/mongodb-snap .

# Or copy to S3
aws s3 cp /mnt/mongodb-snap s3://my-bucket/mongodb-backup/ --recursive

# Unmount the snapshot
sudo umount /mnt/mongodb-snap

# Remove the snapshot (frees space)
sudo lvremove /dev/datavg/mongodb_snap_20260331_020000
```

### Step 4: Restore from LVM Snapshot

```bash
# Stop MongoDB
sudo systemctl stop mongod

# Mount the backup archive
sudo tar -xzf /backup/mongodb-20260331.tar.gz -C /var/lib/mongodb

# Fix ownership
sudo chown -R mongodb:mongodb /var/lib/mongodb

# Start MongoDB - WiredTiger will replay the journal if needed
sudo systemctl start mongod
```

## Method 2: AWS EBS Snapshot

EBS snapshots are the standard backup method for MongoDB on AWS EC2.

### Create an EBS Snapshot

```bash
# Get the volume ID of the MongoDB data volume
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=mongodb-secondary" \
  --query "Reservations[].Instances[].BlockDeviceMappings[?DeviceName=='/dev/xvdf'].Ebs.VolumeId" \
  --output text

# Create a snapshot
aws ec2 create-snapshot \
  --volume-id vol-0abc12345def67890 \
  --description "MongoDB backup $(date +%Y-%m-%d)" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=mongodb-backup}]'
```

### Automate with AWS CLI Script

```bash
#!/bin/bash

VOLUME_ID="vol-0abc12345def67890"
DESCRIPTION="MongoDB backup $(date +%Y-%m-%d %H:%M:%S)"
RETENTION_DAYS=7

# Create snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id "$VOLUME_ID" \
  --description "$DESCRIPTION" \
  --query "SnapshotId" \
  --output text)

echo "Snapshot created: $SNAPSHOT_ID"

# Tag it
aws ec2 create-tags \
  --resources "$SNAPSHOT_ID" \
  --tags "Key=CreatedAt,Value=$(date +%Y-%m-%d)"

# Delete old snapshots
OLD_SNAPSHOTS=$(aws ec2 describe-snapshots \
  --filters "Name=volume-id,Values=$VOLUME_ID" \
  --query "Snapshots[?StartTime<='$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)'].SnapshotId" \
  --output text)

for snap in $OLD_SNAPSHOTS; do
  echo "Deleting old snapshot: $snap"
  aws ec2 delete-snapshot --snapshot-id "$snap"
done
```

## Method 3: WiredTiger Lock File Method (Consistency Guarantee)

WiredTiger's journal ensures crash consistency, but for extra confidence when snapshotting a standalone mongod, flush the WiredTiger cache first:

```javascript
// On mongod - write a checkpoint to ensure all data is flushed to disk
db.adminCommand({ fsync: 1 })
```

For a replica set secondary, WiredTiger's built-in checkpointing is sufficient - no fsync lock needed because the secondary can catch up via the oplog if needed.

```javascript
// Optional: lock writes on a standalone mongod during snapshot
// (Not recommended for replica set members - causes replication lag)
db.adminCommand({ fsync: 1, lock: true })
// Take snapshot here
db.adminCommand({ fsyncUnlock: 1 })
```

## Snapshot Backup Script with MongoDB Consistency Check

```bash
#!/bin/bash

MONGOSH="mongosh"
MONGO_URI="mongodb://localhost:27017"
LVM_VG="datavg"
LVM_LV="datalv"
SNAP_NAME="mongodb_snap_$(date +%Y%m%d_%H%M%S)"
SNAP_SIZE="20G"
BACKUP_DIR="/backup/mongodb"
S3_BUCKET="s3://my-backups/mongodb"

echo "[$(date)] Starting MongoDB snapshot backup"

# Verify MongoDB is running
if ! $MONGOSH --quiet --eval "db.runCommand({ ping: 1 })" "$MONGO_URI" > /dev/null 2>&1; then
  echo "ERROR: MongoDB is not running"
  exit 1
fi

# Create LVM snapshot
sudo lvcreate --size "$SNAP_SIZE" --snapshot --name "$SNAP_NAME" "/dev/${LVM_VG}/${LVM_LV}"
echo "[$(date)] Snapshot created: $SNAP_NAME"

# Mount snapshot
sudo mkdir -p /mnt/snap
sudo mount -o ro "/dev/${LVM_VG}/${SNAP_NAME}" /mnt/snap

# Archive and upload
ARCHIVE_NAME="mongodb_$(date +%Y%m%d_%H%M%S).tar.gz"
sudo tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C /mnt/snap .
echo "[$(date)] Archive created: ${ARCHIVE_NAME}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}" "${S3_BUCKET}/${ARCHIVE_NAME}"
echo "[$(date)] Uploaded to S3"

# Cleanup
sudo umount /mnt/snap
sudo lvremove -f "/dev/${LVM_VG}/${SNAP_NAME}"
echo "[$(date)] Backup complete"
```

## Best Practices

- **Snapshot a secondary replica set member** to avoid performance impact on the primary.
- **WiredTiger checkpoints run every 60 seconds** - a crash-consistent snapshot is sufficient without locking.
- **Test restores regularly** - a snapshot you cannot restore from is useless.
- **Store snapshots in a different availability zone or region** from the primary data.
- **Tag snapshots** with the MongoDB version, replica set name, and timestamp for easy identification.
- **Automate retention** - automatically delete snapshots older than your retention period.
- **Monitor snapshot creation** - failed snapshots should trigger alerts.

## Summary

Filesystem snapshots provide fast, consistent MongoDB backups by capturing the entire data directory at a point in time. Use LVM snapshots on bare metal or VMs, or cloud provider snapshot APIs (EBS, GCP Persistent Disk, Azure Managed Disk) for cloud deployments. WiredTiger's journaling ensures crash consistency without requiring a write lock. Snapshot a secondary to avoid impacting primary traffic, archive to durable storage, and regularly test the restore procedure to verify backup integrity.
