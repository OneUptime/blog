# How to Format a Partition with ext4, XFS, or Btrfs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, File System, Storage, System Administration

Description: Format partitions on Ubuntu with ext4, XFS, or Btrfs filesystems, understand the differences between them, and choose the right filesystem for your workload.

---

After creating partitions, you need to create a filesystem on them before they can store data. Ubuntu supports several Linux-native filesystems. Choosing between ext4, XFS, and Btrfs depends on your workload characteristics, need for advanced features, and operational requirements. This covers practical formatting commands and the key differences between the three.

## Quick Reference: Which Filesystem to Choose

| Criteria | ext4 | XFS | Btrfs |
|----------|------|-----|-------|
| General purpose | Excellent | Good | Good |
| Large files / high throughput | Good | Excellent | Good |
| Many small files | Good | Good | Variable |
| Snapshots | No (natively) | No | Yes |
| Data checksums | No | No | Yes |
| Resize (shrink) | Yes | No | Yes |
| Maturity | Very high | Very high | Moderate |
| Default on Ubuntu | Yes | No | No |

**Choose ext4** when you want stability and broad tool compatibility. It's the Ubuntu default and well-understood.

**Choose XFS** for high-throughput workloads with large files (databases, media storage, log aggregation at scale). XFS handles parallel I/O exceptionally well.

**Choose Btrfs** when you need built-in snapshots, subvolumes, or data integrity checksums. Note that Btrfs is less mature and has some operational complexity.

## Formatting with ext4

```bash
# Basic ext4 format
sudo mkfs.ext4 /dev/sdb1

# With a volume label (makes identifying the filesystem easier)
sudo mkfs.ext4 -L "data-disk" /dev/sdb1

# Specify inode density for workloads with many small files
# -i bytes-per-inode (lower = more inodes = better for many small files)
sudo mkfs.ext4 -i 4096 /dev/sdb1   # High inode density
sudo mkfs.ext4 -i 65536 /dev/sdb1  # Low inode density (large files)

# Tune for SSD (disable journaling of full data, enable extent feature)
sudo mkfs.ext4 -E lazy_itable_init=0,lazy_journal_init=0 /dev/sdb1

# View current ext4 settings after formatting
sudo tune2fs -l /dev/sdb1
```

### Important ext4 options

```bash
# Create filesystem and display progress
sudo mkfs.ext4 -v /dev/sdb1

# Set reserved blocks percentage (default 5%, can reduce for non-root filesystems)
sudo mkfs.ext4 -m 1 /dev/sdb1

# Or change after formatting
sudo tune2fs -m 1 /dev/sdb1
```

The default 5% reserved block space is meant to prevent root processes from being unable to write when the filesystem fills up. For a data disk used by non-root applications, reducing this to 1% or 0% frees up usable space.

## Formatting with XFS

```bash
# Install XFS tools if not present
sudo apt install xfsprogs

# Basic XFS format
sudo mkfs.xfs /dev/sdb1

# With label
sudo mkfs.xfs -L "data-disk" /dev/sdb1

# Force overwrite if partition already has a filesystem
sudo mkfs.xfs -f /dev/sdb1

# Set block size (4096 is default and usually optimal)
sudo mkfs.xfs -b size=4096 /dev/sdb1

# Large scale storage: use 1MB block size for fewer inodes and better performance
# with very large files
sudo mkfs.xfs -b size=1048576 /dev/sdb1

# For SSDs: set sunit and swidth to match SSD stripe parameters
sudo mkfs.xfs -d su=128k,sw=1 /dev/sdb1
```

### XFS metadata

After formatting, view XFS parameters:

```bash
sudo xfs_info /dev/sdb1
# Or when mounted:
sudo xfs_info /mnt/data
```

XFS cannot be shrunk after creation, only grown. Plan your partition sizes carefully before formatting with XFS.

## Formatting with Btrfs

```bash
# Install Btrfs tools
sudo apt install btrfs-progs

# Basic Btrfs format
sudo mkfs.btrfs /dev/sdb1

# With label
sudo mkfs.btrfs -L "data-disk" /dev/sdb1

# Multi-device Btrfs filesystem (RAID-like features)
# RAID 0 across two devices
sudo mkfs.btrfs -d raid0 /dev/sdb1 /dev/sdc1

# RAID 1 (mirroring)
sudo mkfs.btrfs -d raid1 -m raid1 /dev/sdb1 /dev/sdc1
```

### Btrfs subvolumes

One of Btrfs's main advantages is subvolumes, which can be used like directories but have independent snapshot capabilities:

```bash
# Mount the Btrfs filesystem
sudo mount /dev/sdb1 /mnt/btrfs-root

# Create subvolumes
sudo btrfs subvolume create /mnt/btrfs-root/@
sudo btrfs subvolume create /mnt/btrfs-root/@home

# List subvolumes
sudo btrfs subvolume list /mnt/btrfs-root

# Create a snapshot
sudo btrfs subvolume snapshot /mnt/btrfs-root/@ /mnt/btrfs-root/@snapshot-20260302
```

View Btrfs filesystem info:

```bash
sudo btrfs filesystem show /dev/sdb1
sudo btrfs filesystem df /mnt/data
```

## Verifying the Filesystem After Formatting

After formatting, always verify the filesystem was created correctly:

```bash
# For ext4
sudo e2fsck -n /dev/sdb1  # -n = read-only check
sudo tune2fs -l /dev/sdb1 | grep -E "Filesystem|Block size|Inode count"

# For XFS
sudo xfs_check /dev/sdb1 2>/dev/null || sudo xfs_repair -n /dev/sdb1

# For Btrfs
sudo btrfs check /dev/sdb1
```

## Mounting the New Filesystem

```bash
# Create a mount point
sudo mkdir -p /data

# Mount temporarily
sudo mount /dev/sdb1 /data

# Verify it mounted correctly
df -hT /data
```

Output should show the filesystem type and available space:

```
Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/sdb1      ext4  196G   60M  186G   1% /data
```

## Adding to /etc/fstab for Persistent Mount

Always use UUID in fstab rather than device paths, which can change between reboots:

```bash
# Get the UUID
sudo blkid /dev/sdb1

# Example output:
# /dev/sdb1: UUID="abc12345-def6-7890-abcd-ef1234567890" TYPE="ext4" ...

# Add to fstab (substitute your actual UUID and mount options)
sudo nano /etc/fstab
```

Add the appropriate line based on your filesystem:

```bash
# ext4 entry
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  ext4  defaults,noatime  0  2

# XFS entry
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  xfs   defaults,noatime  0  2

# Btrfs entry with subvolume
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  btrfs subvol=@,noatime  0  2
```

The `noatime` option prevents updating access timestamps on reads, improving performance especially on SSDs.

Test fstab before rebooting:

```bash
# Unmount and test the fstab entry
sudo umount /data
sudo mount -a  # Mounts all entries in fstab
df -h /data    # Verify it mounted
```

## Filesystem-Specific Performance Tuning

### ext4 with SSD

```bash
# Enable discard (TRIM) and disable journaling for frequently written data
sudo tune2fs -o journal_data_writeback /dev/sdb1

# Mount with SSD-appropriate options
sudo mount -o noatime,discard /dev/sdb1 /data
```

### XFS with large file workloads

```bash
# Mount with additional write performance options for data disks
sudo mount -o noatime,largeio,inode64 /dev/sdb1 /data
```

### Btrfs with compression

```bash
# Mount with transparent compression (good for text-heavy workloads)
sudo mount -o compress=zstd /dev/sdb1 /data

# Or use lzo for slightly less compression but faster
sudo mount -o compress=lzo /dev/sdb1 /data
```

For most Ubuntu server deployments, ext4 is the right default choice. It's stable, well-supported, and has decades of production testing. XFS becomes attractive when you're dealing with large files and need consistent high-throughput performance. Btrfs is the choice when you need snapshotting capabilities and are comfortable with its operational requirements.
