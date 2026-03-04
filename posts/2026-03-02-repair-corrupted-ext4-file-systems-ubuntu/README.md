# How to Repair Corrupted ext4 File Systems on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ext4, Filesystems, Data Recovery, fsck

Description: Learn how to diagnose and repair corrupted ext4 filesystems on Ubuntu using fsck, debugfs, and e2fsck with practical examples and recovery strategies.

---

ext4 is the default filesystem for Ubuntu and most Linux distributions. It is robust, but power failures, hardware problems, and software bugs can occasionally leave it in a corrupted state. When this happens, you need to know the correct tools and sequence of steps to recover data and restore the filesystem without making things worse.

## Recognizing ext4 Corruption

Signs of a corrupted ext4 filesystem:

- System fails to boot with messages about filesystem errors
- Files or directories suddenly become inaccessible
- `Input/output error` when accessing files
- System drops to read-only mode after detecting errors
- `dmesg` shows kernel error messages like "EXT4-fs error"

```bash
# Check kernel ring buffer for filesystem errors
sudo dmesg | grep -i "ext4\|filesystem\|i/o error"

# Check system journal for filesystem-related messages
sudo journalctl -b | grep -i "ext4\|filesystem error"
```

## The Golden Rules Before Starting

1. **Never run fsck on a mounted filesystem** - this will cause additional corruption
2. **Take a disk image first** if you suspect physical hardware problems (use ddrescue)
3. **Work on a copy** if the data is irreplaceable
4. **fsck may delete data** to make the filesystem consistent - this is expected behavior

## Identifying the Filesystem Device

```bash
# List all block devices and their mount points
lsblk -f

# Show filesystem information for all partitions
sudo blkid

# Confirm filesystem type
sudo blkid /dev/sda1
```

## Checking Filesystem Status

Before repairing, check the current state:

```bash
# Show filesystem information without modifying anything
sudo tune2fs -l /dev/sda1

# Key fields to look for:
# "Filesystem state: clean" - healthy
# "Filesystem state: not clean" - needs repair
# "Last mount time" and "Last write time"
# "Mount count" vs "Maximum mount count"
```

## Running fsck/e2fsck

`e2fsck` is the filesystem checker for ext2/ext3/ext4 filesystems (fsck calls it automatically for ext4):

### From a Running System (Non-Root Filesystem)

```bash
# Unmount the filesystem first - never run fsck on a mounted fs
sudo umount /dev/sdb1

# Run filesystem check - interactive mode (asks about each repair)
sudo e2fsck /dev/sdb1

# Run with automatic yes to all repairs (use cautiously)
sudo e2fsck -y /dev/sdb1

# Run in verbose mode with progress
sudo e2fsck -v /dev/sdb1
```

### For the Root Filesystem

You cannot unmount the root filesystem while the system is running. Options:

**Option 1: Force fsck on next boot**

```bash
# Create a forcefsck flag file - tells the initramfs to run fsck at boot
sudo touch /forcefsck

# Reboot
sudo reboot
```

**Option 2: Boot from Ubuntu live USB**

Boot from a live USB, then from a terminal:

```bash
# Identify the root partition
lsblk

# Run e2fsck on the root partition (NOT mounted)
sudo e2fsck -f /dev/sda1
```

**Option 3: Use recovery mode**

Restart and hold Shift during boot to access GRUB. Choose "Advanced options" then "Recovery mode." From the recovery menu, select "fsck."

## Understanding e2fsck Output

```bash
# Typical e2fsck output when problems are found
e2fsck 1.47.0 (5-Feb-2023)
Pass 1: Checking inodes, blocks, and sizes
Pass 2: Checking directory structure
Pass 3: Checking directory connectivity
Inode 2105 has a bad block #0.  Clear? yes   # e2fsck found and fixed an inode issue

Pass 4: Checking reference counts
Pass 5: Checking group summary information
Block bitmap differences:  -(34816--34817)
Fix? yes

/dev/sdb1: ***** FILE SYSTEM WAS MODIFIED *****
/dev/sdb1: 145283/488640 files (0.1% non-contiguous), 1234567/1953504 blocks
```

When e2fsck finds orphaned inodes (files without directory entries), it moves them to the `/lost+found` directory:

```bash
# Check lost+found after repair for recovered files
ls /lost+found/
```

Files in `/lost+found` have numeric names (their inode numbers). You can try to identify them by content:

```bash
# Identify file type of recovered file
file /lost+found/12345

# For text files, look at content
head -20 /lost+found/12345
```

## Using debugfs for Investigation and Manual Repair

`debugfs` is an interactive filesystem debugger. It lets you examine filesystem internals and perform low-level repairs:

```bash
# Open filesystem in read-only mode for investigation
sudo debugfs /dev/sdb1

# Or open read-write for repairs
sudo debugfs -w /dev/sdb1
```

Common debugfs commands:

```bash
# Inside debugfs prompt:

# Show filesystem statistics
stats

# List directory contents
ls /

# Show inode information for a file
stat /path/to/file

# Recover a deleted file by inode number
undel <1234> /recovered_file

# List all deleted inodes
lsdel

# Show block usage
show_super_stats

# Dump a file to disk
dump <inode_number> /tmp/recovered.dat

# Exit debugfs
quit
```

## Recovering Deleted Files with debugfs

```bash
# Open filesystem
sudo debugfs /dev/sdb1

# List recently deleted inodes
debugfs: lsdel

# The output shows inode numbers with deletion times
# For each inode you want to recover:
debugfs: stat <12345>    # View inode details to identify the file

# Dump the file content
debugfs: dump <12345> /tmp/recovered_file.dat

# Or use undel to restore the directory entry
debugfs: undel <12345> /destination/path
```

## Fixing Superblock Corruption

The superblock stores critical filesystem metadata. If it is corrupted, the filesystem cannot be mounted:

```bash
# List backup superblock locations
sudo dumpe2fs /dev/sdb1 2>/dev/null | grep -i superblock | head -5

# Or calculate backup locations (they are at fixed offsets)
mke2fs -n /dev/sdb1  # -n means do not actually create, just show what would be created
```

Mount using a backup superblock:

```bash
# Use backup superblock at block 32768 (a common backup location)
sudo fsck.ext4 -b 32768 /dev/sdb1

# Or mount directly with the backup superblock
sudo mount -o sb=32768 /dev/sdb1 /mnt/recovery
```

## Journal Recovery

ext4's journal helps recover from unclean shutdowns. If the journal itself is corrupted:

```bash
# Replay the journal manually
sudo e2fsck -f /dev/sdb1

# If the journal is too corrupted, remove it and run without journaling
# WARNING: Only do this if e2fsck fails due to journal corruption
sudo tune2fs -O ^has_journal /dev/sdb1
sudo e2fsck -f /dev/sdb1

# Re-add the journal after repair
sudo tune2fs -O has_journal /dev/sdb1
```

## Checking for Bad Blocks

If you suspect hardware-level problems causing filesystem errors:

```bash
# Read-only bad block scan (safe, non-destructive)
sudo badblocks -v /dev/sdb1 2>&1 | tee /tmp/badblocks.txt

# Pass bad block information to e2fsck
sudo e2fsck -l /tmp/badblocks.txt /dev/sdb1
```

If bad blocks are found, they are marked in the filesystem and future writes will avoid them. However, significant bad blocks are a strong warning sign - the drive should be replaced soon.

## Verifying Repair Success

After running e2fsck:

```bash
# Run e2fsck again to confirm no more errors
sudo e2fsck -f /dev/sdb1

# Should report "clean" at the end
# "0/X files" and "0/X blocks" in the error count confirm a clean filesystem

# Check tune2fs output
sudo tune2fs -l /dev/sdb1 | grep "Filesystem state"
# Should show: Filesystem state: clean

# Mount and verify data
sudo mount /dev/sdb1 /mnt/test
ls /mnt/test/
```

## Setting Up Automatic fsck Schedule

By default, Ubuntu runs e2fsck after every 30 mounts or after a certain number of days:

```bash
# Check current fsck settings
sudo tune2fs -l /dev/sda1 | grep -E "Check interval|Mount count|Maximum mount"

# Set maximum mount count before forced fsck
sudo tune2fs -c 20 /dev/sda1   # Run fsck every 20 mounts

# Set maximum time interval (in days)
sudo tune2fs -i 30d /dev/sda1  # Run fsck every 30 days

# Disable automatic check scheduling (not recommended for production)
sudo tune2fs -c 0 -i 0 /dev/sda1
```

A corrupted ext4 filesystem is often recoverable with the right approach. The combination of e2fsck for automated repair, debugfs for targeted recovery, and backup superblocks for catastrophic cases covers most scenarios. The critical factor is always acting on an unmounted partition and preserving a disk image before making any changes.
