# How to Take and Restore Stratis Snapshots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Snapshots, Storage, Linux

Description: Learn how to create, manage, and restore Stratis filesystem snapshots on RHEL for point-in-time data recovery and testing purposes.

---

Stratis provides built-in snapshot functionality that creates instant, space-efficient copies of filesystems. Snapshots are useful for creating backup points before making changes, testing modifications safely, and enabling quick rollbacks. This guide covers how to use Stratis snapshots on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An existing Stratis pool with at least one filesystem
- Stratis daemon running

## Understanding Stratis Snapshots

Stratis snapshots are:

- **Instant**: Created in seconds regardless of filesystem size
- **Space-efficient**: Only consume additional space as data diverges from the original
- **Full filesystems**: Snapshots are themselves complete XFS filesystems that can be mounted and used independently
- **Copy-on-write**: The snapshot and original share data blocks until one of them is modified

## Step 1: Create a Snapshot

Create a snapshot of an existing filesystem:

```bash
sudo stratis filesystem snapshot datapool documents documents-snap-20260304
```

Syntax: `stratis filesystem snapshot <pool> <source_filesystem> <snapshot_name>`

Verify:

```bash
sudo stratis filesystem list datapool
```

The snapshot appears as a new filesystem entry.

## Step 2: Mount the Snapshot

```bash
sudo mkdir -p /mnt/documents-snap
sudo mount /dev/stratis/datapool/documents-snap-20260304 /mnt/documents-snap
```

Verify:

```bash
df -Th /mnt/documents-snap
ls -la /mnt/documents-snap/
```

The snapshot contains an exact copy of the data at the time it was created.

## Step 3: Access Snapshot Data

Browse the snapshot:

```bash
ls -la /mnt/documents-snap/
```

Copy specific files from the snapshot:

```bash
cp /mnt/documents-snap/important-file.txt /documents/important-file.txt.restored
```

Compare the snapshot with the current state:

```bash
diff -r /documents/ /mnt/documents-snap/
```

## Step 4: Restore from a Snapshot

Stratis does not have a direct "restore" command. To restore a filesystem to a snapshot's state, you have several options:

### Option A: Replace Files from Snapshot

For restoring specific files:

```bash
sudo mount /dev/stratis/datapool/documents-snap-20260304 /mnt/documents-snap
sudo cp -a /mnt/documents-snap/path/to/file /documents/path/to/file
```

### Option B: Swap the Filesystem

For a complete restoration, create a new snapshot of the snapshot and swap:

```bash
# Unmount the original
sudo umount /documents

# Create a new filesystem from the snapshot
sudo stratis filesystem snapshot datapool documents-snap-20260304 documents-restored

# Mount the restored version
sudo mount /dev/stratis/datapool/documents-restored /documents
```

Update `/etc/fstab` with the UUID of the new filesystem:

```bash
sudo blkid /dev/stratis/datapool/documents-restored
```

### Option C: Full Copy Restore

```bash
# Unmount the original
sudo umount /documents

# Mount snapshot and new target
sudo mount /dev/stratis/datapool/documents-snap-20260304 /mnt/snap-source

# Destroy the original
sudo stratis filesystem destroy datapool documents

# Create a new filesystem
sudo stratis filesystem create datapool documents

# Mount and copy
sudo mount /dev/stratis/datapool/documents /documents
sudo rsync -av /mnt/snap-source/ /documents/
```

## Step 5: Manage Multiple Snapshots

Create snapshots at different points in time:

```bash
sudo stratis filesystem snapshot datapool documents documents-daily-mon
sudo stratis filesystem snapshot datapool documents documents-daily-tue
sudo stratis filesystem snapshot datapool documents documents-daily-wed
```

List all snapshots:

```bash
sudo stratis filesystem list datapool
```

## Step 6: Delete Snapshots

Remove snapshots you no longer need:

```bash
# Unmount first if mounted
sudo umount /mnt/documents-snap

# Destroy the snapshot
sudo stratis filesystem destroy datapool documents-snap-20260304
```

## Step 7: Automate Snapshot Creation

Create a script for scheduled snapshots:

```bash
sudo tee /usr/local/bin/stratis-snapshot.sh << 'SCRIPT'
#!/bin/bash
POOL="datapool"
FILESYSTEM="documents"
DATE=$(date +%Y%m%d-%H%M%S)
SNAP_NAME="${FILESYSTEM}-snap-${DATE}"
RETENTION_DAYS=7

# Create new snapshot
stratis filesystem snapshot "$POOL" "$FILESYSTEM" "$SNAP_NAME"
echo "Created snapshot: $SNAP_NAME"

# Clean up old snapshots
stratis filesystem list "$POOL" | grep "${FILESYSTEM}-snap-" | while read line; do
    snap_name=$(echo "$line" | awk '{print $2}')
    snap_date_str=$(echo "$snap_name" | sed "s/${FILESYSTEM}-snap-//" | cut -d- -f1)

    if [ ${#snap_date_str} -eq 8 ]; then
        snap_epoch=$(date -d "$snap_date_str" +%s 2>/dev/null)
        cutoff_epoch=$(date -d "$RETENTION_DAYS days ago" +%s)

        if [ -n "$snap_epoch" ] && [ "$snap_epoch" -lt "$cutoff_epoch" ]; then
            echo "Removing old snapshot: $snap_name"
            stratis filesystem destroy "$POOL" "$snap_name"
        fi
    fi
done
SCRIPT
sudo chmod +x /usr/local/bin/stratis-snapshot.sh
```

Schedule with cron:

```bash
echo '0 1 * * * root /usr/local/bin/stratis-snapshot.sh >> /var/log/stratis-snapshot.log 2>&1' | \
  sudo tee /etc/cron.d/stratis-snapshot
```

## Monitoring Snapshot Space Usage

Check how much pool space snapshots consume:

```bash
sudo stratis filesystem list datapool
sudo stratis pool list datapool
```

As data diverges between the original filesystem and its snapshots, both consume more pool space.

## Best Practices

- **Create snapshots before making changes**: Always snapshot before software updates, configuration changes, or data migrations.
- **Name snapshots descriptively**: Include the date and purpose in the snapshot name.
- **Clean up old snapshots**: Snapshots consume pool space as data diverges. Remove them when no longer needed.
- **Monitor pool usage**: Multiple snapshots can fill a pool quickly if data changes frequently.
- **Test restore procedures**: Regularly verify that you can successfully restore from snapshots.

## Conclusion

Stratis snapshots on RHEL provide a quick and space-efficient way to create point-in-time copies of your filesystems. While the restoration process requires a few manual steps compared to some other snapshot technologies, the simplicity of creation and the fact that snapshots are fully mountable filesystems makes them a practical tool for data protection, testing, and recovery scenarios.
