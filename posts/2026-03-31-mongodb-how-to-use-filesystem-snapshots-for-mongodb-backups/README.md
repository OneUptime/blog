# How to Use Filesystem Snapshots for MongoDB Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Snapshot, DevOps

Description: Learn how to use filesystem snapshots (LVM, EBS, ZFS) to create consistent MongoDB backups with minimal downtime, ideal for large databases.

---

## Overview

For large MongoDB databases where `mongodump` would take too long or impact performance, filesystem-level snapshots are the preferred backup approach. Snapshots capture the entire filesystem state at an instant in time, making them both fast and consistent. This guide covers using LVM snapshots on Linux, AWS EBS snapshots, and ZFS snapshots.

## Prerequisites for Consistent Snapshots

MongoDB must be using the WiredTiger storage engine (default since 3.2). For a consistent snapshot, MongoDB needs to be in a clean state - either journal-enabled (which is the default) or with writes stopped.

```javascript
// Verify WiredTiger is being used
db.serverStatus().storageEngine
// { name: 'wiredTiger', persistent: true, supportsCommittedReads: true }

// Check journal is enabled
db.adminCommand({ getCmdLineOpts: 1 }).parsed.storage.journal
```

## Method 1 - LVM Snapshots on Linux

### Prerequisites

MongoDB data must be on an LVM logical volume:

```bash
# Check if MongoDB data is on LVM
df -h /var/lib/mongodb
mount | grep mongodb
lvdisplay | grep -A5 "mongodb"
```

### Taking an LVM Snapshot

```bash
# 1. Lock the filesystem to flush pending writes (optional but recommended for non-journaled setups)
mongosh --eval "db.adminCommand({ fsync: 1, lock: true })"

# 2. Create the LVM snapshot
sudo lvcreate --size 10G --snapshot --name mongodb-snap /dev/vg0/mongodb-data

# 3. Unlock MongoDB (if locked)
mongosh --eval "db.adminCommand({ fsyncUnlock: 1 })"

# 4. Mount the snapshot
sudo mkdir -p /mnt/mongodb-snap
sudo mount -o ro /dev/vg0/mongodb-snap /mnt/mongodb-snap

# 5. Copy data from snapshot
sudo rsync -avz /mnt/mongodb-snap/ /backup/mongodb-$(date +%Y%m%d)/

# 6. Unmount and remove snapshot
sudo umount /mnt/mongodb-snap
sudo lvremove -f /dev/vg0/mongodb-snap
```

### Using fsync Lock for Consistency

```javascript
// Lock MongoDB to flush all writes to disk
db.adminCommand({ fsync: 1, lock: true })

// Verify the lock
db.currentOp()
// Look for "fsyncLock: true" in output

// After snapshot is taken, unlock
db.adminCommand({ fsyncUnlock: 1 })
```

## Method 2 - AWS EBS Snapshots

EBS snapshots are crash-consistent by default. For application-consistent snapshots, use fsync lock:

```bash
#!/bin/bash
# Script for EBS snapshot backup

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
VOLUME_ID="vol-0123456789abcdef0"  # MongoDB data volume ID
REGION="us-east-1"

# 1. Lock MongoDB
mongosh --eval 'db.adminCommand({ fsync: 1, lock: true })'

# 2. Create EBS snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot   --region "${REGION}"   --volume-id "${VOLUME_ID}"   --description "MongoDB backup $(date +%Y-%m-%d)"   --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=mongodb-backup},{Key=Date,Value=$(date +%Y%m%d)}]"   --query SnapshotId   --output text)

# 3. Unlock MongoDB
mongosh --eval 'db.adminCommand({ fsyncUnlock: 1 })'

echo "Snapshot created: ${SNAPSHOT_ID}"

# 4. Wait for snapshot to complete
aws ec2 wait snapshot-completed   --region "${REGION}"   --snapshot-ids "${SNAPSHOT_ID}"

echo "Snapshot complete: ${SNAPSHOT_ID}"
```

### Restoring from EBS Snapshot

```bash
# 1. Create a new volume from snapshot
aws ec2 create-volume   --region us-east-1   --snapshot-id snap-0123456789abcdef0   --availability-zone us-east-1a   --volume-type gp3

# 2. Attach the volume to an EC2 instance
aws ec2 attach-volume   --volume-id vol-0987654321fedcba0   --instance-id i-0123456789abcdef0   --device /dev/sdf

# 3. Mount and start mongod pointing to restored data
sudo mount /dev/sdf /var/lib/mongodb
sudo systemctl start mongod
```

## Method 3 - ZFS Snapshots

ZFS provides atomic snapshots with very low overhead:

```bash
# Create a ZFS snapshot
sudo zfs snapshot zpool/mongodb@backup-$(date +%Y%m%d)

# List snapshots
sudo zfs list -t snapshot | grep mongodb

# Clone snapshot to a new dataset (for offline copy)
sudo zfs clone zpool/mongodb@backup-20260331 zpool/mongodb-restore-20260331

# Send snapshot to a remote server
sudo zfs send zpool/mongodb@backup-20260331 |   ssh backup-server "zfs receive backup/mongodb-20260331"

# Roll back to a previous snapshot (DESTRUCTIVE - deletes later changes)
sudo zfs rollback zpool/mongodb@backup-20260331
```

## Automating Snapshot Backups

```bash
#!/bin/bash
# snapshot-backup.sh

LOG_FILE="/var/log/mongodb-backup.log"
RETENTION_DAYS=7

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Lock MongoDB for consistent snapshot
log "Locking MongoDB..."
mongosh --quiet --eval 'db.adminCommand({ fsync: 1, lock: true }); print("locked")'

# Take LVM snapshot
log "Creating LVM snapshot..."
lvcreate --size 20G --snapshot --name mongodb-snap-$(date +%Y%m%d) /dev/vg0/mongodb-data

# Unlock immediately
log "Unlocking MongoDB..."
mongosh --quiet --eval 'db.adminCommand({ fsyncUnlock: 1 })'

# Archive snapshot in background
log "Archiving snapshot..."
mount -o ro /dev/vg0/mongodb-snap-$(date +%Y%m%d) /mnt/snap
tar czf /backup/mongodb-$(date +%Y%m%d).tar.gz -C /mnt/snap .
umount /mnt/snap
lvremove -f /dev/vg0/mongodb-snap-$(date +%Y%m%d)

# Clean up old backups
find /backup -name "mongodb-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

log "Backup complete"
```

## Summary

Filesystem snapshots are the preferred backup method for large MongoDB deployments because they operate at the storage level, minimizing the backup window to seconds regardless of database size. LVM snapshots work on Linux with LVM-managed volumes, EBS snapshots work on AWS, and ZFS provides built-in atomic snapshots. Combining MongoDB's fsync lock with filesystem snapshots ensures application-consistent backups that accurately reflect a specific point in time.
