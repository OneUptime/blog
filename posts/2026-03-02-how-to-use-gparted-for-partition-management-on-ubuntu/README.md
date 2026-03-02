# How to Use GParted for Partition Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, GParted, Partitioning, System Administration

Description: Learn how to use GParted on Ubuntu to create, resize, move, and delete disk partitions safely, including working with partition tables and filesystem types.

---

GParted (GNOME Partition Editor) is the standard partition management GUI for Linux. It handles partition creation, resizing, moving, deleting, and filesystem formatting across a wide range of partition table types (MBR, GPT) and filesystems (ext4, NTFS, FAT32, XFS, and more). While it's a graphical tool, you can also run it headlessly via GParted Live for server environments. This guide covers installation, common partition management tasks, and important precautions.

## Installing GParted on Ubuntu

On Ubuntu Desktop, GParted may already be installed. If not:

```bash
# Install GParted
sudo apt-get update
sudo apt-get install -y gparted

# Launch GParted (requires GUI environment)
sudo gparted
```

For filesystem-specific operations, install the relevant filesystem tools:

```bash
# Install support for various filesystem types
sudo apt-get install -y \
  ntfs-3g \          # NTFS support
  exfat-fuse \       # exFAT support
  hfsprogs \         # HFS+ support
  f2fs-tools \       # F2FS support
  btrfs-progs \      # Btrfs support
  xfsprogs           # XFS support
```

GParted automatically detects which filesystem tools are available and enables operations accordingly.

## Understanding the GParted Interface

When you launch GParted with sudo, the interface shows:

- **Disk selector** (top right) - Switch between different physical disks
- **Graphical view** - Visual representation of partitions on the selected disk
- **Partition list** - Detailed table showing partition name, filesystem, size, used/unused space, and flags
- **Pending operations** - A queue of changes that haven't been applied yet

This queuing system is important - GParted batches changes and applies them only when you click "Apply". You can review and cancel operations before committing.

## Selecting a Disk

Use the dropdown in the top-right to select the disk you want to work with. Disks appear as `/dev/sda`, `/dev/sdb`, `/dev/nvme0n1`, etc.

**Always triple-check you have the right disk selected before making changes.** Partition operations are destructive and often irreversible without backups.

## Creating a New Partition Table

For a brand new disk or to completely wipe an existing one, create a new partition table first.

1. Select the disk in the dropdown
2. Go to **Device** menu -> **Create Partition Table**
3. Choose the partition table type:
   - **GPT** - Recommended for modern systems, disks over 2TB, and UEFI boot
   - **msdos (MBR)** - Required for some legacy BIOS systems and bootable USB drives for older hardware
4. Click Apply

This wipes all existing partitions and data on the disk.

## Creating Partitions

With an unallocated disk:

1. Right-click the unallocated space in the graphical view
2. Select **New**
3. Configure the partition:
   - **Free space preceding** - Leave unallocated space before this partition
   - **New size** - Enter size in MiB
   - **Free space following** - Remaining unallocated space
   - **Create as** - Primary, Extended, or Logical
   - **Partition name** - Only applies to GPT disks
   - **File system** - ext4, NTFS, xfs, FAT32, etc.
   - **Label** - Volume label for the filesystem
4. Click **Add**

The operation appears in the pending queue. Repeat for additional partitions, then click **Edit** -> **Apply All Operations** (or the green checkmark button) to execute.

## Resizing Partitions

Resizing is one of GParted's most common use cases. You might expand a root partition using freed space from another partition, or shrink a Windows partition to dual-boot with Ubuntu.

### Shrinking a Partition

1. **Unmount the partition first** if it's mounted (right-click -> Unmount)
2. Right-click the partition -> **Resize/Move**
3. Drag the right edge of the partition left, or type a new size in the "New size" field
4. The reduced size leaves unallocated space that you can allocate to other partitions
5. Click **Resize/Move**, then **Apply All Operations**

### Growing a Partition

A partition can only grow into adjacent unallocated space. The unallocated space must be directly after the partition you want to grow.

1. Right-click the partition -> **Resize/Move**
2. Drag the right edge to include the unallocated space, or increase the size value
3. Click **Resize/Move**, then **Apply All Operations**

If unallocated space is before the partition, you need to move the partition first.

### Resizing the Root Partition

You cannot resize a mounted partition. For the root filesystem (`/`), boot from an external medium:

```bash
# Option 1: Use GParted Live USB
# Download from https://gparted.org/livecd.php
# Boot from it and use GParted from the live environment

# Option 2: Use Ubuntu Live USB
# Boot Ubuntu installer in "Try Ubuntu" mode
# Then install GParted in the live session
sudo apt-get install -y gparted
sudo gparted
```

## Moving Partitions

Moving partitions is needed when you want to shift a partition's starting position to make adjacent unallocated space. Moving is slow for large partitions as it copies all data.

1. Unmount the partition
2. Right-click -> **Resize/Move**
3. Click and drag the entire partition bar left or right
4. Alternatively, change the "Free space preceding" value
5. Click **Resize/Move**, then **Apply All Operations**

Moving a partition can take a long time depending on partition size and disk speed. Do not interrupt the process.

## Changing Filesystem Type (Format)

To reformat a partition with a different filesystem:

1. Right-click the partition -> **Format to** -> Select filesystem type
2. The operation queues up; apply it when ready

Note that formatting erases all data on the partition.

## Managing Partition Flags

Partition flags mark partitions for specific purposes. Common flags include:

- **boot** - Marks the bootable partition (MBR disks)
- **esp** - EFI System Partition (GPT disks)
- **lvm** - Marks a partition for LVM use
- **raid** - Marks a partition for RAID use
- **swap** - Marks a swap partition

To set flags:

1. Right-click a partition -> **Manage Flags**
2. Check or uncheck flags
3. Click **Close** - flag changes apply immediately without queuing

## Checking and Repairing Filesystems

GParted can check and repair filesystem errors:

1. Unmount the partition
2. Right-click -> **Check**
3. Apply the operation

This runs the appropriate fsck variant for the filesystem type.

## Using GParted from the Command Line (parted)

For headless servers or scripting, use `parted`, which GParted is based on:

```bash
# Install parted
sudo apt-get install -y parted

# List partition tables for all disks
sudo parted -l

# Open interactive mode for a specific disk
sudo parted /dev/sdb

# Non-interactive partition operations
# Create a GPT partition table
sudo parted /dev/sdb --script mklabel gpt

# Create a partition taking the full disk
sudo parted /dev/sdb --script mkpart primary ext4 0% 100%

# Create a partition of specific size
sudo parted /dev/sdb --script mkpart primary ext4 1MiB 50GiB

# Verify
sudo parted /dev/sdb --script print
```

After creating partitions with parted, format them with mkfs:

```bash
# Format partition as ext4
sudo mkfs.ext4 -L "DataDisk" /dev/sdb1

# Format as XFS
sudo mkfs.xfs -L "DataDisk" /dev/sdb1

# Format as NTFS
sudo mkfs.ntfs -L "DataDisk" /dev/sdb1
```

## Common Partitioning Scenarios

### Setting Up a New Data Disk

```bash
# Non-interactive setup for a new data disk /dev/sdb
# Create GPT table
sudo parted /dev/sdb --script mklabel gpt

# Create a single partition using the full disk
sudo parted /dev/sdb --script mkpart primary ext4 1MiB 100%

# Format with ext4
sudo mkfs.ext4 -L "data" /dev/sdb1

# Create mount point and add to fstab
sudo mkdir -p /data
DISK_UUID=$(blkid -s UUID -o value /dev/sdb1)
echo "UUID=$DISK_UUID  /data  ext4  defaults  0  2" | sudo tee -a /etc/fstab

# Mount
sudo mount -a
df -h /data
```

### Cloning a Partition

GParted can copy partitions via right-click -> Copy on source, then right-click unallocated space -> Paste. For command-line cloning:

```bash
# Clone a partition with dd (block-for-block copy)
sudo dd if=/dev/sdb1 of=/dev/sdc1 bs=64K conv=noerror,sync status=progress

# Or use partclone for filesystem-aware cloning (only copies used blocks)
sudo apt-get install -y partclone
sudo partclone.ext4 -c -s /dev/sdb1 | gzip > /backup/sdb1.img.gz
```

## Safety Precautions

- **Always back up important data** before resizing or moving partitions - operations can fail due to power loss, hardware issues, or bugs
- **Run filesystem checks** before resizing: `sudo e2fsck -f /dev/sdb1`
- **Do not interrupt** partition operations once started - partial operations can leave filesystems inconsistent
- **Resize ext4 filesystems** before shrinking: `sudo resize2fs /dev/sdb1 40G` before shrinking the partition to 40GB
- **Check partition alignment** - misaligned partitions hurt performance on SSDs and NVMe drives; GParted aligns to MiB boundaries by default which is correct

GParted remains the most approachable tool for partition management on Ubuntu. For automated or headless environments, combining `parted` with `mkfs` tools provides the same capabilities from scripts.
