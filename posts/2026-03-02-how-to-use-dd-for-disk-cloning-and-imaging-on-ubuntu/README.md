# How to Use dd for Disk Cloning and Imaging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Storage, Backup, System Administration

Description: Use dd on Ubuntu to clone disks, create disk images, back up and restore partitions, and securely erase drives, with practical examples and performance optimization tips.

---

`dd` (data duplicator, though commonly misnamed "disk destroyer" as a reminder to be careful) copies data at the block level. It reads from a source, optionally transforms the data, and writes to a destination. Unlike filesystem-aware tools, `dd` doesn't know or care about files - it copies raw bytes. This makes it useful for disk cloning, image creation, partition backup, and secure erasure, but it also means a mistake with the `if=` and `of=` parameters can destroy data.

## Understanding dd Syntax

```bash
dd if=<input file> of=<output file> [options]
```

Common options:

| Option | Meaning |
|--------|---------|
| `if=` | Input file/device |
| `of=` | Output file/device |
| `bs=` | Block size for read/write operations |
| `count=` | Number of blocks to copy |
| `skip=` | Skip N blocks at the start of input |
| `seek=` | Skip N blocks at the start of output |
| `status=progress` | Show progress (Linux dd) |
| `conv=sync` | Pad incomplete blocks |
| `conv=noerror` | Continue after read errors |

## Cloning a Disk

### Full disk clone (disk to disk)

```bash
# Clone sda to sdb - copies everything including partition table
# WARNING: This completely overwrites /dev/sdb
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress conv=fsync
```

The `conv=fsync` ensures the output is flushed to disk before dd exits, preventing data loss if power is interrupted right after the copy.

A few important notes:
- The destination disk (`of=`) must be equal to or larger than the source
- Both disks should have similar sector sizes (512B or 4K)
- If copying to a larger disk, you'll need to expand the partition and filesystem afterwards

### Verify the clone

After cloning, check the destination disk:

```bash
# Verify partition table was cloned correctly
sudo fdisk -l /dev/sdb

# Mount and spot-check the clone
sudo mkdir -p /mnt/clone
sudo mount /dev/sdb2 /mnt/clone  # Mount the appropriate partition
ls /mnt/clone
sudo umount /mnt/clone
```

## Creating a Disk Image

A disk image is a file containing an exact copy of a disk or partition's contents.

### Full disk image to a file

```bash
# Create a compressed image of /dev/sdb
# Pipe through gzip for compression
sudo dd if=/dev/sdb bs=4M status=progress | gzip > /backup/sdb-backup-$(date +%Y%m%d).img.gz

# Or save uncompressed for faster backup/restore
sudo dd if=/dev/sdb of=/backup/sdb-backup-$(date +%Y%m%d).img bs=4M status=progress conv=fsync
```

### Single partition image

```bash
# Image just the data partition
sudo dd if=/dev/sdb1 of=/backup/sdb1-$(date +%Y%m%d).img bs=4M status=progress conv=fsync

# Compressed version
sudo dd if=/dev/sdb1 bs=4M status=progress | gzip > /backup/sdb1-$(date +%Y%m%d).img.gz
```

## Restoring from a Disk Image

```bash
# Restore uncompressed image to disk
sudo dd if=/backup/sdb-backup-20260302.img of=/dev/sdb bs=4M status=progress conv=fsync

# Restore compressed image
gunzip -c /backup/sdb-backup-20260302.img.gz | sudo dd of=/dev/sdb bs=4M status=progress conv=fsync

# Restore to a partition
sudo dd if=/backup/sdb1-20260302.img of=/dev/sdb1 bs=4M status=progress conv=fsync
```

## Backing Up Only Partitioned Space

One problem with full disk images is that they include all the free space. A 500GB disk creates a 500GB image even if only 20GB of data is on it. To image only the used space, you need to know where the last partition ends.

```bash
# Find where the last partition ends
sudo fdisk -l /dev/sdb | grep "^/dev/"
# Look for the highest "End" sector value
```

Example output:

```text
/dev/sdb1   2048    1050623   1048576  512M Linux filesystem
/dev/sdb2  1050624  3147775   2097152    1G Linux filesystem
/dev/sdb3  3147776  62914526  59766751  28.5G Linux filesystem
```

The last partition ends at sector 62914526. With 512-byte sectors:

```bash
# Calculate: 62914526 sectors * 512 bytes/sector = 32,212,237,312 bytes ≈ 29.99 GB
# Add a bit of buffer and copy only that amount:
LAST_SECTOR=62914526
SECTOR_SIZE=512
BYTES_TO_COPY=$(( (LAST_SECTOR + 1) * SECTOR_SIZE ))

sudo dd if=/dev/sdb of=/backup/sdb-used.img bs=4M count=$(( BYTES_TO_COPY / (4*1024*1024) + 1 )) status=progress
```

Or use a tool like `partclone` or `partimage` which understand filesystem structure and only copy used blocks.

## Monitoring dd Progress

By default, older versions of dd don't show progress. Modern Linux dd has `status=progress`:

```bash
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress
```

Output:

```text
10737418240 bytes (11 GB, 10 GiB) copied, 25.5 s, 421 MB/s
```

For older systems or to check progress of a running dd:

```bash
# Send SIGUSR1 to a running dd process to print stats
sudo kill -USR1 $(pgrep dd)
```

Or use `pv` for a real-time progress bar:

```bash
# Install pv
sudo apt install pv

# Use pv to show progress
sudo dd if=/dev/sda bs=4M | pv | sudo dd of=/dev/sdb bs=4M
```

## Optimizing dd Performance

Block size significantly affects dd speed:

```bash
# Small block size (512 bytes) - slow
sudo dd if=/dev/zero of=/dev/null bs=512 count=1000000 status=progress

# Large block size (4MB) - much faster
sudo dd if=/dev/zero of=/dev/null bs=4M count=2500 status=progress
```

For disk cloning, `bs=4M` is a good general-purpose block size. For HDDs, `bs=64M` can sometimes be faster. For SSDs, `bs=4M` to `bs=16M` is usually optimal.

## Secure Disk Erasure

Before decommissioning a disk, you want to overwrite it to prevent data recovery.

```bash
# Overwrite disk with zeros (one pass - sufficient for SSDs, basic for HDDs)
sudo dd if=/dev/zero of=/dev/sdb bs=4M status=progress

# Overwrite with random data (better for HDDs, prevents statistical analysis)
sudo dd if=/dev/urandom of=/dev/sdb bs=4M status=progress

# For SSD, issue a Secure Erase command (more thorough than overwriting)
# hdparm method (requires the disk to support it)
sudo hdparm -I /dev/sdb | grep -i "security"
sudo hdparm --security-set-pass password /dev/sdb
sudo hdparm --security-erase password /dev/sdb
```

For SSDs, the hardware-level Secure Erase command is more effective than dd-based overwriting because it resets the drive's internal wear-leveling mapping.

## Creating a Bootable USB Drive

`dd` is commonly used to write ISO images to USB drives:

```bash
# Identify the USB drive
lsblk

# Write ISO to USB drive (replace sdX with your USB device)
# WARNING: This overwrites the USB drive entirely
sudo dd if=/path/to/ubuntu-22.04.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

The `oflag=sync` ensures writes are synchronized, reducing the chance of a corrupted USB drive if you remove it prematurely.

## Copying the MBR or Boot Sector

Sometimes you need to back up just the boot sector (first 512 bytes) or first few sectors:

```bash
# Backup MBR (first 512 bytes: 446 MBR + 64 partition table + 2 signature)
sudo dd if=/dev/sda of=/backup/sda-mbr.bin bs=512 count=1

# Backup partition table only (part of MBR, starting at byte 446)
sudo dd if=/dev/sda of=/backup/sda-partition-table.bin bs=1 skip=446 count=66

# Restore MBR (boot code only, not partition table)
sudo dd if=/backup/sda-mbr.bin of=/dev/sda bs=446 count=1
```

## dd Safety Checklist

Before running any `dd` command that writes data:

1. Confirm `if=` (input) and `of=` (output) are correctly assigned - reversing them destroys your source data
2. Verify the output device path with `lsblk` or `fdisk -l` right before running
3. For destructive operations, unmount the target first
4. For disk clones, verify the destination is large enough
5. Use `status=progress` so you can see if it's making progress
6. Test with a small `count=` first if you're uncertain

`dd` is powerful precisely because it doesn't ask questions. That makes it fast and flexible, but it also means verification and carefulness are your responsibility.
