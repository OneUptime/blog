# How to Fix XFS Metadata Corruption Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, File System, Corruption, Storage, Troubleshooting

Description: Diagnose and repair XFS metadata corruption on RHEL using xfs_repair, including handling the default root filesystem format.

---

XFS is the default filesystem on RHEL. When metadata corruption occurs, the filesystem may become read-only or unmountable. The primary repair tool is `xfs_repair`.

## Identifying XFS Corruption

```bash
# Check kernel messages for XFS errors
sudo dmesg | grep -i "XFS"

# Look for messages like:
# XFS (sda2): Metadata I/O error
# XFS (sda2): Corruption of in-memory data detected
# XFS (sda2): Shutting down filesystem

# Check the system journal
sudo journalctl -k --since "1 hour ago" | grep -i xfs
```

## Running xfs_repair

xfs_repair must be run on an unmounted filesystem.

```bash
# For a non-root filesystem
sudo umount /data

# Run xfs_repair
sudo xfs_repair /dev/sdb1

# If xfs_repair complains about a dirty log, clear it first
# WARNING: This discards the log, which may lose recent transactions
sudo xfs_repair -L /dev/sdb1

# Remount after repair
sudo mount /data
```

## Repairing the Root Filesystem

The root filesystem cannot be unmounted while running. You need to boot into rescue mode.

```bash
# Option 1: Boot from RHEL installation media
# Select "Troubleshooting" > "Rescue a Red Hat Enterprise Linux system"

# Option 2: Boot into emergency mode
# At the GRUB menu, press 'e' and add: systemd.unit=emergency.target
# The root filesystem will be mounted read-only

# In rescue/emergency mode:
umount /mnt/sysroot   # if mounted by rescue environment
xfs_repair /dev/sda2  # your root partition

# Or if the log needs clearing
xfs_repair -L /dev/sda2

# Reboot after repair
reboot
```

## Using xfs_metadump for Diagnosis

Before running repair, capture metadata for analysis.

```bash
# Create a metadata dump for analysis (safe, read-only operation)
sudo xfs_metadump /dev/sdb1 /tmp/xfs_metadata.dump

# Examine the metadata dump
sudo xfs_mdrestore /tmp/xfs_metadata.dump /tmp/xfs_image
sudo xfs_repair -n /tmp/xfs_image  # -n is no-modify (dry run)
```

## Checking Filesystem Consistency

```bash
# Run a read-only check (does not modify anything)
sudo xfs_repair -n /dev/sdb1

# Check the filesystem for fragmentation
sudo xfs_db -r -c "frag -f" /dev/sdb1

# View filesystem geometry and info
sudo xfs_info /data
```

## Preventing Future Corruption

```bash
# Check for disk hardware issues
sudo smartctl -H /dev/sda

# Monitor for I/O errors
sudo dmesg | grep -i "I/O error"

# Ensure UPS protection for servers
# Unclean shutdowns are a common cause of XFS corruption
```

Always back up important data before running `xfs_repair -L`, as it discards the filesystem log and any uncommitted transactions will be lost.
