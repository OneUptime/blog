# How to Create GPT Partitions with parted on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, parted, GPT, Partitioning, Linux

Description: Learn how to use parted to create GPT partition tables and partitions on RHEL, supporting large disks and modern hardware requirements.

---

## Why GPT and parted?

GPT (GUID Partition Table) is the modern replacement for MBR. It supports disks larger than 2 TB, allows up to 128 partitions by default, and stores a backup copy of the partition table at the end of the disk for added safety. On RHEL with UEFI boot, GPT is required.

parted is the standard tool for managing GPT partitions on RHEL. Unlike fdisk's interactive-only approach, parted can be used both interactively and with one-liner commands, making it ideal for scripting.

## Prerequisites

- RHEL with root access
- An unused disk or a disk you are ready to repartition

## Step 1 - Identify the Disk

```bash
# List all disks and their current partitions
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

# Check current partition table (if any)
sudo parted /dev/sdb print
```

## Step 2 - Create a GPT Partition Table

```bash
# Create a new GPT label on the disk
sudo parted /dev/sdb mklabel gpt
```

This wipes any existing partition table. parted will ask for confirmation if it detects existing data.

## Step 3 - Create Partitions

parted uses start and end positions. You can specify sizes in MB, GB, TB, or percentages.

```bash
# Create a 50 GB partition starting at 1 MiB
sudo parted /dev/sdb mkpart primary xfs 1MiB 50GiB

# Create a 100 GB partition starting where the first one ended
sudo parted /dev/sdb mkpart primary xfs 50GiB 150GiB

# Create a partition using the remaining space
sudo parted /dev/sdb mkpart primary xfs 150GiB 100%
```

The "primary" label is technically not needed for GPT (GPT does not have primary/extended/logical distinctions), but parted accepts it for compatibility.

## Step 4 - Name Your Partitions

GPT supports human-readable partition names:

```bash
# Name partition 1
sudo parted /dev/sdb name 1 "data"

# Name partition 2
sudo parted /dev/sdb name 2 "backups"

# Name partition 3
sudo parted /dev/sdb name 3 "logs"
```

## Step 5 - Verify the Layout

```bash
# Print the partition table
sudo parted /dev/sdb print

# Also verify with lsblk
lsblk /dev/sdb
```

You should see output like:

```bash
Number  Start   End     Size    File system  Name     Flags
 1      1049kB  53.7GB  53.7GB               data
 2      53.7GB  161GB   107GB                backups
 3      161GB   500GB   339GB                logs
```

## Step 6 - Create Filesystems

```bash
# Format each partition
sudo mkfs.xfs /dev/sdb1
sudo mkfs.xfs /dev/sdb2
sudo mkfs.xfs /dev/sdb3
```

## Step 7 - Mount and Persist

```bash
# Create mount points
sudo mkdir -p /mnt/{data,backups,logs}

# Mount
sudo mount /dev/sdb1 /mnt/data
sudo mount /dev/sdb2 /mnt/backups
sudo mount /dev/sdb3 /mnt/logs

# Get UUIDs for fstab
sudo blkid /dev/sdb1 /dev/sdb2 /dev/sdb3
```

Add entries to /etc/fstab:

```bash
# Add persistent mounts using UUIDs
echo "UUID=<uuid1>  /mnt/data     xfs  defaults  0 0" | sudo tee -a /etc/fstab
echo "UUID=<uuid2>  /mnt/backups  xfs  defaults  0 0" | sudo tee -a /etc/fstab
echo "UUID=<uuid3>  /mnt/logs     xfs  defaults  0 0" | sudo tee -a /etc/fstab
```

## Setting Partition Flags

GPT partitions support various flags:

```bash
# Set the boot flag (for EFI System Partition)
sudo parted /dev/sdb set 1 boot on

# Set the LVM flag
sudo parted /dev/sdb set 2 lvm on

# Set the RAID flag
sudo parted /dev/sdb set 3 raid on

# List supported flags
sudo parted /dev/sdb print
```

## Using Optimal Alignment

parted aligns partitions to optimal boundaries by default. You can check and control this:

```bash
# Check alignment of partition 1
sudo parted /dev/sdb align-check optimal 1

# parted uses optimal alignment by default
# To explicitly set alignment mode
sudo parted -a optimal /dev/sdb mkpart primary xfs 1MiB 50GiB
```

## Interactive Mode

For complex partitioning, interactive mode can be easier:

```bash
# Enter interactive mode
sudo parted /dev/sdb

# At the (parted) prompt:
(parted) print           # Show current layout
(parted) mkpart          # Start partition creation wizard
(parted) quit            # Exit
```

## Common parted Commands Reference

| Command | Description |
|---------|-------------|
| `mklabel gpt` | Create GPT partition table |
| `mkpart name fs start end` | Create a partition |
| `rm N` | Remove partition N |
| `name N label` | Set partition name |
| `set N flag on/off` | Set/unset a flag |
| `print` | Display partition table |
| `print free` | Show free space |
| `align-check opt N` | Check alignment |

## Wrap-Up

parted with GPT is the recommended approach for disk partitioning on RHEL, especially for large disks and UEFI systems. The command-line syntax is clean, it supports both interactive and scripted usage, and GPT removes the limitations of MBR. Always use `print` to verify your work before moving on to filesystem creation and mounting.
