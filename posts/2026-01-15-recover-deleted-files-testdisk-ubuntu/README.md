# Recover Deleted Files on Ubuntu with TestDisk and PhotoRec

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, TestDisk, PhotoRec, File Recovery, Data Recovery, Tutorial

Description: Step-by-step guide to recovering deleted files and lost partitions on Ubuntu using TestDisk. Includes PhotoRec for file carving and ext4 recovery tips.

---

Accidentally deleting important files or losing access to entire partitions can be a devastating experience. Fortunately, Ubuntu users have access to powerful open-source tools like TestDisk and PhotoRec that can help recover lost data. This comprehensive guide will walk you through the process of recovering deleted files and repairing damaged partition tables using these essential utilities.

## Understanding TestDisk and PhotoRec

TestDisk and PhotoRec are two complementary data recovery tools developed by Christophe Grenier and distributed under the GNU General Public License.

### TestDisk

TestDisk is primarily designed for:

- **Partition Recovery**: Recovering lost partitions due to accidental deletion, virus attacks, or software failures
- **Partition Table Repair**: Fixing corrupted partition tables (MBR, GPT)
- **Boot Sector Recovery**: Rebuilding FAT12/FAT16/FAT32/NTFS boot sectors
- **File System Repair**: Recovering deleted files from FAT, exFAT, NTFS, and ext2/ext3/ext4 file systems
- **MBR Reconstruction**: Rebuilding the Master Boot Record

### PhotoRec

PhotoRec is a file carving tool that:

- **Ignores File Systems**: Works even when the file system is severely damaged
- **Recovers Many File Types**: Supports over 480 file extensions including documents, archives, and multimedia files
- **Works on Various Media**: Recovers from hard drives, USB drives, memory cards, CD-ROMs, and more
- **Preserves Original Media**: Operates in read-only mode to prevent further damage

## Installing TestDisk

TestDisk and PhotoRec come bundled together in the `testdisk` package. Here are several methods to install them on Ubuntu.

### Method 1: Using APT (Recommended)

```bash
# Update the package list to ensure you get the latest version
sudo apt update

# Install TestDisk (includes PhotoRec)
sudo apt install testdisk

# Verify the installation
testdisk --version
```

### Method 2: Using Snap

```bash
# Install TestDisk via Snap for the latest version
sudo snap install testdisk

# Note: Snap packages may have different file access permissions
# You might need to connect additional interfaces for full functionality
```

### Method 3: Building from Source

For the absolute latest version with all features:

```bash
# Install build dependencies
sudo apt install build-essential e2fslibs-dev libncurses5-dev \
    libncursesw5-dev libjpeg-dev zlib1g-dev libewf-dev \
    libuuid1 uuid-dev

# Download the latest source code
wget https://www.cgsecurity.org/testdisk-7.2.tar.bz2

# Extract the archive
tar -xjf testdisk-7.2.tar.bz2

# Navigate to the source directory
cd testdisk-7.2

# Configure the build
./configure

# Compile the source code
make

# Install the compiled binaries
sudo make install
```

## Recovering Lost Partitions

One of TestDisk's most powerful features is its ability to recover entire lost partitions.

### Step-by-Step Partition Recovery

```bash
# Launch TestDisk with root privileges
# Root is required for direct disk access
sudo testdisk
```

Follow these steps in the interactive interface:

1. **Create a New Log File**
   - Select `Create` to generate a new log file for troubleshooting
   - The log file is saved to your current directory

2. **Select the Disk**
   - Use arrow keys to navigate to the affected disk
   - Press Enter to select it
   - Be careful to select the correct disk to avoid data loss

3. **Choose the Partition Table Type**
   - `Intel` for MBR (most common for older systems)
   - `EFI GPT` for GPT (modern systems, disks > 2TB)
   - `Mac` for Apple partition maps
   - `None` for non-partitioned media

4. **Select Analyse**
   - Choose `Analyse` to scan for existing and lost partitions
   - TestDisk will display the current partition structure

5. **Quick Search**
   - Press Enter for `Quick Search`
   - TestDisk scans the disk for partition signatures
   - This process may take several minutes depending on disk size

6. **Review Found Partitions**
   - Green entries indicate valid, recoverable partitions
   - Use arrow keys to highlight each partition
   - Press `P` to list files and verify the partition contents

7. **Deep Search (If Needed)**
   - If Quick Search misses partitions, select `Deeper Search`
   - This performs a more thorough sector-by-sector scan
   - Takes significantly longer but finds more partitions

8. **Write the Partition Table**
   - Once satisfied with the results, select `Write`
   - Confirm the action to save the recovered partition table
   - Reboot to apply changes

### Example: Recovering a Deleted ext4 Partition

```bash
# First, identify your disks and their current state
lsblk -f

# Sample output showing a disk with missing partition:
# NAME   FSTYPE LABEL UUID                                 MOUNTPOINT
# sda
# ├─sda1 ext4   boot  abc12345-...                        /boot
# └─sda2                                                  # <-- Missing partition!
# sdb    ext4   data  def67890-...                        /data

# Launch TestDisk targeting the specific disk
sudo testdisk /dev/sda

# After recovery, verify the partition was restored
sudo fdisk -l /dev/sda

# Mount the recovered partition
sudo mkdir -p /mnt/recovered
sudo mount /dev/sda2 /mnt/recovered

# List recovered files
ls -la /mnt/recovered
```

## Fixing Partition Tables

Corrupted partition tables can make entire disks appear empty or unreadable.

### Rebuilding the MBR

```bash
# Launch TestDisk
sudo testdisk /dev/sda

# Navigate to: Advanced -> MBR Code -> Write
# This writes a new Master Boot Record while preserving partition data
```

### Fixing GPT Partition Tables

```bash
# For GPT disks, TestDisk can rebuild both primary and backup tables
sudo testdisk /dev/sda

# Select: EFI GPT -> Analyse -> Quick Search
# TestDisk will find partitions and allow you to rebuild the GPT
```

### Repairing Boot Sectors

```bash
# Navigate within TestDisk:
# Analyse -> Quick Search -> [Select Partition] -> Advanced -> Boot

# Options available:
# - Rebuild BS: Rebuild the boot sector from scratch
# - Repair FAT: Repair FAT32 file allocation tables
# - Repair MFT: Repair NTFS Master File Table references
```

### Example: Recovering from "Invalid Partition Table" Error

```bash
# When you see "Invalid partition table" on boot:

# 1. Boot from Ubuntu Live USB
# 2. Open terminal and install TestDisk
sudo apt update && sudo apt install testdisk

# 3. Run TestDisk
sudo testdisk

# 4. Select the problematic disk
# 5. Let TestDisk auto-detect the partition type or select manually
# 6. Choose Analyse -> Quick Search
# 7. TestDisk will find partition signatures on the disk
# 8. Select Write to restore the partition table
# 9. Reboot from the repaired disk
```

## Recovering Deleted Files with PhotoRec

PhotoRec excels at recovering deleted files even when the file system is damaged.

### Basic PhotoRec Usage

```bash
# Launch PhotoRec with root privileges
sudo photorec

# Or specify a disk directly
sudo photorec /dev/sda
```

### Step-by-Step File Recovery

1. **Select the Media**
   - Choose the disk or partition containing deleted files
   - You can also select disk image files (.dd, .raw, .E01)

2. **Choose the Partition**
   - Select the specific partition to scan
   - Or choose `No partition` to scan the entire disk

3. **Select File System Type**
   - `ext2/ext3/ext4` for Linux partitions
   - `Other` for FAT, NTFS, exFAT, HFS+

4. **Choose Scan Scope**
   - `Free` - Scan only unallocated space (faster, for recently deleted files)
   - `Whole` - Scan entire partition (slower, but more thorough)

5. **Select Destination Directory**
   - Choose where to save recovered files
   - IMPORTANT: Never save to the same partition you're recovering from!

6. **Start Recovery**
   - Press `C` to confirm and begin scanning
   - Recovery progress is displayed in real-time

### Example: Recovering Recently Deleted Photos

```bash
# Create a recovery destination on a different drive
mkdir -p /media/external/recovered_photos

# Launch PhotoRec
sudo photorec /dev/sda1

# In PhotoRec interface:
# 1. Select partition type: [ext2/ext3/ext4]
# 2. Select: [Free] (for recently deleted files)
# 3. Navigate to /media/external/recovered_photos
# 4. Press C to start

# After recovery, check the results
ls -la /media/external/recovered_photos/recup_dir.*

# PhotoRec creates numbered directories (recup_dir.1, recup_dir.2, etc.)
# Files are named with format: f[number].[extension]
```

## Recovering Specific File Types

PhotoRec can be configured to search for specific file types, making recovery faster and more focused.

### Filtering File Types in PhotoRec

```bash
# Launch PhotoRec
sudo photorec /dev/sda1

# Before starting the scan:
# 1. Press [File Opt] to enter file options
# 2. Press 's' to deselect all file types
# 3. Navigate and press space to select desired types:
#    - [X] jpg  JPG picture
#    - [X] png  PNG picture
#    - [X] pdf  PDF document
#    - [X] doc  Microsoft Office Document
# 4. Press 'b' to save settings
# 5. Press 'q' to return to main menu
# 6. Continue with recovery
```

### Common File Type Categories

```bash
# Document recovery - select these types:
# doc, docx, xls, xlsx, ppt, pptx, pdf, odt, ods, odp, txt, rtf

# Image recovery - select these types:
# jpg, jpeg, png, gif, bmp, tiff, raw, cr2, nef, psd, svg

# Video recovery - select these types:
# mp4, avi, mkv, mov, wmv, flv, 3gp, mpeg, webm

# Audio recovery - select these types:
# mp3, wav, flac, aac, ogg, wma, m4a, aiff

# Archive recovery - select these types:
# zip, rar, 7z, tar, gz, bz2, xz
```

### Creating Custom File Signatures

PhotoRec supports custom file signatures for proprietary formats:

```bash
# Create a custom signature file
sudo nano /usr/local/share/photorec/custom.sig

# Example: Define a custom file signature
# Format: extension header_hex footer_hex
# The header identifies the start of the file
# The footer (optional) identifies the end

# Example signature for a hypothetical .xyz format:
# xyz 0 58595A48 58595A45
# - xyz: file extension
# - 0: no specific file size category
# - 58595A48: hex for "XYZH" (header)
# - 58595A45: hex for "XYZE" (footer)

# After adding custom signatures, PhotoRec will recognize them
```

## Working with Different Filesystems

TestDisk and PhotoRec support a wide variety of file systems.

### ext2/ext3/ext4 (Linux Native)

```bash
# For ext4 partitions, TestDisk can undelete files directly
sudo testdisk /dev/sda1

# Navigate: Advanced -> Undelete
# Browse the file system and select files to recover
# Press 'c' to copy selected files to a recovery location

# Alternative: Use extundelete for ext3/ext4
sudo apt install extundelete

# Recover all deleted files
sudo extundelete /dev/sda1 --restore-all

# Recover specific file
sudo extundelete /dev/sda1 --restore-file path/to/file.txt
```

### NTFS (Windows)

```bash
# For NTFS partitions, TestDisk can browse and recover files
sudo testdisk /dev/sda2

# Navigate: Advanced -> Undelete
# Deleted files appear in red
# Select files and press 'c' to copy

# Alternative: Use ntfsundelete
sudo apt install ntfs-3g

# List deleted files
sudo ntfsundelete /dev/sda2 --scan

# Recover by inode number
sudo ntfsundelete /dev/sda2 --undelete --inodes 12345 --output recovered_file.docx

# Recover by file name pattern
sudo ntfsundelete /dev/sda2 --undelete --match "*.docx" --destination /recovery/
```

### FAT/FAT32/exFAT

```bash
# TestDisk handles FAT file systems well
sudo testdisk /dev/sdb1

# For FAT, TestDisk can repair:
# - Boot sector
# - FAT tables
# - Root directory

# Navigate: Advanced -> FAT -> Repair FAT
```

### HFS+ (macOS)

```bash
# PhotoRec works with HFS+ partitions
sudo photorec /dev/sdc1

# Select "Other" for file system type
# PhotoRec will carve files regardless of HFS+ structures
```

### Btrfs and ZFS

```bash
# For Btrfs, use built-in snapshot recovery first
sudo btrfs subvolume list /mnt/btrfs

# Restore from snapshot
sudo btrfs subvolume snapshot /mnt/btrfs/.snapshots/1/snapshot /mnt/btrfs/restored

# If no snapshots, use PhotoRec for file carving
sudo photorec /dev/sda3

# For ZFS, check for snapshots
zfs list -t snapshot

# Restore from ZFS snapshot
zfs rollback pool/dataset@snapshot_name
```

## Creating Disk Images Before Recovery

Creating a disk image before attempting recovery is crucial for preserving the original state.

### Why Create Disk Images?

1. **Preservation**: The original disk remains untouched
2. **Multiple Attempts**: You can try different recovery methods on copies
3. **Legal Evidence**: Original state is preserved for forensic purposes
4. **Failing Hardware**: Clone before the disk fails completely

### Using dd for Disk Imaging

```bash
# Create a full disk image
# if = input file (source disk)
# of = output file (destination image)
# bs = block size (larger = faster, 64K is good balance)
# conv=noerror,sync = continue on errors, pad with zeros

sudo dd if=/dev/sda of=/media/external/disk_image.dd bs=64K conv=noerror,sync status=progress

# For damaged disks, use ddrescue instead (better error handling)
sudo apt install gddrescue

# First pass: copy good sectors quickly
sudo ddrescue -n /dev/sda /media/external/disk_image.dd /media/external/rescue.log

# Second pass: retry bad sectors
sudo ddrescue -d -r3 /dev/sda /media/external/disk_image.dd /media/external/rescue.log

# The log file allows resuming interrupted recovery sessions
```

### Using TestDisk to Create Images

```bash
# TestDisk can create partition images
sudo testdisk /dev/sda

# Navigate: Advanced -> [Select Partition] -> Image Creation
# Choose destination and format

# Supported formats:
# - Raw (.dd)
# - EWF/EnCase (.E01) - compressed, with metadata
```

### Working with Disk Images

```bash
# Mount a disk image to browse files
sudo mkdir -p /mnt/image

# For a full disk image, find partition offsets
fdisk -l disk_image.dd

# Sample output:
# Device         Boot   Start      End  Sectors  Size Id Type
# disk_image.dd1 *       2048   206847   204800  100M  7 HPFS/NTFS
# disk_image.dd2       206848 41943039 41736192 19.9G  7 HPFS/NTFS

# Calculate offset: start_sector * 512 bytes
# For partition 2: 206848 * 512 = 105906176

# Mount with offset
sudo mount -o loop,offset=105906176,ro disk_image.dd /mnt/image

# Run TestDisk on the image
sudo testdisk disk_image.dd

# Run PhotoRec on the image
sudo photorec disk_image.dd
```

### Compressing and Splitting Images

```bash
# Compress the image to save space
gzip -c disk_image.dd > disk_image.dd.gz

# For very large images, split into manageable chunks
split -b 4G disk_image.dd disk_image.dd.part_

# Reassemble split files when needed
cat disk_image.dd.part_* > disk_image_restored.dd

# Verify integrity with checksums
sha256sum disk_image.dd > disk_image.sha256
sha256sum -c disk_image.sha256
```

## Advanced Recovery Techniques

### Recovering from RAIDs

```bash
# For software RAID arrays, reassemble first
sudo mdadm --assemble --scan

# If array won't assemble, force it (may lose some data)
sudo mdadm --assemble --force /dev/md0 /dev/sda1 /dev/sdb1

# Run TestDisk on the assembled array
sudo testdisk /dev/md0

# For hardware RAID, the controller presents a single device
# Treat it like a regular disk
```

### Recovering Encrypted Partitions

```bash
# For LUKS encrypted partitions, decrypt first
sudo cryptsetup luksOpen /dev/sda2 encrypted_volume

# Then run recovery on the decrypted device
sudo testdisk /dev/mapper/encrypted_volume
sudo photorec /dev/mapper/encrypted_volume

# Close when done
sudo cryptsetup luksClose encrypted_volume
```

### Memory Card and USB Recovery

```bash
# Identify the device
lsblk

# Often USB drives appear as /dev/sdb, /dev/sdc, etc.
# SD cards may appear as /dev/mmcblk0

# Disable automount to prevent further writes
gsettings set org.gnome.desktop.media-handling automount false

# Create image first (memory cards are often unreliable)
sudo ddrescue -n /dev/mmcblk0 sdcard.dd sdcard.log

# Run PhotoRec on the image
sudo photorec sdcard.dd
```

### Recovering from Formatted Drives

```bash
# Quick format only clears file system metadata
# Data remains until overwritten

# For recently quick-formatted drives:
sudo photorec /dev/sda1

# Select "Whole" partition scan to examine all sectors
# Use file type filtering to focus on needed files

# For full/secure format, recovery is unlikely
# PhotoRec may still find file fragments
```

### Forensic Recovery Mode

```bash
# Enable expert mode in PhotoRec for forensic analysis
sudo photorec /dev/sda

# Press Enter on "[File Opt]"
# Enable "Expert mode" for additional options:
# - Keep corrupted files
# - Low memory mode for large recovery operations
# - Custom block size for better performance

# Use options to generate detailed logs
sudo photorec /log /debug_mode /dev/sda
```

### Recovering from Virtual Disks

```bash
# For VirtualBox VDI files
VBoxManage clonehd virtual_disk.vdi raw_image.dd --format RAW

# For VMware VMDK files
qemu-img convert -f vmdk -O raw virtual_disk.vmdk raw_image.dd

# For QEMU QCOW2 files
qemu-img convert -f qcow2 -O raw virtual_disk.qcow2 raw_image.dd

# Run recovery on the converted raw image
sudo photorec raw_image.dd
```

## Best Practices for Data Recovery

### Before Starting Recovery

1. **Stop Using the Affected Drive**
   ```bash
   # Immediately unmount the drive to prevent further writes
   sudo umount /dev/sda1

   # Disable swap if it's on the affected drive
   sudo swapoff -a
   ```

2. **Document the Current State**
   ```bash
   # Record partition information
   sudo fdisk -l /dev/sda > partition_info.txt

   # Record file system details
   sudo blkid /dev/sda* > blkid_info.txt

   # Check SMART status for disk health
   sudo smartctl -a /dev/sda > smart_info.txt
   ```

3. **Create Multiple Backups**
   ```bash
   # Create primary image
   sudo ddrescue -n /dev/sda /backup1/disk.dd /backup1/disk.log

   # Verify and create secondary copy
   cp /backup1/disk.dd /backup2/disk.dd
   sha256sum /backup1/disk.dd /backup2/disk.dd
   ```

### During Recovery

1. **Work on Copies, Not Originals**
   ```bash
   # Always run recovery tools on disk images
   sudo photorec /backup/disk.dd

   # Never write recovered files to the source drive
   ```

2. **Use Appropriate Tools for the Situation**
   ```bash
   # Partition issues → TestDisk
   # Deleted files with intact filesystem → TestDisk undelete
   # Deleted files or damaged filesystem → PhotoRec
   # Failing hardware → ddrescue first, then recovery tools
   ```

3. **Monitor System Resources**
   ```bash
   # Recovery can be resource-intensive
   # Monitor disk I/O
   iostat -x 1

   # Monitor memory usage
   free -h

   # Use nice to lower process priority if needed
   sudo nice -n 19 photorec /dev/sda
   ```

### After Recovery

1. **Verify Recovered Files**
   ```bash
   # Check file integrity
   file /recovery/recup_dir.1/*

   # Test document files
   libreoffice --headless --convert-to pdf /recovery/*.docx

   # Verify image files
   jpeginfo -c /recovery/*.jpg
   ```

2. **Organize Recovered Files**
   ```bash
   # PhotoRec names files generically
   # Use exiftool to rename images by date
   sudo apt install libimage-exiftool-perl

   exiftool '-filename<CreateDate' -d '%Y%m%d_%H%M%S%%-c.%%e' /recovery/

   # Sort files by type
   mkdir -p /sorted/{images,documents,videos,audio,archives,other}

   find /recovery -name "*.jpg" -exec mv {} /sorted/images/ \;
   find /recovery -name "*.pdf" -exec mv {} /sorted/documents/ \;
   ```

3. **Secure the Original Drive**
   ```bash
   # Keep the original drive unchanged for potential re-analysis
   # Store in anti-static bag in cool, dry location
   # Label with date and issue description
   ```

## Prevention Tips

Preventing data loss is always better than recovering from it.

### Regular Backups

```bash
# Set up automated backups with rsync
rsync -avz --delete /home/user/ /backup/home/

# Create a cron job for daily backups
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * rsync -avz --delete /home/user/ /backup/home/ >> /var/log/backup.log 2>&1

# For versioned backups, use restic or borg
sudo apt install restic

# Initialize backup repository
restic init --repo /backup/restic-repo

# Create backup with deduplication
restic backup --repo /backup/restic-repo /home/user
```

### File System Protection

```bash
# Enable journaling (ext4 does this by default)
sudo tune2fs -l /dev/sda1 | grep "Filesystem features"

# For ext3, ensure journal is active
sudo tune2fs -O has_journal /dev/sda1

# Use copy-on-write filesystems for automatic snapshots
# Btrfs example:
sudo btrfs subvolume snapshot /home /home/.snapshots/$(date +%Y%m%d)
```

### Trash Can Best Practices

```bash
# Configure trash to keep items longer
# In GNOME, edit settings
gsettings set org.gnome.desktop.privacy old-files-age 30

# For command line deletion, use trash-cli instead of rm
sudo apt install trash-cli

# Move to trash instead of permanent deletion
trash-put important_file.txt

# List trashed files
trash-list

# Restore from trash
trash-restore

# Create an alias to prevent accidental rm usage
echo "alias rm='echo Use trash-put instead; false'" >> ~/.bashrc
```

### Disk Health Monitoring

```bash
# Install smartmontools
sudo apt install smartmontools

# Check disk health
sudo smartctl -H /dev/sda

# Run extended self-test
sudo smartctl -t long /dev/sda

# Set up automated monitoring
sudo systemctl enable smartd
sudo systemctl start smartd

# Configure alerts in /etc/smartd.conf
# DEVICESCAN -m admin@example.com -M test
```

### Safe Deletion Practices

```bash
# Before deleting, verify what you're removing
ls -la /path/to/files/

# Use interactive mode for important deletions
rm -i important_files/*

# For directories, double-check the path
echo "About to delete: /path/to/directory"
read -p "Continue? (y/N) " confirm
[[ $confirm == "y" ]] && rm -rf /path/to/directory
```

## Troubleshooting Common Issues

### TestDisk Shows No Partitions

```bash
# Try different partition table types
sudo testdisk /dev/sda

# Select: Intel (MBR)
# If no results, try: EFI GPT
# If still no results, try: None (for non-partitioned media)

# Use Deeper Search if Quick Search fails
# Analyse -> Quick Search -> Deeper Search
```

### PhotoRec Recovers Corrupted Files

```bash
# This often indicates the file was partially overwritten
# Try these approaches:

# 1. Enable "Keep corrupted files" in options
# 2. Use "Whole" partition scan instead of "Free"
# 3. Try recovery on a disk image instead of live disk

# For images, try repair tools
sudo apt install jpegoptim
jpegoptim --strip-all damaged_image.jpg

# For documents, try recovery mode in the application
libreoffice --infilter="Microsoft Word 2007-2019" corrupted.docx
```

### Disk Not Recognized

```bash
# Check kernel messages for errors
dmesg | tail -50

# Look for USB/SATA errors
dmesg | grep -i "error\|fail\|reset"

# Try reconnecting the disk
# For USB drives, try different ports or cables

# Force kernel to rescan SCSI bus
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan

# Check if disk is detected at hardware level
sudo hdparm -I /dev/sda
```

### Recovery Taking Too Long

```bash
# PhotoRec on large disks can take many hours
# Use file type filtering to speed up recovery

# Check progress in another terminal
ls -la /recovery/recup_dir.* | wc -l

# If recovering from USB, use a USB 3.0 port
# Check transfer speed
sudo dd if=/dev/sda of=/dev/null bs=1M count=100 status=progress

# For faster recovery, work on a disk image
# SSDs read much faster than HDDs
```

## Conclusion

TestDisk and PhotoRec are invaluable tools for recovering lost data on Ubuntu systems. Whether you've accidentally deleted important files, lost an entire partition, or are dealing with a failing hard drive, these tools provide a fighting chance to recover your data.

Key takeaways:
- **Always create a disk image before attempting recovery**
- **Never save recovered files to the source drive**
- **Use TestDisk for partition and file system issues**
- **Use PhotoRec for deleted file recovery**
- **Prevention through regular backups is the best strategy**

Remember that data recovery success depends heavily on how quickly you act after data loss and how much the affected area has been overwritten. The sooner you start the recovery process (and stop using the affected drive), the better your chances of successful recovery.

## Monitor Your Infrastructure with OneUptime

While data recovery tools like TestDisk and PhotoRec are essential for disaster recovery, proactive monitoring can help you prevent data loss situations before they occur. OneUptime provides comprehensive infrastructure monitoring that can alert you to disk health issues, storage capacity problems, and system anomalies before they lead to data loss.

With OneUptime, you can:

- **Monitor Disk Health**: Track SMART metrics and get alerts before drives fail
- **Track Storage Capacity**: Receive notifications when storage approaches critical thresholds
- **Monitor Backup Jobs**: Ensure your backup processes complete successfully
- **Set Up Custom Alerts**: Create alerts for any metric that matters to your data integrity
- **Incident Management**: Quickly respond to and document data-related incidents

Don't wait for data loss to happen. Visit [OneUptime](https://oneuptime.com) to learn how proactive monitoring can protect your critical data and infrastructure.
