# How to Check and Repair File Systems with fsck on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, File System, System Administration, Storage

Description: Use fsck to check and repair ext4, XFS, and other filesystems on Ubuntu, including how to force checks, handle unclean shutdowns, and recover from filesystem corruption.

---

`fsck` (filesystem check) is the standard tool for verifying and repairing filesystems. Filesystem corruption can happen after unexpected power loss, a kernel crash, or hardware problems. Knowing how to run fsck correctly - and importantly, when not to run it - can save you from data loss.

## The Cardinal Rule: fsck on Unmounted Filesystems

Running fsck on a mounted filesystem is dangerous. It can cause worse corruption than you started with, because the running system and fsck will both be modifying filesystem metadata simultaneously. The only exception is `e2fsck -n` (read-only check).

The root filesystem (`/`) cannot be unmounted while the system is running, which is why fsck of the root filesystem happens at boot time or from a live USB environment.

## How Ubuntu Handles Automatic fsck

Ubuntu uses `e2fsck` for ext4 filesystems and schedules automatic checks based on mount count and time elapsed since the last check. Check the schedule:

```bash
sudo tune2fs -l /dev/sda1 | grep -E "Mount count|Maximum mount|Last checked|Check interval"
```

Output:

```text
Mount count:              47
Maximum mount count:      -1
Last checked:             Mon Mar  2 09:00:00 2026
Check interval:           0 (<none>)
```

A `Maximum mount count` of `-1` and `Check interval` of `0` means automatic checks are disabled (the default on modern Ubuntu). Systemd handles filesystem integrity through other mechanisms.

## Checking a Filesystem Manually

### Read-only check (safe on mounted filesystems)

```bash
# Check without making any changes
sudo e2fsck -n /dev/sdb1

# For XFS (also read-only)
sudo xfs_check /dev/sdb1 2>/dev/null
# or
sudo xfs_repair -n /dev/sdb1
```

Output from a clean ext4 filesystem:

```text
e2fsck 1.46.5 (30-Dec-2021)
/dev/sdb1: clean, 11/1310720 files, 5243100/5242880 blocks
```

Output when problems exist:

```text
/dev/sdb1: UNEXPECTED INCONSISTENCY; RUN fsck MANUALLY.
	(i.e., without -n or -p options)
```

### Full interactive check

First, unmount the filesystem:

```bash
# Unmount the filesystem
sudo umount /mnt/data

# Run check and repair
sudo e2fsck -f /dev/sdb1
```

The `-f` flag forces a full check even if the filesystem appears clean.

Interactive output with problems:

```text
e2fsck 1.46.5 (30-Dec-2021)
ext2fs_open2: Bad magic number in super-block
fsck.ext2: Superblock invalid, trying backup blocks...
/dev/sdb1 was not cleanly unmounted, check forced.
Pass 1: Checking inodes, blocks, and sizes
...
Fix<y>? y
```

Press `y` to accept each repair, or use `-y` flag to automatically answer yes:

```bash
# Automatically accept all repairs (use with caution)
sudo e2fsck -y /dev/sdb1
```

### Force check at next boot (for root filesystem)

```bash
# Schedule a check of the root filesystem on next boot
sudo touch /forcefsck

# Or using tune2fs to force a check after a specific number of mounts
sudo tune2fs -C 1 /dev/sda3  # Set mount count high to trigger check
```

Alternatively:

```bash
# Add fsck.mode=force to kernel command line temporarily
# Edit GRUB entry at boot: add 'fsck.mode=force' to kernel line
```

## fsck for Different Filesystem Types

`fsck` is actually a wrapper that calls the appropriate filesystem-specific tool:

| Filesystem | fsck calls | Direct command |
|-----------|-----------|----------------|
| ext2/3/4 | `e2fsck` | `e2fsck` |
| XFS | `xfs_repair` | `xfs_repair` |
| Btrfs | `btrfsck`/`btrfs check` | `btrfs check` |
| FAT/vFAT | `dosfsck`/`fsck.fat` | `fsck.fat` |

```bash
# fsck dispatches to the right tool automatically
sudo fsck /dev/sdb1   # Checks whatever filesystem is on sdb1

# Or call directly
sudo e2fsck /dev/sdb1    # ext4
sudo xfs_repair /dev/sdb1  # XFS
```

## XFS Specific: xfs_repair

XFS has its own repair tool. Key differences from e2fsck:
- XFS can use its journal to replay uncommitted transactions (automatic on mount)
- `xfs_repair` is for more serious corruption that the journal replay didn't fix

```bash
# Replay the XFS journal first (read-only, safe)
sudo xfs_repair -n /dev/sdb1

# Run repair (filesystem must be unmounted)
sudo umount /mnt/data
sudo xfs_repair /dev/sdb1

# If xfs_repair fails with "dirty log" error, clear the log first
# (only do this if the filesystem truly won't mount)
sudo xfs_repair -L /dev/sdb1  # -L clears the log - dangerous, last resort
```

## Btrfs Specific: btrfs check

```bash
# Check Btrfs (filesystem should be unmounted)
sudo btrfs check /dev/sdb1

# Read-only check
sudo btrfs check --readonly /dev/sdb1

# Repair (use with caution, may cause data loss)
sudo btrfs check --repair /dev/sdb1
```

For Btrfs, the standard recovery approach is to use snapshots to roll back rather than repair. Btrfs check --repair is considered risky and should be a last resort.

## Diagnosing and Fixing a Corrupted Superblock

If the ext4 superblock is corrupted, fsck will report it and offer to use a backup:

```bash
# Find backup superblock locations
sudo mke2fs -n /dev/sdb1  # Dry run shows superblock locations without formatting
```

Output:

```text
Superblock backups stored on blocks:
	32768, 98304, 163840, 229376, 294912, ...
```

Use a backup superblock:

```bash
# Specify backup superblock location
sudo e2fsck -b 32768 /dev/sdb1
```

If one backup doesn't work, try the next one.

## Checking Filesystem at Boot (Live System Approach)

For checking the root filesystem without a live USB, configure fsck to run at next boot:

```bash
# Create the flag file that triggers fsck at boot
sudo touch /forcefsck

# Reboot
sudo reboot
```

The system will run fsck on all filesystems before mounting them. Results appear on the console. After the check completes, the system boots normally and the forcefsck file is removed.

## fsck in Recovery Mode

Ubuntu's recovery mode boot option provides a root shell where you can run fsck manually:

1. Reboot and hold Shift during boot to access GRUB
2. Select "Advanced options for Ubuntu"
3. Select the recovery mode option
4. Choose "Drop to root shell prompt"
5. Remount root read-write: `mount -o remount,rw /`
6. Run fsck: `e2fsck -f /dev/sda1`

## Understanding fsck Exit Codes

`e2fsck` returns exit codes you can check in scripts:

| Code | Meaning |
|------|---------|
| 0 | No errors found |
| 1 | Filesystem errors corrected |
| 2 | System should be rebooted |
| 4 | Filesystem errors left uncorrected |
| 8 | Operational error |
| 16 | Usage or syntax error |
| 128 | Library error |

```bash
sudo e2fsck -y /dev/sdb1
echo "Exit code: $?"
# Codes 0 and 1 are success; anything else needs attention
```

## Preventing Filesystem Corruption

Most filesystem corruption is preventable:

```bash
# Ensure filesystems are synced before shutdown
sudo sync

# For critical applications, use journaled writes
# ext4 with data=journal mount option (slower but more resilient)
sudo mount -o data=journal /dev/sdb1 /mnt/data

# Check disk health regularly to catch hardware problems early
sudo smartctl -H /dev/sda
sudo smartctl -a /dev/sda | grep -E "Reallocated|Current_Pending|Uncorrectable"
```

High values in `Reallocated_Sector_Ct`, `Current_Pending_Sector`, or `Uncorrectable_Sector_Count` indicate a failing disk. Filesystem problems caused by hardware failures can't be permanently fixed by fsck - you need to replace the disk and restore from backup.

Running periodic filesystem checks and responding quickly to SMART warnings keeps you ahead of corruption rather than reacting to it after the fact.
