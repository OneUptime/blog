# How to Fix 'XFS Metadata I/O Error' and Recover a Corrupted XFS Filesystem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Filesystem, Recovery, Troubleshooting, Storage

Description: Recover from XFS metadata I/O errors on RHEL by running xfs_repair, checking disk health, and restoring the filesystem to a consistent state.

---

XFS metadata I/O errors indicate corruption or hardware issues on an XFS filesystem. These errors can cause the filesystem to remount as read-only or become completely inaccessible.

## Identify the Problem

```bash
# Check kernel messages for XFS errors
dmesg | grep -i xfs

# Typical error messages:
# XFS (sda1): metadata I/O error in "xfs_trans_read_buf_map"
# XFS (sda1): log I/O error
# XFS (sda1): Filesystem has been shut down due to log error

# Check if the filesystem was remounted read-only
mount | grep sda1
```

## Step 1: Unmount the Filesystem

```bash
# Unmount the affected filesystem
sudo umount /dev/sda1

# If the device is busy
sudo fuser -km /dev/sda1
sudo umount /dev/sda1

# If it is the root filesystem, boot into rescue mode
```

## Step 2: Check Disk Health

Before repairing, verify the underlying disk is not failing:

```bash
# Check SMART status
sudo smartctl -a /dev/sda

# Look for "Reallocated Sector Count" or "Current Pending Sector"
sudo smartctl -H /dev/sda
# Should say: PASSED

# If SMART shows errors, replace the disk before repairing
```

## Step 3: Run xfs_repair

```bash
# Run xfs_repair on the unmounted filesystem
sudo xfs_repair /dev/sda1

# If the log is corrupted and xfs_repair refuses to run:
# Force log zeroing (this may lose recent data)
sudo xfs_repair -L /dev/sda1

# The -L flag zeroes out the dirty log
# Only use this if regular xfs_repair fails
```

## Step 4: Check the Repair Output

```bash
# xfs_repair will report what it found and fixed:
# - Phase 1: finding and verifying superblock
# - Phase 2: using internal log
# - Phase 3: checking for duplicate blocks
# - Phase 4: checking for bad blocks
# - Phase 5: rebuilding AG headers and trees
# - Phase 6: checking inode connectivity
# - Phase 7: verifying link counts

# After repair, mount the filesystem
sudo mount /dev/sda1 /mnt/data

# Check for a lost+found directory
ls -la /mnt/data/lost+found/
```

## Step 5: Verify the Filesystem

```bash
# Check filesystem details
xfs_info /mnt/data

# Run a read-only check (with the filesystem mounted)
sudo xfs_scrub /dev/sda1
```

## If xfs_repair Cannot Fix It

```bash
# Try to dump and restore as a last resort
# Mount the damaged filesystem read-only
sudo mount -o ro,norecovery /dev/sda1 /mnt/damaged

# Dump what you can
sudo xfsdump -f /tmp/xfs-backup - /mnt/damaged

# Create a new XFS filesystem on a replacement disk
sudo mkfs.xfs /dev/sdb1

# Restore from dump
sudo mount /dev/sdb1 /mnt/restored
sudo xfsrestore -f /tmp/xfs-backup - /mnt/restored
```

Regular backups are the best protection against filesystem corruption. XFS is robust, but hardware failures can corrupt any filesystem.
