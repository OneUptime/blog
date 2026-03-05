# How to Clone Disks with dd on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, dd, Disk Clone, Backup, System Migration, Tutorial

Description: Complete guide to cloning disks and partitions using dd command on Ubuntu.

---

Cloning disks is an essential skill for system administrators and power users alike. Whether you are migrating to a new drive, creating backups, or deploying identical systems, the `dd` command on Ubuntu provides a powerful and flexible solution. This comprehensive guide covers everything you need to know about disk cloning with `dd`, from basic operations to advanced techniques.

## Understanding the dd Command

The `dd` command, often called "disk dump" or jokingly "disk destroyer," is a low-level utility that copies data byte-by-byte. Unlike regular file copy commands, `dd` works at the block level, making it perfect for creating exact replicas of disks and partitions.

### Basic Syntax

```bash
# Basic dd syntax
dd if=<source> of=<destination> [options]

# Key parameters:
# if    - Input file (source)
# of    - Output file (destination)
# bs    - Block size (bytes to read/write at a time)
# count - Number of blocks to copy
# status - Display progress information
```

### Why Use dd for Disk Cloning?

- **Exact copies**: Creates bit-for-bit identical clones
- **Filesystem agnostic**: Works with any filesystem (ext4, NTFS, FAT32, etc.)
- **Bootable clones**: Preserves boot sectors and partition tables
- **Built-in**: Available on all Linux distributions by default
- **Flexible**: Can clone entire disks, partitions, or create images

## Safety Precautions

The `dd` command is extremely powerful but unforgiving. A single mistake can result in permanent data loss.

### Critical Safety Rules

```bash
# ALWAYS verify your source and destination BEFORE running dd
# The dd command has NO confirmation prompt and will immediately
# overwrite your destination

# Rule 1: Double-check device names
lsblk
# Example output:
# NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
# sda      8:0    0   500G  0 disk
# ├─sda1   8:1    0   512M  0 part /boot/efi
# └─sda2   8:2    0 499.5G  0 part /
# sdb      8:16   0     1T  0 disk
# └─sdb1   8:17   0     1T  0 part /mnt/backup

# Rule 2: Unmount all partitions on the destination disk
sudo umount /dev/sdb1
sudo umount /dev/sdb2

# Rule 3: Never use a mounted filesystem as destination
# This can cause corruption and system crashes

# Rule 4: Verify disk sizes
sudo fdisk -l /dev/sda
sudo fdisk -l /dev/sdb
```

### Pre-Clone Checklist

```bash
#!/bin/bash
# Pre-clone verification script
# Run this before any cloning operation

echo "=== Disk Cloning Safety Check ==="

# List all block devices
echo -e "\n1. Available block devices:"
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL

# Show mounted filesystems
echo -e "\n2. Currently mounted filesystems:"
df -h

# Display disk serial numbers for identification
echo -e "\n3. Disk identification (serial numbers):"
sudo lsblk -o NAME,SIZE,SERIAL,MODEL

# Check if destination is mounted
echo -e "\n4. WARNING: Ensure destination disk is NOT mounted!"
echo "   Verify the above output carefully before proceeding."
```

## Identifying Source and Destination Disks

Correctly identifying disks is crucial. Mixing up source and destination will destroy your data.

### Methods to Identify Disks

```bash
# Method 1: List block devices with details
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
# Shows device names, sizes, types, and mount points

# Method 2: Use fdisk to see partition tables
sudo fdisk -l
# Displays detailed partition information for all disks

# Method 3: Check by disk serial number (most reliable)
sudo hdparm -I /dev/sda | grep "Serial Number"
# Unique identifier for each physical disk

# Method 4: Use blkid for filesystem UUIDs
sudo blkid
# Shows UUIDs and filesystem types

# Method 5: Check dmesg for recently connected disks
dmesg | grep -i "sd[a-z]" | tail -20
# Useful when you just connected a USB drive

# Method 6: Use lshw for comprehensive hardware info
sudo lshw -class disk -short
# Displays manufacturer and model information
```

### Labeling Disks for Clarity

```bash
# Add labels to partitions for easier identification
# For ext4 filesystems:
sudo e2label /dev/sdb1 "BACKUP_DRIVE"

# For NTFS filesystems:
sudo ntfslabel /dev/sdb1 "BACKUP_DRIVE"

# Verify the label
sudo blkid /dev/sdb1
```

## Basic Disk Cloning

Clone an entire disk including all partitions, boot sectors, and partition tables.

### Clone Disk to Disk

```bash
# Clone entire disk /dev/sda to /dev/sdb
# WARNING: This will DESTROY all data on /dev/sdb

# Step 1: Unmount all partitions on both disks if mounted
sudo umount /dev/sda*
sudo umount /dev/sdb*

# Step 2: Clone the disk
# bs=64K provides a good balance of speed and reliability
# status=progress shows real-time progress
sudo dd if=/dev/sda of=/dev/sdb bs=64K conv=noerror,sync status=progress

# Parameters explained:
# if=/dev/sda       - Source disk (input file)
# of=/dev/sdb       - Destination disk (output file)
# bs=64K            - Read and write 64KB at a time
# conv=noerror      - Continue even if read errors occur
# conv=sync         - Pad blocks with zeros on read errors
# status=progress   - Display transfer statistics
```

### Understanding Block Size (bs)

```bash
# Block size significantly affects performance
# Smaller bs = More accurate but slower
# Larger bs = Faster but may miss small errors

# Conservative (slower, more thorough):
sudo dd if=/dev/sda of=/dev/sdb bs=4K status=progress

# Balanced (recommended for most cases):
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress

# Aggressive (faster, good for healthy disks):
sudo dd if=/dev/sda of=/dev/sdb bs=1M status=progress

# For SSDs (align with typical SSD page size):
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress
```

### Verify the Clone

```bash
# After cloning, verify both disks have identical content
# This compares the first 1GB (adjust count as needed)

# Generate checksums for verification
sudo dd if=/dev/sda bs=1M count=1000 | md5sum
sudo dd if=/dev/sdb bs=1M count=1000 | md5sum

# Or use cmp for byte-by-byte comparison
sudo cmp /dev/sda /dev/sdb
# No output means disks are identical
```

## Partition Cloning

Sometimes you only need to clone a specific partition rather than the entire disk.

### Clone a Single Partition

```bash
# Clone partition /dev/sda1 to /dev/sdb1
# Both partitions should be of equal or compatible size

# Step 1: Unmount the partitions
sudo umount /dev/sda1
sudo umount /dev/sdb1

# Step 2: Clone the partition
sudo dd if=/dev/sda1 of=/dev/sdb1 bs=64K conv=noerror,sync status=progress

# Step 3: If cloning to a new disk, you may need to update UUIDs
# Generate a new UUID for the cloned partition
sudo tune2fs -U random /dev/sdb1

# Step 4: Verify the filesystem
sudo e2fsck -f /dev/sdb1
```

### Clone Boot Partition (EFI/BIOS)

```bash
# Clone EFI System Partition (ESP)
# Usually the first partition on UEFI systems

# Identify the EFI partition
sudo fdisk -l | grep "EFI"

# Clone EFI partition (typically small, ~512MB)
sudo dd if=/dev/sda1 of=/dev/sdb1 bs=4M status=progress

# For BIOS boot sectors (first 446 bytes of disk)
# This copies only the bootloader, not partition table
sudo dd if=/dev/sda of=/dev/sdb bs=446 count=1

# To include partition table (first 512 bytes - MBR)
sudo dd if=/dev/sda of=/dev/sdb bs=512 count=1
```

## Creating Disk Images

Disk images are files that contain exact copies of disks or partitions. They are useful for backups and deployment.

### Create a Disk Image

```bash
# Create an image of entire disk
# Ensure destination has enough space

# Basic disk image creation
sudo dd if=/dev/sda of=/path/to/backup/disk_image.img bs=64K status=progress

# Create image of a partition
sudo dd if=/dev/sda1 of=/path/to/backup/partition_image.img bs=64K status=progress

# Recommended: Create image with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo dd if=/dev/sda of=/path/to/backup/disk_${TIMESTAMP}.img bs=64K status=progress
```

### Sparse Images (Save Space)

```bash
# Create sparse image that skips empty blocks
# Requires conv=sparse option
sudo dd if=/dev/sda of=/path/to/backup/sparse_image.img bs=64K conv=sparse status=progress

# Note: Sparse images only save space on filesystems that support them
# The actual size on disk will be smaller than the apparent size

# Check actual vs apparent size
ls -lh /path/to/backup/sparse_image.img  # Apparent size
du -h /path/to/backup/sparse_image.img   # Actual size on disk
```

## Restoring from Images

Restore a disk or partition from a previously created image.

### Restore Disk Image

```bash
# Restore entire disk from image
# WARNING: This will DESTROY all data on /dev/sdb

# Step 1: Verify the image file exists and is valid
ls -lh /path/to/backup/disk_image.img
file /path/to/backup/disk_image.img

# Step 2: Unmount destination disk
sudo umount /dev/sdb*

# Step 3: Restore the image
# Notice: if and of are swapped compared to backup
sudo dd if=/path/to/backup/disk_image.img of=/dev/sdb bs=64K status=progress

# Step 4: Force kernel to re-read partition table
sudo partprobe /dev/sdb

# Step 5: Verify the restored disk
sudo fdisk -l /dev/sdb
```

### Restore Partition Image

```bash
# Restore a single partition from image
sudo dd if=/path/to/backup/partition_image.img of=/dev/sdb1 bs=64K status=progress

# Verify filesystem integrity after restore
sudo e2fsck -f /dev/sdb1

# Mount and verify contents
sudo mount /dev/sdb1 /mnt/restored
ls -la /mnt/restored
```

## Progress Monitoring with status

The `status=progress` option provides real-time transfer statistics.

### Built-in Progress Monitoring

```bash
# Enable progress display with status=progress
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress

# Output shows:
# - Bytes copied
# - Elapsed time
# - Transfer speed
# Example: 10737418240 bytes (11 GB, 10 GiB) copied, 120 s, 89.5 MB/s
```

### Alternative Progress Monitoring Methods

```bash
# Method 1: Send USR1 signal to running dd process
# In terminal 1, run dd:
sudo dd if=/dev/sda of=/dev/sdb bs=64K

# In terminal 2, send signal to get progress:
sudo kill -USR1 $(pgrep ^dd$)
# This prints current progress without stopping the operation

# Method 2: Use pv (pipe viewer) for detailed progress
# Install pv first: sudo apt install pv
sudo dd if=/dev/sda bs=64K | pv -s $(sudo blockdev --getsize64 /dev/sda) | sudo dd of=/dev/sdb bs=64K

# Method 3: Use watch to monitor progress file
# In terminal 1:
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress 2>&1 | tee /tmp/dd_progress

# In terminal 2:
watch -n 1 tail -1 /tmp/dd_progress
```

### Progress Script with ETA

```bash
#!/bin/bash
# dd progress monitor with ETA calculation

SOURCE="/dev/sda"
DEST="/dev/sdb"
BLOCK_SIZE="64K"

# Get total size in bytes
TOTAL_SIZE=$(sudo blockdev --getsize64 $SOURCE)
TOTAL_SIZE_GB=$(echo "scale=2; $TOTAL_SIZE / 1073741824" | bc)

echo "Cloning $SOURCE ($TOTAL_SIZE_GB GB) to $DEST"
echo "Starting dd with progress monitoring..."

# Run dd with progress
sudo dd if=$SOURCE of=$DEST bs=$BLOCK_SIZE conv=noerror,sync status=progress 2>&1 | \
while IFS= read -r line; do
    echo "$line"
    # Extract bytes copied for ETA calculation
    if [[ $line =~ ([0-9]+)\ bytes ]]; then
        COPIED=${BASH_REMATCH[1]}
        PERCENT=$(echo "scale=2; $COPIED * 100 / $TOTAL_SIZE" | bc)
        echo "Progress: $PERCENT%"
    fi
done

echo "Clone completed!"
```

## Compression with gzip/pigz

Compress disk images to save storage space.

### Using gzip (Single-threaded)

```bash
# Create compressed disk image with gzip
# Compression level 6 is a good balance of speed and size
sudo dd if=/dev/sda bs=64K status=progress | gzip -c -6 > /path/to/backup/disk_image.img.gz

# Restore from compressed image
gunzip -c /path/to/backup/disk_image.img.gz | sudo dd of=/dev/sdb bs=64K status=progress

# Check compressed image integrity
gunzip -t /path/to/backup/disk_image.img.gz && echo "Image OK"
```

### Using pigz (Multi-threaded - Recommended)

```bash
# Install pigz for parallel compression
sudo apt install pigz

# Create compressed image using all CPU cores
# pigz is significantly faster than gzip on multi-core systems
sudo dd if=/dev/sda bs=64K status=progress | pigz -c -6 > /path/to/backup/disk_image.img.gz

# Specify number of threads (default: all cores)
sudo dd if=/dev/sda bs=64K status=progress | pigz -p 4 -c > /path/to/backup/disk_image.img.gz

# Restore from pigz-compressed image
pigz -dc /path/to/backup/disk_image.img.gz | sudo dd of=/dev/sdb bs=64K status=progress

# Maximum compression (slower but smaller)
sudo dd if=/dev/sda bs=64K | pigz -c -9 > /path/to/backup/disk_image.img.gz

# Fast compression (larger but quicker)
sudo dd if=/dev/sda bs=64K | pigz -c -1 > /path/to/backup/disk_image.img.gz
```

### Using Other Compression Tools

```bash
# Using xz for maximum compression (very slow but smallest)
sudo dd if=/dev/sda bs=64K | xz -c -9 > /path/to/backup/disk_image.img.xz

# Using lz4 for fastest compression (larger files)
sudo apt install lz4
sudo dd if=/dev/sda bs=64K | lz4 -c > /path/to/backup/disk_image.img.lz4

# Using zstd for balanced performance (recommended alternative)
sudo apt install zstd
sudo dd if=/dev/sda bs=64K | zstd -c -T0 > /path/to/backup/disk_image.img.zst
# -T0 uses all available CPU cores
```

## Network Cloning with netcat

Clone disks across the network without intermediate storage.

### Basic Network Clone

```bash
# On DESTINATION machine (receiver):
# Listen on port 19000 and write incoming data to disk
nc -l -p 19000 | sudo dd of=/dev/sdb bs=64K status=progress

# On SOURCE machine (sender):
# Read disk and send over network
sudo dd if=/dev/sda bs=64K status=progress | nc <destination_ip> 19000

# Example with specific IP:
# Destination: nc -l -p 19000 | sudo dd of=/dev/sdb bs=64K
# Source: sudo dd if=/dev/sda bs=64K | nc 192.168.1.100 19000
```

### Compressed Network Clone

```bash
# Reduce bandwidth usage with compression

# On DESTINATION machine:
nc -l -p 19000 | pigz -dc | sudo dd of=/dev/sdb bs=64K status=progress

# On SOURCE machine:
sudo dd if=/dev/sda bs=64K | pigz -c | nc <destination_ip> 19000
```

### Secure Network Clone with SSH

```bash
# Clone disk over encrypted SSH connection
# More secure but slightly slower than plain netcat

# Clone from local to remote server
sudo dd if=/dev/sda bs=64K status=progress | ssh user@remote_server "sudo dd of=/dev/sdb bs=64K"

# Clone from remote server to local
ssh user@remote_server "sudo dd if=/dev/sda bs=64K" | sudo dd of=/dev/sdb bs=64K status=progress

# With compression over SSH
sudo dd if=/dev/sda bs=64K | pigz -c | ssh user@remote_server "pigz -dc | sudo dd of=/dev/sdb bs=64K"
```

### Network Clone Script

```bash
#!/bin/bash
# network_clone.sh - Clone disk over network with progress and compression

MODE=$1  # "send" or "receive"
DISK=$2
REMOTE_HOST=$3
PORT=${4:-19000}

case $MODE in
    receive)
        echo "Waiting to receive disk image on port $PORT..."
        echo "Data will be written to $DISK"
        nc -l -p $PORT | pigz -dc | sudo dd of=$DISK bs=64K status=progress
        echo "Receive complete!"
        ;;
    send)
        echo "Sending $DISK to $REMOTE_HOST:$PORT..."
        TOTAL_SIZE=$(sudo blockdev --getsize64 $DISK)
        echo "Total size: $(numfmt --to=iec $TOTAL_SIZE)"
        sudo dd if=$DISK bs=64K status=progress | pigz -c | nc $REMOTE_HOST $PORT
        echo "Send complete!"
        ;;
    *)
        echo "Usage: $0 <send|receive> <disk> [remote_host] [port]"
        echo "  Receive: $0 receive /dev/sdb '' 19000"
        echo "  Send:    $0 send /dev/sda 192.168.1.100 19000"
        exit 1
        ;;
esac
```

## Cloning to Larger or Smaller Disks

Handling disk size mismatches requires additional steps.

### Cloning to a Larger Disk

```bash
# Clone to larger disk - straightforward process
sudo dd if=/dev/sda of=/dev/sdb bs=64K conv=noerror,sync status=progress

# After cloning, the extra space is unallocated
# Extend the last partition to use remaining space

# Step 1: View current partition layout
sudo fdisk -l /dev/sdb

# Step 2: Use parted to resize partition
sudo parted /dev/sdb
# (parted) print                    # View partitions
# (parted) resizepart 2 100%        # Extend partition 2 to use all space
# (parted) quit

# Step 3: Resize the filesystem (for ext4)
sudo e2fsck -f /dev/sdb2
sudo resize2fs /dev/sdb2

# For NTFS partitions
sudo ntfsresize -f /dev/sdb2
```

### Cloning to a Smaller Disk

```bash
# IMPORTANT: Destination must be large enough for actual data
# You MUST shrink the source partition before cloning

# Step 1: Check actual data usage on source
df -h /dev/sda1

# Step 2: Shrink the source filesystem (ext4 example)
# First, unmount the partition
sudo umount /dev/sda1

# Check filesystem
sudo e2fsck -f /dev/sda1

# Resize filesystem to fit on smaller disk (example: 200GB)
sudo resize2fs /dev/sda1 200G

# Step 3: Resize the partition using fdisk or parted
# This is complex - use GParted for safety
sudo apt install gparted
sudo gparted

# Step 4: Clone only the used portion
# Calculate the exact bytes to copy
SECTORS=$(sudo fdisk -l /dev/sda | grep "sda1" | awk '{print $3}')
BYTES=$((SECTORS * 512))
sudo dd if=/dev/sda of=/dev/sdb bs=64K count=$((BYTES / 65536)) status=progress
```

### Using Clonezilla for Complex Scenarios

```bash
# For difficult clone scenarios, consider Clonezilla
# It handles partition resizing automatically

# Install Clonezilla
sudo apt install clonezilla

# Or boot from Clonezilla Live USB for full functionality
# Download from: https://clonezilla.org/downloads.php
```

## Using dcfldd as Alternative

dcfldd is an enhanced version of dd with built-in features for forensics and verification.

### Installing dcfldd

```bash
# Install dcfldd on Ubuntu
sudo apt update
sudo apt install dcfldd
```

### Basic dcfldd Usage

```bash
# dcfldd with hash verification
# Automatically calculates hash while copying
sudo dcfldd if=/dev/sda of=/dev/sdb bs=64K hash=md5 hashwindow=1G

# Parameters:
# hash=md5        - Calculate MD5 hash during copy
# hashwindow=1G   - Display hash every 1GB copied

# Create image with multiple hash algorithms
sudo dcfldd if=/dev/sda of=/path/to/backup/disk_image.img \
    hash=md5,sha256 \
    hashwindow=1G \
    hashlog=/path/to/backup/disk_image.hash
```

### dcfldd Progress and Split Features

```bash
# Built-in progress reporting (no status=progress needed)
sudo dcfldd if=/dev/sda of=/dev/sdb bs=64K statusinterval=256

# Split large images into smaller files
# Useful for FAT32 file size limits or easier handling
sudo dcfldd if=/dev/sda of=/path/to/backup/disk_image.img \
    bs=64K \
    hash=sha256 \
    split=4G \
    splitformat=aa

# This creates: disk_image.img.aa, disk_image.img.ab, etc.
```

### dcfldd Verification

```bash
# Verify clone matches source (forensic verification)
sudo dcfldd if=/dev/sda vf=/dev/sdb bs=64K

# vf = verify file - compares source to destination

# Create image and verify in one step
sudo dcfldd if=/dev/sda of=/path/to/backup/image.img bs=64K \
    hash=sha256 \
    hashlog=/path/to/backup/image.sha256 \
    vf=/path/to/backup/image.img
```

### Complete dcfldd Clone Script

```bash
#!/bin/bash
# Forensic disk clone script using dcfldd

SOURCE=$1
DEST=$2
LOG_DIR="/var/log/disk_clones"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log directory
mkdir -p $LOG_DIR

# Verify parameters
if [ -z "$SOURCE" ] || [ -z "$DEST" ]; then
    echo "Usage: $0 <source_disk> <destination>"
    echo "  Example: $0 /dev/sda /dev/sdb"
    echo "  Example: $0 /dev/sda /backups/image.img"
    exit 1
fi

echo "=== Forensic Disk Clone ==="
echo "Source: $SOURCE"
echo "Destination: $DEST"
echo "Timestamp: $TIMESTAMP"
echo "=========================="

# Get source disk info
SOURCE_SIZE=$(sudo blockdev --getsize64 $SOURCE)
echo "Source size: $(numfmt --to=iec $SOURCE_SIZE)"

# Perform clone with hashing and logging
sudo dcfldd if=$SOURCE of=$DEST \
    bs=64K \
    hash=md5,sha256 \
    hashwindow=1G \
    hashlog=$LOG_DIR/clone_${TIMESTAMP}.hash \
    2>&1 | tee $LOG_DIR/clone_${TIMESTAMP}.log

# Verify the clone
echo "Verifying clone..."
sudo dcfldd if=$SOURCE vf=$DEST bs=64K verifylog=$LOG_DIR/verify_${TIMESTAMP}.log

echo "Clone complete! Logs saved to $LOG_DIR"
```

## Troubleshooting Common Issues

### Error: No space left on device

```bash
# Check destination size before cloning
SOURCE_SIZE=$(sudo blockdev --getsize64 /dev/sda)
DEST_SIZE=$(sudo blockdev --getsize64 /dev/sdb)

echo "Source: $(numfmt --to=iec $SOURCE_SIZE)"
echo "Destination: $(numfmt --to=iec $DEST_SIZE)"

# Destination must be >= source
if [ $DEST_SIZE -lt $SOURCE_SIZE ]; then
    echo "ERROR: Destination is smaller than source!"
fi
```

### Error: Permission denied

```bash
# Always run dd with sudo for raw disk access
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress

# If still getting errors, check if disk is mounted
mount | grep /dev/sdb

# Force unmount if necessary
sudo umount -f /dev/sdb1
```

### Slow Transfer Speed

```bash
# Increase block size for better performance
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress

# Use direct I/O to bypass cache (for SSDs)
sudo dd if=/dev/sda of=/dev/sdb bs=4M oflag=direct status=progress

# For very large disks, consider using iflag=fullblock
sudo dd if=/dev/sda of=/dev/sdb bs=4M iflag=fullblock status=progress
```

### Recovering from Interrupted Clone

```bash
# If dd is interrupted, you can resume from where it stopped
# Note: This requires knowing exactly where the interruption occurred

# Calculate the offset (example: 100GB already copied)
SKIP_BLOCKS=$((100 * 1024 * 1024 * 1024 / 65536))  # For bs=64K

# Resume clone
sudo dd if=/dev/sda of=/dev/sdb bs=64K skip=$SKIP_BLOCKS seek=$SKIP_BLOCKS status=progress
```

## Best Practices Summary

```bash
# 1. Always verify disk identities before cloning
lsblk -o NAME,SIZE,MODEL,SERIAL

# 2. Unmount all partitions on source and destination
sudo umount /dev/sda* /dev/sdb*

# 3. Use appropriate block size
# SSD: bs=4M, HDD: bs=64K

# 4. Always use status=progress
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress

# 5. Use conv=noerror,sync for failing drives
sudo dd if=/dev/sda of=/dev/sdb bs=64K conv=noerror,sync status=progress

# 6. Verify clone after completion
sudo cmp /dev/sda /dev/sdb

# 7. Use compression for images
sudo dd if=/dev/sda bs=64K | pigz -c > disk.img.gz

# 8. Consider dcfldd for critical operations
sudo dcfldd if=/dev/sda of=/dev/sdb bs=64K hash=sha256
```

## Conclusion

The `dd` command is an indispensable tool for disk cloning on Ubuntu. While it requires careful attention to detail, its flexibility and power make it the go-to solution for creating exact disk copies, backups, and system migrations. Always remember to verify your source and destination before executing any clone operation, and consider using `dcfldd` for operations requiring verification and forensic integrity.

For comprehensive monitoring of your backup systems, server infrastructure, and disk health, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time monitoring, alerting, and incident management to ensure your backup operations complete successfully and your storage systems remain healthy. With OneUptime, you can set up automated checks for disk space, monitor backup job completions, and receive instant notifications if any issues arise during critical disk cloning operations.
