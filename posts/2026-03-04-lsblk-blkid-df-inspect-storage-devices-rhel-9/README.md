# How to Use lsblk, blkid, and df to Inspect Storage Devices on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Storage, lsblk, blkid, df, Linux

Description: Learn how to use lsblk, blkid, and df commands on RHEL to inspect storage devices, identify filesystems, check disk usage, and troubleshoot storage issues.

---

Understanding your storage layout is fundamental to system administration. RHEL provides several powerful command-line tools for inspecting storage devices, each showing different aspects of your storage configuration. This guide covers `lsblk`, `blkid`, and `df` in depth, showing you how to use them individually and together for comprehensive storage inspection.

## Prerequisites

- A RHEL system with root or sudo access
- Basic familiarity with Linux storage concepts

## Using lsblk

The `lsblk` command lists information about block devices in a tree format, showing the relationships between disks, partitions, and device mapper targets.

### Basic Usage

```bash
lsblk
```

Sample output:

```
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda               8:0    0   50G  0 disk
|-sda1            8:1    0    1G  0 part /boot
|-sda2            8:2    0   49G  0 part
  |-rhel-root   253:0    0   45G  0 lvm  /
  |-rhel-swap   253:1    0    4G  0 lvm  [SWAP]
sdb               8:16   0  100G  0 disk
|-sdb1            8:17   0  100G  0 part
  |-vg_data-lv_data 253:2  0  100G  0 lvm  /data
sr0              11:0    1 1024M  0 rom
```

### Show Specific Columns

Display only the columns you need:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
```

### List All Available Columns

See every possible column:

```bash
lsblk -h
```

Useful columns include:

- `NAME`: Device name
- `SIZE`: Device size
- `TYPE`: Device type (disk, part, lvm, raid, etc.)
- `FSTYPE`: Filesystem type
- `MOUNTPOINT`: Where the device is mounted
- `UUID`: Filesystem UUID
- `MODEL`: Disk model
- `SERIAL`: Disk serial number
- `HCTL`: Host:Channel:Target:LUN for SCSI devices
- `TRAN`: Transport type (sata, sas, nvme, etc.)

### Show Disk Information

Display hardware details:

```bash
lsblk -o NAME,SIZE,MODEL,SERIAL,TRAN
```

### Show SCSI Information

Useful for SAN-connected storage:

```bash
lsblk -S
```

### Show Sizes in Bytes

For precise size information:

```bash
lsblk -b -o NAME,SIZE
```

### Filter by Device Type

Show only disks (no partitions or LVM):

```bash
lsblk -d
```

### Show Filesystem Details

```bash
lsblk -f
```

This shows filesystem type, label, UUID, and available space.

## Using blkid

The `blkid` command probes block devices and prints their attributes, focusing on filesystem identification.

### Basic Usage

```bash
sudo blkid
```

Sample output:

```
/dev/sda1: UUID="abc12345-de67-89fg-hijk-lmnopqrstuv" BLOCK_SIZE="512" TYPE="xfs" PARTUUID="12345678-01"
/dev/sda2: UUID="xyz98765-ab43-21cd-efgh-ijklmnopqrs" TYPE="LVM2_member" PARTUUID="12345678-02"
/dev/mapper/rhel-root: UUID="root1234-5678-90ab-cdef-ghijklmnopqr" BLOCK_SIZE="512" TYPE="xfs"
/dev/mapper/rhel-swap: UUID="swap1234-5678-90ab-cdef-ghijklmnopqr" TYPE="swap"
```

### Query a Specific Device

```bash
sudo blkid /dev/sda1
```

### Find a Device by UUID

```bash
sudo blkid -U "abc12345-de67-89fg-hijk-lmnopqrstuv"
```

This returns the device path for the given UUID, which is useful for scripting.

### Find a Device by Label

```bash
sudo blkid -L "data"
```

### Show Specific Attributes

```bash
sudo blkid -s UUID -s TYPE /dev/sda1
```

### Output in Key-Value Format

```bash
sudo blkid -o export /dev/sda1
```

Output:

```
DEVNAME=/dev/sda1
UUID=abc12345-de67-89fg-hijk-lmnopqrstuv
BLOCK_SIZE=512
TYPE=xfs
PARTUUID=12345678-01
```

### Show All Information for All Devices

```bash
sudo blkid -o full
```

### Refresh the blkid Cache

If devices have changed and blkid shows stale information:

```bash
sudo blkid -g
```

## Using df

The `df` command reports filesystem disk space usage for mounted filesystems.

### Basic Usage

```bash
df
```

### Human-Readable Output

```bash
df -h
```

Sample output:

```
Filesystem              Size  Used Avail Use% Mounted on
devtmpfs                4.0M     0  4.0M   0% /dev
tmpfs                   3.9G     0  3.9G   0% /dev/shm
tmpfs                   1.6G  9.5M  1.6G   1% /run
/dev/mapper/rhel-root    45G   12G   34G  26% /
/dev/sda1              1014M  286M  729M  29% /boot
/dev/mapper/vg_data-lv   99G   45G   55G  45% /data
tmpfs                   786M     0  786M   0% /run/user/1000
```

### Show Filesystem Type

```bash
df -Th
```

### Show Inode Usage

```bash
df -i
```

This is important because a filesystem can run out of inodes before running out of space.

### Check a Specific Mount Point

```bash
df -h /data
```

### Check a Specific Filesystem

```bash
df -h /dev/mapper/vg_data-lv_data
```

### Exclude Filesystem Types

Exclude temporary filesystems to focus on real storage:

```bash
df -h -x tmpfs -x devtmpfs
```

### Show Only Specific Filesystem Types

```bash
df -h -t xfs
```

### Output in POSIX Format

For scripting:

```bash
df -P
```

## Combining the Tools

### Find What Filesystem Is on a Device

```bash
# See the device tree
lsblk /dev/sdb

# Get filesystem details
sudo blkid /dev/sdb1

# Check if it's mounted and how much space is used
df -h /dev/sdb1
```

### Create a Complete Storage Report

```bash
echo "=== Block Devices ==="
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

echo ""
echo "=== Filesystem UUIDs ==="
sudo blkid

echo ""
echo "=== Disk Usage ==="
df -Th -x tmpfs -x devtmpfs
```

### Find Unmounted Filesystems

Compare lsblk output with df to find filesystems that exist but are not mounted:

```bash
# Devices with filesystems
lsblk -f | grep -v "^$"

# Mounted filesystems
df -h
```

Any device shown by `lsblk -f` with a filesystem type but no mountpoint is unmounted.

### Identify a Disk's Purpose

```bash
# Physical information
lsblk -o NAME,SIZE,MODEL,SERIAL /dev/sdb

# Partition and filesystem information
sudo blkid /dev/sdb*

# Mount and usage information
df -h | grep sdb
```

## Practical Scenarios

### Scenario 1: Disk Running Out of Space

```bash
# Find which filesystem is full
df -h | sort -k5 -rn | head

# Identify the underlying device
lsblk -o NAME,SIZE,MOUNTPOINT | grep "/full/mount"

# Check if the volume can be extended
sudo vgs
```

### Scenario 2: New Disk Not Appearing

```bash
# Check if the kernel sees the disk
lsblk

# Rescan SCSI bus if needed
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan

# Check again
lsblk
```

### Scenario 3: Identifying an Unknown Disk

```bash
# Get physical info
lsblk -o NAME,SIZE,MODEL,SERIAL,TRAN /dev/sdc

# Check for existing filesystems or LVM
sudo blkid /dev/sdc*

# Check if any part is used by LVM
sudo pvs /dev/sdc
```

## Conclusion

The `lsblk`, `blkid`, and `df` commands are essential tools for inspecting storage on RHEL. Together, they provide a complete picture of your storage configuration: `lsblk` shows device relationships and hierarchy, `blkid` reveals filesystem identities and UUIDs, and `df` reports space utilization. Mastering these three commands gives you the ability to quickly diagnose storage issues and understand any system's storage layout.
