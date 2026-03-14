# How to Repair a Corrupted ext4 Filesystem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ext4, Filesystem Recovery, E2fsck, Storage, Linux

Description: Learn how to diagnose and repair corrupted ext4 filesystems on RHEL using e2fsck, including handling superblock corruption, journal recovery, and data salvage techniques.

---

ext4 filesystem corruption can occur due to hardware failures, power outages, or kernel bugs. The `e2fsck` utility is the primary tool for checking and repairing ext4 filesystems on RHEL. This guide covers how to diagnose and fix various types of ext4 corruption.

## Prerequisites

- A RHEL system with root or sudo access
- A corrupted or suspected corrupted ext4 filesystem
- The `e2fsprogs` package installed
- The filesystem must be unmounted before repair

## Step 1: Unmount the Filesystem

e2fsck must never be run on a mounted filesystem:

```bash
sudo umount /data
```

If the filesystem is busy:

```bash
sudo fuser -mv /data
sudo umount -f /data
```

For the root filesystem, boot from rescue media.

## Step 2: Run e2fsck

### Basic Check

```bash
sudo e2fsck /dev/vg_data/lv_data
```

If the filesystem appears clean, e2fsck will skip the check. Force a check with:

```bash
sudo e2fsck -f /dev/vg_data/lv_data
```

### Interactive Repair

By default, e2fsck prompts for each repair. For automated repair (answer yes to all):

```bash
sudo e2fsck -y /dev/vg_data/lv_data
```

### Check Without Modifying

Run in read-only mode:

```bash
sudo e2fsck -n /dev/vg_data/lv_data
```

### Verbose Output

```bash
sudo e2fsck -v /dev/vg_data/lv_data
```

## Step 3: Understand e2fsck Passes

e2fsck runs five passes:

1. **Pass 1**: Check inodes, blocks, and sizes
2. **Pass 2**: Check directory structure
3. **Pass 3**: Check directory connectivity
4. **Pass 4**: Check reference counts
5. **Pass 5**: Check group summary information

Each pass addresses different types of corruption.

## Step 4: Handle Superblock Corruption

If the primary superblock is corrupted, e2fsck may fail to start. Use a backup superblock:

Find backup superblock locations:

```bash
sudo dumpe2fs /dev/vg_data/lv_data | grep "Backup superblock"
```

Or calculate them:

```bash
sudo mkfs.ext4 -n /dev/vg_data/lv_data
```

The `-n` flag does a dry run without actually formatting.

Run e2fsck with a backup superblock:

```bash
sudo e2fsck -b 32768 /dev/vg_data/lv_data
```

Common backup superblock locations: 32768, 98304, 163840, 229376.

## Step 5: Handle Journal Corruption

If the journal is corrupted:

```bash
sudo e2fsck -j /dev/vg_data/lv_data
```

If that fails, remove and recreate the journal:

```bash
# Remove the journal
sudo tune2fs -O ^has_journal /dev/vg_data/lv_data

# Run e2fsck without journal
sudo e2fsck -f /dev/vg_data/lv_data

# Recreate the journal
sudo tune2fs -j /dev/vg_data/lv_data
```

## Step 6: Recover Files from lost+found

After repair, disconnected files are placed in `lost+found`:

```bash
sudo mount /dev/vg_data/lv_data /data
ls -la /data/lost+found/
```

Files are named by inode number. Identify them:

```bash
file /data/lost+found/*
```

For text files:

```bash
head /data/lost+found/#12345
```

## Step 7: Repair the Root Filesystem

Boot from RHEL installation media in rescue mode:

1. Choose "Troubleshooting" then "Rescue a Red Hat Enterprise Linux system"
2. Choose option 3 (Skip) to avoid mounting
3. Activate LVM:

```bash
vgchange -ay
```

4. Run e2fsck:

```bash
e2fsck -y /dev/mapper/rhel-root
```

5. Reboot:

```bash
reboot
```

## Step 8: Handle Severe Corruption

For severe damage where normal repair fails:

### Force Check All Blocks

```bash
sudo e2fsck -c /dev/vg_data/lv_data
```

The `-c` flag runs `badblocks` to check for physical media errors.

### Check with Extended Options

```bash
sudo e2fsck -E fragcheck /dev/vg_data/lv_data
```

### Rebuild Entire Directory

If directory structures are severely damaged:

```bash
sudo e2fsck -D /dev/vg_data/lv_data
```

The `-D` flag optimizes and rebuilds directories.

## Step 9: Verify the Repair

After repair:

```bash
# Run check again to confirm
sudo e2fsck -f /dev/vg_data/lv_data

# Mount and verify
sudo mount /dev/vg_data/lv_data /data
df -Th /data
ls -la /data/
```

## Understanding e2fsck Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No errors |
| 1 | Filesystem errors corrected |
| 2 | Filesystem errors corrected, system should be rebooted |
| 4 | Filesystem errors left uncorrected |
| 8 | Operational error |
| 16 | Usage or syntax error |
| 32 | e2fsck cancelled by user |
| 128 | Shared library error |

## Common Error Messages

### "Superblock invalid"

Use a backup superblock as described in Step 4.

### "Group descriptors look bad"

The group descriptor table is corrupted. e2fsck will try to repair from redundant copies.

### "Inode bitmap differences"

The inode bitmap does not match actual inode allocation. e2fsck fixes this automatically.

### "Block bitmap differences"

Similar to inode bitmap, but for data blocks. Fixed automatically.

### "Multiply-claimed blocks"

Two or more files claim the same data blocks. e2fsck will clone the blocks, giving each file its own copy.

## Preventing Corruption

- **Use UPS or battery-backed storage** to prevent power-loss corruption
- **Keep barriers enabled** (the default) for write ordering guarantees
- **Monitor disk health** with smartmontools:

```bash
sudo dnf install smartmontools -y
sudo smartctl -a /dev/sdb
```

- **Enable periodic filesystem checks**: Configure `tune2fs` to check after a certain number of mounts or time interval
- **Maintain backups**: No repair tool guarantees complete recovery

## Conclusion

Repairing ext4 filesystems on RHEL with e2fsck is a well-established process with tools for handling everything from minor inconsistencies to severe corruption. The key is to unmount the filesystem before repair, use backup superblocks when needed, and always verify the repair with a subsequent check. Combined with hardware monitoring and regular backups, you can effectively manage and recover from ext4 filesystem corruption.
