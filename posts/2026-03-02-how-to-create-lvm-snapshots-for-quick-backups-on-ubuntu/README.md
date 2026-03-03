# How to Create LVM Snapshots for Quick Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Snapshot, Backup, Storage

Description: Create LVM snapshots on Ubuntu for instant point-in-time backups, understand how copy-on-write works, and use snapshots for consistent data backup workflows.

---

LVM snapshots give you a point-in-time consistent view of a Logical Volume without stopping services or waiting for a full copy. They're fast to create (seconds, regardless of volume size), space-efficient (only store changed data), and work while the volume is mounted and in use. This makes them an excellent tool for database backups, pre-upgrade checkpoints, and recovery points.

## How LVM Snapshots Work

When you create a snapshot, LVM doesn't copy the data. Instead, it:

1. Records the exact state of the LV's extent mapping at that moment
2. Allocates a separate LV (the snapshot LV) to store changed data
3. As writes happen to the original LV, LVM copies the original data to the snapshot LV before overwriting it (copy-on-write)

The snapshot always represents the data as it was at creation time. Reading from the snapshot returns original data (from the snapshot store if modified, from the original LV if unchanged).

The snapshot LV grows as changes accumulate. If it fills completely, the snapshot becomes invalid. Size the snapshot appropriately for the expected write volume during the backup window.

## Creating a Snapshot

### Basic snapshot creation

```bash
# Create a 20GB snapshot of db_data
# Snapshot is stored in the same VG and needs free space there
sudo lvcreate -L 20G -s -n db_data_snap /dev/data_vg/db_data
```

Flags:
- `-L 20G` - snapshot store size (not the size of the original LV)
- `-s` - create a snapshot
- `-n db_data_snap` - name for the snapshot LV
- `/dev/data_vg/db_data` - the original LV (the "origin")

Output:
```text
  Logical volume "db_data_snap" created.
```

### Using a percentage of the origin size

A common rule of thumb: size the snapshot at 10-20% of the origin if writes during the backup window are moderate:

```bash
# 15% of the origin LV size
sudo lvcreate -l 15%ORIGIN -s -n db_data_snap /dev/data_vg/db_data
```

### Verify the snapshot

```bash
sudo lvs
```

```text
  LV           VG       Attr       LSize   Pool Origin  Data%  Meta%
  db_data      data_vg  owi-aos--- 200.00g
  db_data_snap data_vg  swi-a-s---  20.00g      db_data 0.00
```

The `s` in the Attr column indicates a snapshot. `Data%` shows how full the snapshot store is (0% right after creation).

## Mounting and Using the Snapshot

The snapshot LV can be mounted read-only for backup purposes:

```bash
# Create a mount point
sudo mkdir -p /mnt/db_snapshot

# Mount the snapshot read-only
sudo mount -o ro /dev/data_vg/db_data_snap /mnt/db_snapshot

# Browse the data as it was at snapshot creation time
ls /mnt/db_snapshot
```

### Copying data from the snapshot for backup

```bash
# rsync the snapshot to a backup location
sudo rsync -av --progress /mnt/db_snapshot/ /backup/db_data_$(date +%Y%m%d)/

# Or create a compressed archive
sudo tar czf /backup/db_data_$(date +%Y%m%d).tar.gz -C /mnt/db_snapshot .
```

This gives you a consistent backup of the data at snapshot creation time, even if the original LV continues to be written to during the backup.

## Database-Consistent Snapshots

For databases, take the snapshot while the database is in a consistent state. The approach varies by database:

### PostgreSQL

```bash
# Put PostgreSQL into backup mode for a moment-in-time consistent snapshot
sudo -u postgres psql -c "SELECT pg_start_backup('lvm_backup', true);"

# Create the snapshot immediately
sudo lvcreate -L 20G -s -n pg_snap /dev/data_vg/pg_data

# End backup mode
sudo -u postgres psql -c "SELECT pg_stop_backup();"
```

### MySQL/MariaDB

```bash
# Flush and lock tables
sudo mysql -e "FLUSH TABLES WITH READ LOCK; SYSTEM sudo lvcreate -L 20G -s -n mysql_snap /dev/data_vg/mysql_data; UNLOCK TABLES;"
```

Or lock, snapshot, unlock in sequence:

```bash
sudo mysql -e "FLUSH TABLES WITH READ LOCK;"
sudo lvcreate -L 20G -s -n mysql_snap /dev/data_vg/mysql_data
sudo mysql -e "UNLOCK TABLES;"
```

## Monitoring Snapshot Usage

Watch snapshot fill percentage to avoid overflow:

```bash
# Check data percentage of all snapshots
sudo lvs -o name,origin,snap_percent

# Watch it live during a backup
watch -n 10 'sudo lvs -o name,origin,snap_percent'
```

```text
  LV           Origin  Snap%
  db_data_snap db_data  12.45
```

If it approaches 100%, the snapshot will become invalid. Keep backups running on appropriate hardware and size snapshots generously.

### Set up monitoring alerts

Create a simple monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/check-lvm-snapshots.sh
# Check if any snapshot is more than 80% full

THRESHOLD=80

while IFS= read -r line; do
    snap_name=$(echo "$line" | awk '{print $1}')
    snap_pct=$(echo "$line" | awk '{print $2}' | cut -d. -f1)

    if [ -n "$snap_pct" ] && [ "$snap_pct" -ge "$THRESHOLD" ]; then
        echo "WARNING: Snapshot $snap_name is ${snap_pct}% full"
        # Send alert via email, Slack, or monitoring system
    fi
done < <(sudo lvs --noheadings -o lv_name,snap_percent | grep -v "^$")
```

```bash
sudo chmod +x /usr/local/bin/check-lvm-snapshots.sh
# Add to cron for periodic checks
echo "*/10 * * * * root /usr/local/bin/check-lvm-snapshots.sh" | sudo tee -a /etc/cron.d/lvm-snapshot-monitor
```

## Extending a Snapshot That's Running Low

If a snapshot is filling up faster than expected:

```bash
# Extend snapshot store by 10GB
sudo lvextend -L +10G /dev/data_vg/db_data_snap
```

Or configure automatic extension in `/etc/lvm/lvm.conf`:

```text
snapshot_autoextend_threshold = 70  # extend when 70% full
snapshot_autoextend_percent = 20    # extend by 20% each time
```

Then ensure `dmeventd` is running (it monitors LVM events):

```bash
sudo systemctl enable --now lvm2-monitor.service
```

## Removing a Snapshot

After the backup is done, unmount and remove the snapshot:

```bash
# Unmount
sudo umount /mnt/db_snapshot

# Remove the snapshot LV
sudo lvremove /dev/data_vg/db_data_snap
```

Confirm deletion:
```text
  Do you really want to remove active logical volume data_vg/db_data_snap? [y/n]: y
  Logical volume "db_data_snap" successfully removed.
```

## Full Backup Script Example

Here's a practical backup script that ties everything together:

```bash
#!/bin/bash
# /usr/local/bin/lvm-backup.sh
# Create an LVM snapshot backup of PostgreSQL data

set -euo pipefail

VG="data_vg"
ORIGIN_LV="pg_data"
SNAP_LV="${ORIGIN_LV}_snap"
MOUNT_POINT="/mnt/pg_snapshot"
BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
SNAP_SIZE="20G"

echo "Starting LVM backup at $DATE"

# Ensure clean state
sudo umount "$MOUNT_POINT" 2>/dev/null || true
sudo lvremove -f "/dev/$VG/$SNAP_LV" 2>/dev/null || true

# Create snapshot
echo "Creating snapshot..."
sudo lvcreate -L "$SNAP_SIZE" -s -n "$SNAP_LV" "/dev/$VG/$ORIGIN_LV"

# Mount snapshot
sudo mkdir -p "$MOUNT_POINT"
sudo mount -o ro "/dev/$VG/$SNAP_LV" "$MOUNT_POINT"

# Backup
echo "Copying data..."
sudo mkdir -p "$BACKUP_DIR"
sudo tar czf "${BACKUP_DIR}/pg_data_${DATE}.tar.gz" -C "$MOUNT_POINT" .

# Cleanup
sudo umount "$MOUNT_POINT"
sudo lvremove -f "/dev/$VG/$SNAP_LV"

echo "Backup complete: ${BACKUP_DIR}/pg_data_${DATE}.tar.gz"
```

```bash
sudo chmod +x /usr/local/bin/lvm-backup.sh
# Schedule nightly
echo "0 2 * * * root /usr/local/bin/lvm-backup.sh" | sudo tee /etc/cron.d/lvm-backup
```

LVM snapshots are not a replacement for off-site backups, but they're an excellent first line of protection and make consistent backups of live databases practical without complex database-level tooling.
