# How to Recover Lost Partitions with GNU Parted on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, parted, Partition Recovery, TestDisk, Disk

Description: Guide to recovering lost or accidentally deleted partitions on Ubuntu using GNU Parted, TestDisk, and partition scanning tools with step-by-step examples.

---

Accidentally deleting a partition table entry is easier than you might think - one wrong command in `fdisk` or `parted` and critical partition information disappears. The good news is that deleting a partition table entry does not erase the data on disk; it just removes the metadata describing where the partition starts and ends. Recovery is often possible by scanning the disk for filesystem signatures and reconstructing the partition table.

## Understanding How Partition Loss Happens

A partition table (MBR or GPT) stores the starting LBA, size, type, and flags for each partition. When you delete a partition:

- The data on disk remains completely intact
- Only the partition table entry is removed
- Recovery tools scan for filesystem superblocks to find where partitions were

The only data that is truly gone at this point is the partition table entry itself.

## Before Attempting Recovery

```bash
# First, identify your drive (be absolutely sure of the device name)
lsblk
sudo fdisk -l

# Look at the current (broken) partition table
sudo parted /dev/sdb print

# Create a backup of the current partition table state
sudo sfdisk -d /dev/sdb > /tmp/partition_table_backup.txt

# If the disk has any readable MBR, save it
sudo dd if=/dev/sdb of=/tmp/sdb_mbr.bin bs=512 count=1
```

## Using TestDisk (Recommended First Approach)

TestDisk is specifically designed for partition recovery and is the most reliable tool for this task:

```bash
# Install TestDisk
sudo apt update
sudo apt install testdisk -y

# Run TestDisk on the disk with lost partitions
sudo testdisk /dev/sdb
```

### TestDisk Recovery Walkthrough

**Step 1: Create a log file**

When TestDisk asks if you want to create a log file, choose "Create" to keep a record.

**Step 2: Select the disk**

Use arrow keys to select `/dev/sdb` (or whichever disk has the lost partitions).

**Step 3: Select partition table type**

- Intel for MBR partition tables (drives under 2TB on older systems)
- EFI GPT for modern UEFI systems and larger drives
- TestDisk usually detects this automatically

**Step 4: Analyze**

Select "Analyse" then "Quick Search." TestDisk scans the drive for filesystem signatures:

```
Disk /dev/sdb - 500 GB / 465 GiB
Partition               Start        End    Size in sectors
D Linux                    2048    2099199    2097152 [sda1]
D Linux                 2099200  975773695  973674496 [sda2]
```

Entries marked with `D` are deleted but found. If your partitions appear here, they can be recovered.

**Step 5: Verify partition contents**

Press `P` to list files in a found partition. If you can see your files, the partition is intact and the table entry just needs to be restored.

**Step 6: Select and write**

Press Enter to validate the partition list, then press `W` to write the recovered partition table to disk. TestDisk will confirm with:

```
The partition table has been written.
```

**Step 7: Reboot**

```bash
sudo reboot
```

After rebooting, the recovered partitions should be visible and mountable.

## Manual Recovery with GNU Parted

If TestDisk does not find the partitions, you can attempt manual recovery using parted. This requires knowing (or finding) the exact start and end sectors.

### Finding Partition Boundaries

Use `gpart` to scan for partitions:

```bash
# Install gpart
sudo apt install gpart -y

# Scan the disk for partition boundaries (dry-run mode)
sudo gpart /dev/sdb
```

gpart output shows where it detected filesystem boundaries:

```
Begin scan...
Possible partition(EXT2 FS), size(200M), offset(1M)
Possible partition(EXT2 FS), size(50G), offset(201M)
...
End scan.
```

These offsets are where you create the new partition entries.

### Using fdisk to Find Sector Information

```bash
# Start fdisk expert mode to see sector information
sudo fdisk -u /dev/sdb

# In fdisk, press 'p' to print current table
# Press 'l' to list partition types
```

### Scanning with partx

```bash
# Try to read partition table structures from the disk
sudo partx -s /dev/sdb

# If that fails, scan the disk for filesystems
sudo blkid /dev/sdb*
```

### Reconstructing with parted

Once you have the start and end sectors (from gpart, TestDisk, or other scanning):

```bash
# Open parted for the disk
sudo parted /dev/sdb

# Print the current table
(parted) print

# Create a new MBR partition table ONLY if the existing one is completely gone
# WARNING: This destroys any remaining partition info
(parted) mklabel msdos

# Create partitions using the recovered sector information
# Adjust start and end to match what gpart found
(parted) mkpart primary ext4 1MiB 201MiB
(parted) mkpart primary ext4 201MiB 50GiB

# Set boot flag if the partition was bootable
(parted) set 1 boot on

# Write changes and exit
(parted) quit
```

After creating the partition entries:

```bash
# Inform the kernel about partition table changes
sudo partprobe /dev/sdb

# Try to mount and verify the partitions
sudo mount -o ro /dev/sdb1 /mnt/test
ls /mnt/test/

# Run fsck to verify filesystem integrity
sudo fsck.ext4 /dev/sdb1
```

## GPT Partition Recovery

GPT stores two copies of the partition table - one at the start and one at the end of the disk. This makes recovery more reliable.

```bash
# Check GPT table status
sudo gdisk /dev/sdb

# In gdisk, type 'r' for recovery mode
# Then 'b' to rebuild the primary GPT header from the backup at the end of disk
# Or 'd' to use the main table to rebuild the backup

# Exit after repair
# Type 'w' to write and exit
```

TestDisk also handles GPT recovery with the same workflow as above - select "EFI GPT" as the partition table type.

## Using photorec After Partition Recovery

If partition recovery is not fully successful and you need to extract specific files:

```bash
# Run PhotoRec on the entire disk to find files by signature
sudo photorec /dev/sdb

# Choose to scan the whole disk space (not just partitions)
# Select output directory on a different drive
```

PhotoRec does not require a working partition table or filesystem - it scans raw disk blocks for known file signatures.

## Preventing Future Partition Loss

```bash
# Regularly back up partition table for critical drives
# For MBR:
sudo sfdisk -d /dev/sda > /backup/sda_partition_table.txt

# For GPT:
sudo sgdisk -b /backup/sda_gpt_backup.bin /dev/sda

# Restore from backup if needed:
sudo sfdisk /dev/sda < /backup/sda_partition_table.txt
# or for GPT:
sudo sgdisk -l /backup/sda_gpt_backup.bin /dev/sda
```

```bash
# Set up automated partition backup with cron
crontab -e
# Add:
# 0 2 * * 0 sudo sfdisk -d /dev/sda > /backup/partition_tables/sda_$(date +%Y%m%d).txt
```

## Verifying Recovery Success

```bash
# Confirm partitions are visible
lsblk /dev/sdb

# Check filesystem on each recovered partition
sudo fsck.ext4 -n /dev/sdb1   # -n for read-only check

# Mount and verify data access
sudo mount -o ro /dev/sdb1 /mnt/recovery
ls -la /mnt/recovery/
df -h /mnt/recovery
```

TestDisk is by far the most effective tool for partition recovery and should be the first tool you reach for. Its quick search algorithm reliably finds ext2/3/4, NTFS, FAT32, and other common filesystems by their superblock signatures. For GPT disks, the dual partition table copies provide an additional safety net. Manual reconstruction with parted is a last resort when TestDisk cannot find the boundaries automatically.
