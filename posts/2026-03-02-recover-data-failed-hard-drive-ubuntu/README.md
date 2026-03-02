# How to Recover Data from a Failed Hard Drive on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Data Recovery, Hard Drive, Disk, Storage

Description: Practical guide to recovering data from a failed or failing hard drive on Ubuntu using tools like ddrescue, TestDisk, PhotoRec, and forensic imaging techniques.

---

A failed hard drive is one of the worst scenarios in computing, but all is not necessarily lost. The key is acting quickly and methodically. The wrong actions - running fsck repeatedly on a physically failing drive, mounting a damaged filesystem read-write, or writing any data to the source drive - can destroy evidence and reduce the amount of data you can recover. This guide covers the correct sequence of steps.

## Assess the Situation First

Before touching anything, understand what kind of failure you are dealing with:

- **Logical failure**: The drive is physically healthy but the filesystem is corrupted or files are accidentally deleted
- **Partial physical failure**: Some sectors are unreadable but the drive still spins and responds
- **Complete physical failure**: The drive does not spin up, makes clicking sounds, or is not detected by the BIOS

For complete physical failures with clicking or grinding sounds (head crash), stop immediately. Software tools cannot help. You need a professional clean-room recovery service.

For logical and partial physical failures, the tools below can recover significant amounts of data.

## Safety Rules

1. Never write to the failing drive - work from a disk image
2. Never run fsck on a physically failing drive
3. Have another drive ready with enough space for a full image of the failing drive
4. Work fast on physically failing drives - they can die at any moment

## Checking Drive Health with smartctl

```bash
# Install smartmontools
sudo apt install smartmontools -y

# Run a quick SMART check (identify the device with lsblk)
sudo smartctl -a /dev/sdb

# Look for "Reallocated_Sector_Ct", "Pending_Sector", and "Offline_Uncorrectable"
# High values in these attributes indicate physical problems

# Run a short self-test
sudo smartctl -t short /dev/sdb

# Check results after a few minutes
sudo smartctl -a /dev/sdb | grep -A 10 "Self-test"
```

## Step 1: Create a Disk Image with ddrescue

The `ddrescue` tool is purpose-built for recovering data from failing drives. It reads good sectors first, then systematically retries bad sectors, logging its progress so recovery can be resumed if interrupted.

```bash
# Install ddrescue
sudo apt install gddrescue -y

# Basic image creation (source = failing drive, target = image file)
# The mapfile (/tmp/ddrescue.log) tracks progress
sudo ddrescue -f -n /dev/sdb /mnt/recovery/disk.img /tmp/ddrescue.log

# After the first pass, run a second pass targeting bad sectors
sudo ddrescue -d -f -r3 /dev/sdb /mnt/recovery/disk.img /tmp/ddrescue.log
```

The `-n` flag on the first pass skips retrying bad sectors - it gets all the easy reads first. The `-r3` on the second pass retries bad sectors up to 3 times. The map file preserves progress so if the drive dies mid-recovery, you can resume from where you left off.

## Working with the Disk Image

Once you have an image, all further work is done on the image file, not the failing drive. This protects the original.

```bash
# Check the image with losetup
sudo losetup -f /mnt/recovery/disk.img

# Mount the image as a loop device
sudo losetup /dev/loop0 /mnt/recovery/disk.img

# Identify partitions in the image
sudo partprobe /dev/loop0
lsblk /dev/loop0

# Mount a partition from the image (adjust partition number as needed)
sudo mount -o ro /dev/loop0p1 /mnt/image_data

# Browse and copy files
cp -a /mnt/image_data/important_files /mnt/recovered_data/
```

## Repairing a Filesystem on the Image

If the filesystem is corrupted, run repair tools on the image (never on the live failing drive):

```bash
# Check and repair ext4 filesystem on the image partition
sudo fsck.ext4 -y /dev/loop0p1

# For NTFS partitions (Windows drives)
sudo apt install ntfs-3g -y
sudo ntfsfix /dev/loop0p1
sudo mount -t ntfs-3g -o ro /dev/loop0p1 /mnt/image_data
```

## Using TestDisk for Partition Recovery

TestDisk recovers deleted partitions and fixes partition tables:

```bash
# Install TestDisk
sudo apt install testdisk -y

# Run TestDisk on the image file
sudo testdisk /mnt/recovery/disk.img
```

In the TestDisk interactive menu:

1. Select "Proceed" > select your disk image
2. Choose the partition table type (usually Intel/PC for MBR or EFI GPT for modern drives)
3. Select "Analyse" > "Quick Search"
4. If partitions are found, press 'P' to list files and verify they look correct
5. Press Enter to select the partition, then press 'W' to write the recovered partition table

## Using PhotoRec for File Carving

PhotoRec recovers individual files by scanning for known file signatures. It does not rely on filesystem structures, which makes it effective even when the filesystem is severely damaged:

```bash
# PhotoRec is included with testdisk
sudo apt install testdisk -y

# Run PhotoRec on the image
sudo photorec /mnt/recovery/disk.img
```

PhotoRec's interactive menu:

1. Select the image file
2. Choose a partition or the whole image
3. Select "File Opt" to choose which file types to recover (jpg, pdf, doc, etc.)
4. Select "Search" and choose the output directory (must be on a different drive)

PhotoRec does not preserve original filenames or directory structure - it creates numbered files sorted by type. Plan accordingly.

## Recovering Specific File Types with foremost

Foremost is another file carving tool good for specific file types:

```bash
# Install foremost
sudo apt install foremost -y

# Recover JPEG images from the disk image
sudo foremost -t jpg -i /mnt/recovery/disk.img -o /mnt/recovered/images/

# Recover multiple file types
sudo foremost -t jpg,pdf,doc,docx -i /mnt/recovery/disk.img -o /mnt/recovered/

# Recover all supported types
sudo foremost -i /mnt/recovery/disk.img -o /mnt/recovered/all/
```

## Recovering Deleted Files from a Healthy ext4 Filesystem

If the drive is physically fine but files were accidentally deleted:

```bash
# Install ext4 recovery tools
sudo apt install extundelete -y

# First, unmount the filesystem if it is mounted
sudo umount /dev/sdb1

# List recoverable files
sudo extundelete /dev/sdb1 --inode 2

# Recover all deleted files
sudo extundelete /dev/sdb1 --restore-all

# Recover a specific file by path
sudo extundelete /dev/sdb1 --restore-file path/to/deleted/file.txt
```

## Monitoring Recovery Progress

For large drives, use a script to monitor ddrescue progress:

```bash
#!/bin/bash
# monitor_rescue.sh - Show ddrescue progress summary

MAP_FILE="/tmp/ddrescue.log"

if [ ! -f "$MAP_FILE" ]; then
    echo "Map file not found: $MAP_FILE"
    exit 1
fi

echo "=== ddrescue Recovery Progress ==="
echo "Timestamp: $(date)"
echo ""

# Parse the map file for statistics
grep -v "^#" "$MAP_FILE" | head -5

echo ""
echo "Bad sectors remaining:"
grep -c "^0x.*B" "$MAP_FILE" 2>/dev/null || echo "0"
```

## When Hardware Intervention is Needed

Signs that you need professional recovery:

- Drive not detected in BIOS at all
- Clicking, grinding, or beeping sounds
- Drive spins up but immediately spins down
- PCB board damage (burnt smell, visible scorch marks)
- Drive was in a fire or flood

Professional clean-room services can recover data from most of these scenarios, but cost anywhere from $500 to $3000 depending on the damage.

## Building a Recovery Drive

Keep a dedicated USB drive ready for these situations:

```bash
# Create a bootable Ubuntu live USB with recovery tools pre-installed
# After booting, install tools from the live environment:
sudo apt install gddrescue testdisk foremost extundelete smartmontools -y
```

Data recovery outcomes depend heavily on acting quickly and avoiding further writes to the damaged drive. The most common mistake is running the system normally on a failing drive while hoping the problem goes away - every write is a potential overwrite of recoverable data.
