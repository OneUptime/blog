# How to List All Disks and Partitions on Ubuntu with lsblk and fdisk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Storage, System Administration, Linux

Description: Learn to list and inspect all disks, partitions, and block devices on Ubuntu using lsblk, fdisk, blkid, and related tools, with practical examples for storage troubleshooting.

---

Before you can partition, format, or troubleshoot storage on Ubuntu, you need to know what's there. Several tools give you different views of the same block devices: `lsblk` for a clean tree view, `fdisk -l` for partition table details, `blkid` for UUID and filesystem type information. Each has its place depending on what you're trying to find out.

## lsblk - Block Device Tree

`lsblk` reads from `/sys/block` and shows all block devices in a tree structure. It's the fastest way to get an overview.

```bash
lsblk
```

Output on a typical Ubuntu server:

```text
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda      8:0    0   50G  0 disk
├─sda1   8:1    0  512M  0 part /boot/efi
├─sda2   8:2    0    1G  0 part /boot
└─sda3   8:3    0 48.5G  0 part /
sdb      8:16   0  200G  0 disk
nvme0n1 259:0   0  500G  0 disk
├─nvme0n1p1 259:1 0  512M 0 part
└─nvme0n1p2 259:2 0 499.5G 0 part /data
```

### Common lsblk options

```bash
# Show filesystem type and UUID
lsblk -f

# Show size in bytes instead of human-readable
lsblk -b

# Show all columns
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID,MODEL,SERIAL

# Show only physical disks, not partitions
lsblk -d

# Include empty drives (not mounted)
lsblk -a

# Output as JSON for scripting
lsblk -J

# Show disk model and serial numbers
lsblk -d -o NAME,SIZE,MODEL,SERIAL,ROTA
# ROTA=1 means rotational (HDD), ROTA=0 means SSD
```

### Identifying SSDs vs HDDs

```bash
lsblk -d -o NAME,ROTA,SIZE,MODEL
```

Output:

```text
NAME    ROTA  SIZE MODEL
sda        1  500G TOSHIBA MQ01ABD100
nvme0n1    0  500G Samsung SSD 970 EVO
```

`ROTA=0` is a non-rotational device (SSD or NVMe), `ROTA=1` is a spinning disk.

## fdisk -l - Partition Table Details

`fdisk -l` reads partition tables and shows disk geometry, partition types, and sector ranges. It requires root to see all disks:

```bash
sudo fdisk -l
```

Output:

```text
Disk /dev/sda: 50 GiB, 53687091200 bytes, 104857600 sectors
Disk model: QEMU HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: A1B2C3D4-E5F6-7890-ABCD-EF1234567890

Device       Start       End   Sectors  Size Type
/dev/sda1     2048   1050623   1048576  512M EFI System
/dev/sda2  1050624   3147775   2097152    1G Linux filesystem
/dev/sda3  3147776 104855551 101707776 48.5G Linux filesystem
```

Key information from fdisk output:
- Disk size in bytes and sectors
- Disk model
- Logical/physical sector size (important for alignment)
- Partition table type (GPT or DOS/MBR)
- Per-partition: start sector, end sector, size, and type

```bash
# Show info for a specific disk only
sudo fdisk -l /dev/sdb

# List only partition tables without disk info
sudo fdisk -l | grep "^/dev/"

# Show sector units (default) or in KB/MB
sudo fdisk -l --bytes  # Show in bytes
```

## blkid - Block Device IDs

`blkid` shows UUID, filesystem type, and other attributes for each block device:

```bash
sudo blkid
```

Output:

```text
/dev/sda1: UUID="ABC1-DEF2" TYPE="vfat" PARTLABEL="EFI System Partition" PARTUUID="..."
/dev/sda2: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="ext4" PARTUUID="..."
/dev/sda3: UUID="b2c3d4e5-f6a7-8901-bcde-f01234567890" TYPE="ext4" PARTUUID="..."
```

```bash
# Get UUID of a specific device
sudo blkid /dev/sda3

# Get UUID only (for use in scripts or fstab)
sudo blkid -s UUID -o value /dev/sda3

# Find device by UUID
sudo blkid -U "b2c3d4e5-f6a7-8901-bcde-f01234567890"
```

## parted - GNU Partition Tool

`parted` provides another view of partition tables and supports both GPT and MBR:

```bash
# List all partitions on all disks
sudo parted -l

# List partitions on a specific disk
sudo parted /dev/sda print
```

Output:

```text
Model: QEMU HARDDISK (scsi)
Disk /dev/sda: 53.7GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system  Name                  Flags
 1      1049kB  538MB   537MB   fat32        EFI System Partition  boot, esp
 2      538MB   1612MB  1074MB  ext4
 3      1612MB  53.7GB  52.1GB  ext4
```

## Finding the Device for a Mounted Path

When you know a mount point but need to find the underlying device:

```bash
# Which device is / on?
df -h /

# More detailed
df -hT /var/www/html

# Using findmnt (cleanest output)
findmnt /var/www/html
findmnt -T /var/www/html  # Find which mount the path belongs to

# All mounts in tree format
findmnt
```

## Checking Physical Disk Information

```bash
# Disk health and model information
sudo hdparm -I /dev/sda

# Just the disk model
sudo hdparm -I /dev/sda | grep "Model Number"

# For NVMe drives
sudo nvme id-ctrl /dev/nvme0 2>/dev/null | head -20
# Or install nvme-cli: sudo apt install nvme-cli
```

## Monitoring Disk I/O

```bash
# Real-time disk I/O stats
iostat -x 1

# Per-disk statistics
sar -d 1 5

# Quick disk activity overview
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,RA,RO
```

## Practical Scenarios

### New disk attached - find it

```bash
# Run before and after attaching disk, compare outputs
lsblk
# or
sudo fdisk -l 2>/dev/null | grep "^Disk /dev/"
```

A new disk will appear in the list. It will have no partitions shown under it if it's unpartitioned.

### Find the boot disk

```bash
# Which disk contains the root partition?
findmnt / | awk 'NR>1{print $2}'
# Or
df / | awk 'NR>1{print $1}'
```

### Check if a disk has a partition table

```bash
sudo fdisk -l /dev/sdb 2>&1
# "Disk /dev/sdb doesn't contain a valid partition table" if it's raw
```

### Find all unmounted partitions

```bash
# Partitions with no mount point
lsblk -o NAME,MOUNTPOINT | awk '$2=="" && $1~/[0-9]$/{print $1}'
```

### Verify disk alignment

Poor alignment can hurt performance, especially with SSDs:

```bash
# Check partition alignment (offset should be divisible by physical sector size)
sudo fdisk -l /dev/sda | grep "^/dev/"
# Start sector should be 2048 or higher, and divisible by 2048 for 1MB alignment

# parted alignment check
sudo parted /dev/sda align-check optimal 1
# "1 aligned" means partition 1 is properly aligned
```

Getting comfortable with `lsblk`, `fdisk -l`, and `blkid` gives you a solid foundation for any disk management task. The combination of a tree view (lsblk), partition table details (fdisk), and UUID lookup (blkid) covers almost every scenario where you need to understand what storage is present and how it's configured.
