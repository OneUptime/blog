# How to Troubleshoot 'Read-Only Filesystem' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Filesystem, Troubleshooting, Storage, Linux

Description: Diagnose and fix read-only filesystem errors on RHEL caused by disk errors, mount options, or kernel-triggered remounts due to corruption.

---

A "Read-only file system" error means the kernel or mount configuration is preventing writes. This usually happens when the kernel detects filesystem errors and remounts the partition as read-only to prevent data loss.

## Step 1: Identify the Problem

```bash
# Check which filesystems are read-only
mount | grep "ro,"

# Check kernel messages for filesystem errors
dmesg | grep -iE "readonly|read.only|EXT4-fs error|XFS.*error|remount"

# Try to write and confirm the error
touch /tmp/testfile
# touch: cannot touch '/tmp/testfile': Read-only file system
```

## Step 2: Check Disk Health

```bash
# Check SMART status for disk errors
sudo smartctl -H /dev/sda
sudo smartctl -a /dev/sda | grep -E "Reallocated|Current_Pending|Offline_Uncorrectable"

# Check for I/O errors in dmesg
dmesg | grep -i "i/o error"
```

## Step 3: Remount as Read-Write

```bash
# Try to remount the filesystem as read-write
sudo mount -o remount,rw /

# If it is a non-root filesystem
sudo mount -o remount,rw /dev/sda2 /data

# If the remount succeeds, the issue was temporary
# If it fails, there is an underlying error that needs fixing
```

## Step 4: Fix Filesystem Errors

For non-root filesystems:

```bash
# Unmount the filesystem
sudo umount /data

# For XFS
sudo xfs_repair /dev/sda2

# For ext4
sudo fsck -y /dev/sda2

# Remount
sudo mount /data
```

For the root filesystem:

```bash
# You cannot unmount the root filesystem while running
# Reboot into rescue mode or use:
sudo touch /forcefsck
sudo reboot

# This creates a flag file that triggers fsck at next boot
```

## Step 5: Check fstab for Wrong Mount Options

```bash
# Check if the filesystem is mounted with read-only options
cat /etc/fstab | grep -v "^#"

# Look for "ro" in the mount options
# If found, change it to "rw"
# Example (wrong):
# /dev/sda2 /data xfs ro 0 0
# Example (correct):
# /dev/sda2 /data xfs defaults 0 0
```

## Step 6: Check LVM Issues

```bash
# If using LVM, check if the volume group is available
sudo vgs
sudo lvs

# If volumes are missing, try scanning
sudo vgscan
sudo lvscan
sudo vgchange -ay
```

## Step 7: Handle Hardware Failures

If SMART reports failing disks:

```bash
# Back up data immediately
sudo rsync -avz /data/ /backup/

# Check for bad blocks
sudo badblocks -sv /dev/sda

# Plan disk replacement
```

## Prevent Future Issues

```bash
# Schedule regular filesystem checks for ext4
# Edit fstab and set the check count (6th field)
# /dev/sda2 /data ext4 defaults 0 2

# For XFS, run periodic scrubs
sudo xfs_scrub /dev/sda2

# Monitor disk health with smartd
sudo systemctl enable --now smartd
```

Read-only remounts are the kernel protecting your data from further corruption. Always investigate the root cause rather than just remounting as read-write.
