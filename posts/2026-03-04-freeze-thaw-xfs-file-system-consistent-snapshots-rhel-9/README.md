# How to Freeze and Thaw an XFS File System for Consistent Snapshots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Snapshots, Storage, Linux

Description: Learn how to use xfs_freeze to freeze and thaw XFS file systems on RHEL, enabling consistent point-in-time snapshots for backups and disaster recovery.

---

When taking storage-level snapshots of an active filesystem, there is a risk that in-flight I/O operations create an inconsistent snapshot. Freezing the filesystem temporarily halts all new write operations and flushes pending data to disk, ensuring the snapshot captures a clean, consistent state. This guide covers how to freeze and thaw XFS filesystems on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem to snapshot
- Snapshot capability (LVM, SAN, or VM-level snapshots)
- The `xfsprogs` package installed

## Understanding Filesystem Freeze

When you freeze an XFS filesystem:

1. All pending writes are flushed to disk
2. The filesystem journal is committed
3. New write operations are suspended (processes block until thaw)
4. Read operations continue normally
5. The filesystem is in a guaranteed consistent state

This window allows you to take a storage-level snapshot knowing the data is consistent.

## Step 1: Freeze the Filesystem

Use `xfs_freeze` to freeze:

```bash
sudo xfs_freeze -f /data
```

Or use the more general `fsfreeze` command (works with any filesystem that supports freezing):

```bash
sudo fsfreeze --freeze /data
```

The filesystem is now frozen. Any process attempting to write will block until the filesystem is thawed.

## Step 2: Take the Snapshot

With the filesystem frozen, take your snapshot:

### LVM Snapshot

```bash
sudo lvcreate --size 5G --snapshot --name lv_data_snap /dev/vg_data/lv_data
```

### VM-Level Snapshot

Use your hypervisor's snapshot feature (VMware, KVM, Hyper-V, etc.) while the filesystem is frozen.

### SAN-Level Snapshot

Trigger the SAN snapshot through your storage management interface.

## Step 3: Thaw the Filesystem

Immediately after the snapshot is created, thaw the filesystem:

```bash
sudo xfs_freeze -u /data
```

Or:

```bash
sudo fsfreeze --unfreeze /data
```

Blocked processes resume writing immediately.

## Step 4: Automate Freeze-Snapshot-Thaw

Create a script that combines the freeze, snapshot, and thaw into a single atomic operation:

```bash
sudo tee /usr/local/bin/snapshot.sh << 'SCRIPT'
#!/bin/bash
set -e

MOUNT_POINT="/data"
VG="vg_data"
LV="lv_data"
SNAP_SIZE="5G"
SNAP_NAME="snap_$(date +%Y%m%d_%H%M%S)"

echo "Freezing filesystem at $MOUNT_POINT..."
xfs_freeze -f "$MOUNT_POINT"

echo "Creating LVM snapshot..."
if lvcreate --size "$SNAP_SIZE" --snapshot --name "$SNAP_NAME" "/dev/$VG/$LV"; then
    echo "Snapshot $SNAP_NAME created successfully."
else
    echo "ERROR: Snapshot creation failed!"
fi

echo "Thawing filesystem..."
xfs_freeze -u "$MOUNT_POINT"

echo "Done."
SCRIPT
sudo chmod +x /usr/local/bin/snapshot.sh
```

The script uses `set -e` for error handling, but notice the thaw happens regardless of whether the snapshot succeeds, preventing the filesystem from staying frozen indefinitely.

A more robust version with a trap:

```bash
sudo tee /usr/local/bin/snapshot-safe.sh << 'SCRIPT'
#!/bin/bash
MOUNT_POINT="/data"
VG="vg_data"
LV="lv_data"
SNAP_SIZE="5G"
SNAP_NAME="snap_$(date +%Y%m%d_%H%M%S)"
FROZEN=0

cleanup() {
    if [ "$FROZEN" -eq 1 ]; then
        echo "Thawing filesystem..."
        xfs_freeze -u "$MOUNT_POINT"
    fi
}
trap cleanup EXIT

echo "Freezing filesystem..."
xfs_freeze -f "$MOUNT_POINT"
FROZEN=1

echo "Creating snapshot..."
lvcreate --size "$SNAP_SIZE" --snapshot --name "$SNAP_NAME" "/dev/$VG/$LV"

echo "Thawing filesystem..."
xfs_freeze -u "$MOUNT_POINT"
FROZEN=0

echo "Snapshot $SNAP_NAME created successfully."
SCRIPT
sudo chmod +x /usr/local/bin/snapshot-safe.sh
```

## Step 5: Verify the Snapshot

Mount and verify the snapshot:

```bash
sudo mkdir -p /mnt/snapshot
sudo mount -o ro /dev/vg_data/snap_20260304_120000 /mnt/snapshot
ls -la /mnt/snapshot
```

Compare with the live filesystem to verify consistency:

```bash
diff <(ls -laR /data/) <(ls -laR /mnt/snapshot/)
```

## Step 6: Schedule Automated Snapshots

Use cron to run snapshots on a schedule:

```bash
echo '0 */6 * * * root /usr/local/bin/snapshot-safe.sh >> /var/log/snapshot.log 2>&1' | \
  sudo tee /etc/cron.d/filesystem-snapshot
```

## Managing Snapshot Lifecycle

### List Snapshots

```bash
sudo lvs -o lv_name,lv_size,origin,snap_percent | grep snap
```

### Remove Old Snapshots

```bash
sudo umount /mnt/snapshot
sudo lvremove /dev/vg_data/snap_20260304_120000
```

### Automate Cleanup

Add cleanup logic to the snapshot script:

```bash
# Remove snapshots older than 7 days
for snap in $(lvs --noheadings -o lv_name vg_data | grep "^  snap_"); do
    snap_date=$(echo "$snap" | sed 's/snap_//' | cut -d_ -f1)
    if [ "$(date -d "$snap_date" +%s 2>/dev/null)" -lt "$(date -d '7 days ago' +%s)" ]; then
        lvremove -f "/dev/vg_data/$snap"
    fi
done
```

## Important Considerations

### Freeze Duration

Keep the freeze window as short as possible. Even a few seconds of frozen writes can cause application timeouts. The ideal pattern is:

1. Freeze
2. Trigger snapshot (returns immediately on most storage systems)
3. Thaw

The entire sequence should take less than a second.

### Application Awareness

Some applications (like databases) have their own snapshot or quiesce mechanisms. It is better to use application-level consistency tools when available:

- MySQL: `FLUSH TABLES WITH READ LOCK`
- PostgreSQL: `pg_start_backup()`
- MongoDB: `db.fsyncLock()`

Then freeze the filesystem for the storage snapshot.

### Never Freeze the Root Filesystem

Freezing the root filesystem can lock up the entire system. If you need a consistent root snapshot, use other methods such as booting from rescue media.

### Watchdog Timer

For automated snapshot scripts, consider using a watchdog that thaws the filesystem if the script hangs:

```bash
# Thaw after 30 seconds as a safety net
(sleep 30 && xfs_freeze -u /data 2>/dev/null) &
WATCHDOG_PID=$!

# Do the snapshot
xfs_freeze -f /data
lvcreate --size 5G --snapshot --name snap /dev/vg_data/lv_data
xfs_freeze -u /data

# Kill the watchdog
kill $WATCHDOG_PID 2>/dev/null
```

## Conclusion

Freezing and thawing XFS filesystems on RHEL is a reliable technique for taking consistent storage-level snapshots. By combining `xfs_freeze` with LVM or SAN snapshots, you can create point-in-time copies of your data without stopping applications. The key is to minimize the freeze window, always ensure the thaw happens (even on errors), and integrate with application-level consistency mechanisms when available.
