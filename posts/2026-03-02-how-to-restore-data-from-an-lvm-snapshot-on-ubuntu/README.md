# How to Restore Data from an LVM Snapshot on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Snapshot, Recovery, Storage

Description: Restore data from an LVM snapshot on Ubuntu using full volume merge or selective file restoration, with steps for handling database recovery scenarios.

---

LVM snapshots are only valuable if you can actually recover from them. This guide covers two restoration approaches: merging the snapshot back into the origin (a full rollback), and selectively restoring specific files from a mounted snapshot. The right choice depends on whether you need a complete rollback or just need to recover a few files.

## Before You Start: Assess the Situation

Check what snapshots are available:

```bash
sudo lvs -o name,origin,snap_percent,lv_attr
```

```text
  LV           Origin  Snap%  Attr
  db_data      data_vg        owi-aos---
  db_data_snap db_data 23.45  swi-a-s---
```

Ensure the snapshot is still valid (Snap% below 100%) and that the Attr shows `swi` (snapshot, writable, inactive/active). A snapshot at 100% is invalid and cannot be used.

## Method 1: Full Rollback via Snapshot Merge

A merge reverts the origin LV to exactly the state it was in when the snapshot was created. All changes made to the origin after the snapshot was taken are discarded.

**This is destructive to the changes made after the snapshot was created. Confirm that's what you want.**

### Step 1: Stop services using the volume

```bash
# Stop anything writing to the origin LV
sudo systemctl stop postgresql
# or nginx, mysql, etc.
```

### Step 2: Unmount the origin LV

```bash
sudo umount /var/lib/postgresql
```

For the root filesystem, this requires booting from a live USB or recovery mode, as you cannot unmount `/`.

### Step 3: Deactivate the origin LV

```bash
sudo lvchange -an /dev/data_vg/db_data
```

### Step 4: Merge the snapshot into the origin

```bash
sudo lvconvert --merge /dev/data_vg/db_data_snap
```

If the volume is inactive, the merge happens immediately:
```text
  Merging of volume data_vg/db_data_snap started.
  data_vg/db_data: Merged: 100.00%
```

If the LV is active (mounted), the merge is scheduled for the next activation:
```text
  Merging of snapshot data_vg/db_data_snap will occur on next activation of data_vg/db_data.
```

In that case:

```bash
# Reactivate the LV - this triggers the merge
sudo lvchange -ay /dev/data_vg/db_data
```

### Step 5: Remount and restart services

```bash
sudo mount /dev/data_vg/db_data /var/lib/postgresql
sudo systemctl start postgresql
```

After a successful merge, the snapshot LV no longer exists - it's been merged back into the origin.

### Verify the restoration

```bash
# Check the data looks as expected
ls -la /var/lib/postgresql/
df -h /var/lib/postgresql

# Confirm snapshot is gone
sudo lvs
```

## Method 2: Selective File Restoration from a Mounted Snapshot

If you only need to recover specific files, mount the snapshot and copy them. This is less disruptive - the origin LV stays up and running.

### Step 1: Mount the snapshot read-only

```bash
sudo mkdir -p /mnt/recovery
sudo mount -o ro /dev/data_vg/db_data_snap /mnt/recovery
```

### Step 2: Browse and identify files to recover

```bash
ls /mnt/recovery/
# Navigate to find what you need
ls /mnt/recovery/base/
```

### Step 3: Copy specific files back to the origin

While the origin is still mounted, copy individual files:

```bash
# Restore a specific configuration file
sudo cp /mnt/recovery/postgresql.conf /var/lib/postgresql/postgresql.conf

# Restore an entire directory
sudo rsync -av /mnt/recovery/pg_hba.conf /var/lib/postgresql/
```

For database files, stop the database first even for selective restores, as copying over active database files while the engine is running can corrupt the database:

```bash
sudo systemctl stop postgresql
sudo cp /mnt/recovery/base/16384/1259 /var/lib/postgresql/base/16384/1259
sudo systemctl start postgresql
```

### Step 4: Unmount and remove the snapshot

```bash
sudo umount /mnt/recovery
sudo lvremove /dev/data_vg/db_data_snap
```

## Method 3: Full Data Copy from Snapshot

If you want to restore data completely but keep the origin intact (for comparison or as a fallback), copy the snapshot's data to a new LV:

```bash
# Create a new LV the same size as the origin
sudo lvcreate -L 200G -n db_data_restored data_vg

# Format it (match the origin's filesystem)
sudo mkfs.ext4 /dev/data_vg/db_data_restored

# Mount both snapshot and new LV
sudo mount -o ro /dev/data_vg/db_data_snap /mnt/snapshot
sudo mount /dev/data_vg/db_data_restored /mnt/restored

# Copy everything
sudo rsync -av /mnt/snapshot/ /mnt/restored/

# Unmount
sudo umount /mnt/snapshot
sudo umount /mnt/restored

# Now you can mount the restored LV for testing
# before replacing the original
```

## Restoring to a Different Server

If the original server is gone and you have the VG on disks you've moved to a new server:

```bash
# Scan for LVM metadata on all disks
sudo vgscan --mknodes
sudo vgchange -ay

# List what was found
sudo lvs

# Mount the snapshot
sudo mount -o ro /dev/data_vg/db_data_snap /mnt/recovery
```

LVM metadata is stored on the PVs themselves, so it comes back automatically when you plug in the disks.

## Database-Specific Recovery from Snapshot

### PostgreSQL

Restoring PostgreSQL from an LVM snapshot requires point-in-time recovery if WAL archiving is set up, or a direct data directory restore:

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Mount snapshot
sudo mount -o ro /dev/data_vg/db_data_snap /mnt/pg_snap

# Back up current data directory (optional)
sudo mv /var/lib/postgresql/14/main /var/lib/postgresql/14/main.old

# Restore from snapshot
sudo rsync -av /mnt/pg_snap/ /var/lib/postgresql/14/main/

# Fix ownership
sudo chown -R postgres:postgres /var/lib/postgresql/14/main/

# Unmount snapshot
sudo umount /mnt/pg_snap

# Start PostgreSQL
sudo systemctl start postgresql

# Verify
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

## Common Issues During Restore

### "Can't merge over an active origin"

The origin LV must be inactive (unmounted) for a merge to proceed immediately. Unmount it and stop all services accessing it, then deactivate with `lvchange -an`.

### Snapshot shows 100% usage (invalid)

A filled snapshot is unusable. The data it was tracking is gone. Going forward, size snapshots more generously or extend them proactively as they fill.

### Merge scheduled but not completing

If `lvconvert --merge` says it will happen "on next activation" but then doesn't happen:

```bash
# Force deactivation and reactivation
sudo lvchange -an /dev/data_vg/db_data
sudo lvchange -ay /dev/data_vg/db_data
```

### Filesystem needs fsck after merge

After a merge, especially if the system was not shut down cleanly, run fsck before mounting:

```bash
sudo e2fsck -f /dev/data_vg/db_data
sudo mount /dev/data_vg/db_data /var/lib/postgresql
```

Snapshots are most useful when you understand both how to create them and how to recover from them. Testing a restore from a snapshot before you actually need it is time well spent.
