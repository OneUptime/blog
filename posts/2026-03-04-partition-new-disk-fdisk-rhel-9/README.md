# How to Partition a New Disk Using fdisk on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, fdisk, Partitioning, Storage, Linux

Description: A practical guide to partitioning new disks using fdisk on RHEL 9, covering MBR partition tables, primary and extended partitions, and filesystem creation.

---

## When to Use fdisk

fdisk is one of the oldest disk partitioning tools on Linux and it still works perfectly well for basic partitioning tasks. On RHEL 9, fdisk supports both MBR and GPT partition tables, though for GPT you might prefer parted or gdisk. Use fdisk when you need quick MBR partitioning or when you are comfortable with its interactive menu.

## Prerequisites

- RHEL 9 with root or sudo access
- A new or unused disk attached to the system

## Step 1 - Identify the New Disk

```bash
# List all block devices
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

# Check if the disk has any existing partition table
sudo fdisk -l /dev/sdb
```

If fdisk reports "doesn't contain a valid partition table," the disk is clean and ready.

## Step 2 - Launch fdisk

```bash
# Start fdisk on the target disk
sudo fdisk /dev/sdb
```

You will see the fdisk prompt: `Command (m for help):`

## Step 3 - Create a New Partition Table

If the disk is brand new, create an MBR (DOS) partition table:

```
# At the fdisk prompt, type:
o     # Create a new empty DOS partition table
```

For GPT (recommended for disks over 2 TB):

```
# At the fdisk prompt, type:
g     # Create a new empty GPT partition table
```

## Step 4 - Create a Partition

```
# At the fdisk prompt:
n     # New partition
p     # Primary partition (for MBR)
1     # Partition number 1
      # Press Enter to accept default first sector
+50G  # Size of 50 GB (or press Enter for full disk)
```

If fdisk asks about removing a signature, type `y`.

## Step 5 - Create Additional Partitions

```
# Create a second partition
n     # New partition
p     # Primary
2     # Partition number 2
      # Accept default first sector
+100G # 100 GB partition
```

For MBR partition tables, you can have up to four primary partitions. If you need more, create three primaries and one extended partition that holds logical partitions.

## Step 6 - Change Partition Type (Optional)

By default, new partitions get type 83 (Linux). To change it:

```
# Change partition type
t     # Change type
2     # Select partition 2
8e    # Linux LVM type code
```

Common type codes:
- `83` - Linux filesystem
- `82` - Linux swap
- `8e` - Linux LVM
- `fd` - Linux RAID autodetect

## Step 7 - Review and Write

```
# Print the current partition table
p

# If everything looks correct, write the changes
w     # Write table to disk and exit
```

Once you type `w`, the changes are permanent.

## Step 8 - Update the Kernel

The kernel should pick up the new partitions automatically, but if it does not:

```bash
# Force the kernel to re-read the partition table
sudo partprobe /dev/sdb

# Verify the partitions are visible
lsblk /dev/sdb
```

## Step 9 - Create Filesystems

```bash
# Create XFS on partition 1
sudo mkfs.xfs /dev/sdb1

# Create ext4 on partition 2
sudo mkfs.ext4 /dev/sdb2
```

## Step 10 - Mount the Partitions

```bash
# Create mount points
sudo mkdir -p /mnt/data1 /mnt/data2

# Mount the partitions
sudo mount /dev/sdb1 /mnt/data1
sudo mount /dev/sdb2 /mnt/data2

# Verify
df -h /mnt/data1 /mnt/data2
```

## Making Mounts Persistent

Add entries to /etc/fstab using UUIDs:

```bash
# Get UUIDs
sudo blkid /dev/sdb1 /dev/sdb2

# Add to fstab (use actual UUIDs)
echo "UUID=<uuid1>  /mnt/data1  xfs   defaults  0 0" | sudo tee -a /etc/fstab
echo "UUID=<uuid2>  /mnt/data2  ext4  defaults  0 0" | sudo tee -a /etc/fstab

# Test
sudo umount /mnt/data1 /mnt/data2
sudo mount -a
```

## Non-Interactive fdisk with sfdisk

For scripting, use sfdisk which accepts partition definitions from stdin:

```bash
# Create a single partition using the entire disk
echo ";" | sudo sfdisk /dev/sdb

# Create specific partitions
sudo sfdisk /dev/sdb << EOF
,50G,L
,100G,L
,,L
EOF
```

The format is `start,size,type`. Empty fields use defaults.

## MBR Limitations

MBR partition tables have real limitations:

- Maximum disk size: 2 TB
- Maximum four primary partitions
- Extended/logical partitions add complexity

For disks over 2 TB or when you need more than four partitions, use GPT with parted instead.

## Wrap-Up

fdisk is a reliable tool for basic disk partitioning on RHEL 9. It handles MBR tables well and can also work with GPT. For new installations with modern hardware, consider using GPT and parted, but fdisk remains perfectly valid for smaller disks and simple partition layouts. Always verify your work with lsblk before and after, and use UUIDs in fstab for reliable mounting.
