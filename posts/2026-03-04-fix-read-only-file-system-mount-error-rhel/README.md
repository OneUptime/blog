# How to Fix 'Read-Only File System' Mount Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, File System, Troubleshooting, Mount, Storage

Description: Diagnose and fix 'Read-only file system' errors on RHEL caused by filesystem corruption, mount options, or hardware issues.

---

A "Read-only file system" error means the filesystem has been remounted as read-only. This typically happens due to filesystem corruption, disk errors, or explicit mount options.

## Identify Which Filesystem Is Read-Only

```bash
# Check mount options for all filesystems
mount | grep "ro,"

# Or use findmnt for a cleaner view
findmnt -o TARGET,FSTYPE,OPTIONS | grep "\bro\b"
```

## Check for Filesystem Errors

```bash
# Check the system log for filesystem errors
sudo journalctl -k | grep -i "error\|EXT4-fs\|XFS\|readonly\|read-only"

# Check dmesg for disk errors
sudo dmesg | grep -i "error\|fail\|readonly" | tail -20
```

## Fix 1: Remount as Read-Write

If there is no underlying corruption, simply remounting may work.

```bash
# Remount the filesystem as read-write
sudo mount -o remount,rw /

# Verify it is now read-write
mount | grep " / "
```

## Fix 2: Repair Filesystem Corruption

If remounting fails or the filesystem keeps reverting to read-only, there is likely corruption.

For XFS filesystems:

```bash
# XFS repair must be done on an unmounted filesystem
# If it is the root filesystem, boot into rescue mode

# For a non-root filesystem
sudo umount /data
sudo xfs_repair /dev/sdb1
sudo mount /data
```

For ext4 filesystems:

```bash
# Unmount the filesystem first
sudo umount /data

# Run filesystem check and repair
sudo fsck.ext4 -y /dev/sdb1

# Remount
sudo mount /data
```

## Fix 3: Check for Hardware Issues

```bash
# Check SMART data on the disk
sudo smartctl -a /dev/sda

# Look for reallocated sectors or pending sectors
sudo smartctl -A /dev/sda | grep -E "Reallocated|Pending|Offline_Uncorrectable"

# Check for disk I/O errors in the kernel log
sudo dmesg | grep -i "I/O error"
```

## Fix 4: Check /etc/fstab Mount Options

```bash
# Verify the filesystem is not explicitly mounted as read-only
cat /etc/fstab

# Look for "ro" in the mount options
# The correct option for read-write is "defaults" or "rw"
# Example of a correct entry:
# /dev/sdb1 /data xfs defaults 0 0

# If fstab had ro, fix it and remount
sudo mount -o remount,rw /data
```

## Fix 5: Root Filesystem in Emergency Mode

If the root filesystem is read-only during boot:

```bash
# Remount root as read-write in emergency mode
mount -o remount,rw /

# Fix the underlying issue (fstab, corruption)
# Then reboot
systemctl reboot
```

A filesystem going read-only is usually a sign of disk problems. After fixing the immediate issue, investigate the underlying cause to prevent data loss.
