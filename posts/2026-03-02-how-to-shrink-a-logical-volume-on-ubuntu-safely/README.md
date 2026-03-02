# How to Shrink a Logical Volume on Ubuntu Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Disk Management, Linux

Description: Safely shrink an LVM Logical Volume and its filesystem on Ubuntu by following the correct order of operations and avoiding common data loss mistakes.

---

Shrinking a Logical Volume is riskier than extending one, and it has stricter requirements. You must shrink the filesystem before shrinking the block device - doing it the other way around truncates live data and causes filesystem corruption. This guide covers the safe sequence for shrinking ext4 volumes on Ubuntu, and explains why XFS cannot be shrunk.

## Critical Warning

Shrinking requires:
1. The filesystem must be **unmounted** (with very few exceptions)
2. You must **shrink the filesystem first**, then shrink the LV
3. The filesystem must be smaller than the new LV size you're targeting

Getting the order wrong - shrinking the LV before the filesystem - will corrupt or destroy data. Take a backup or snapshot before proceeding.

## What Can and Cannot Be Shrunk

**ext4** - Can be shrunk. Requires unmounting and running `fsck` first.

**XFS** - Cannot be shrunk. XFS only supports growth, not reduction. If you need a smaller XFS volume, you must create a new smaller one and migrate data.

**Btrfs** - Can be shrunk using `btrfs filesystem resize` while mounted.

The examples in this guide assume ext4.

## Step 0: Take a Backup or Snapshot

Before shrinking, protect yourself:

```bash
# Create an LVM snapshot as insurance
sudo lvcreate -L 20G -s -n db_data_snap /dev/data_vg/db_data

# Or use rsync to back up to another location
sudo rsync -av /mount/point/ /backup/location/
```

## Step 1: Unmount the Filesystem

```bash
# Identify what is mounted where
mount | grep db_data

# Unmount
sudo umount /var/lib/postgresql
```

If you get "target is busy":

```bash
# Find processes using the mount
sudo lsof /var/lib/postgresql
# or
sudo fuser -m /var/lib/postgresql

# Stop the relevant services
sudo systemctl stop postgresql
sudo umount /var/lib/postgresql
```

For the root filesystem or other critical mounts, you need to do this from a live USB or recovery mode.

## Step 2: Run fsck on the Unmounted Filesystem

`resize2fs` requires the filesystem to pass a clean `fsck` check before it will proceed:

```bash
sudo e2fsck -f /dev/data_vg/db_data
```

The `-f` flag forces a check even if the filesystem was cleanly unmounted. You should see:

```
e2fsck 1.46.5 (30-Dec-2021)
Pass 1: Checking inodes, blocks, and sizes
Pass 2: Checking directory structure
Pass 3: Checking directory connectivity
Pass 4: Checking reference counts
Pass 5: Checking group summary information
/dev/mapper/data_vg-db_data: 15432/13107200 files (0.5% non-contiguous), 1048576/52428800 blocks
```

If fsck reports errors, fix them before proceeding. Do not shrink a filesystem with errors.

## Step 3: Calculate the Target Sizes

Decide how much space the filesystem needs. Check current usage:

```bash
# How much data is actually in the filesystem?
# Mount it read-only temporarily to check
sudo mount -o ro /dev/data_vg/db_data /mnt/temp
du -sh /mnt/temp
sudo umount /mnt/temp
```

Leave reasonable headroom. If you have 80GB of data, don't shrink to 85GB - leave at least 20% free for normal operation. Target 100GB as a minimum.

## Step 4: Shrink the Filesystem

Shrink the ext4 filesystem to the target size. The filesystem must remain **smaller** than the LV you'll set in the next step:

```bash
# Shrink filesystem to 100GB
# Target the LV device (unmounted)
sudo resize2fs /dev/data_vg/db_data 100G
```

Expected output:
```
resize2fs 1.46.5 (30-Dec-2021)
Resizing the filesystem on /dev/data_vg/db_data to 26214400 (4k) blocks.
The filesystem on /dev/data_vg/db_data is now 26214400 (4k) blocks long.
```

The number shown is the new block count. With 4k blocks, `26214400 * 4096 = 100GB`.

**If resize2fs fails**: The most common reason is insufficient space - the filesystem already contains more data than the target size. You cannot compress data; you must actually delete files to free up space, or choose a larger target size.

## Step 5: Shrink the Logical Volume

Now shrink the LV to match or slightly exceed the filesystem size. The LV must be at least as large as the filesystem - making them exactly equal is fine:

```bash
# Shrink the LV to 100GB
sudo lvreduce -L 100G /dev/data_vg/db_data
```

LVM will warn you:

```
  WARNING: Reducing active logical volume to 100.00 GiB.
  THIS MAY DESTROY YOUR DATA (filesystem etc.)
  Do you really want to reduce data_vg/db_data? [y/n]: y
  Size of logical volume data_vg/db_data changed from 200.00 GiB to 100.00 GiB.
  Logical volume data_vg/db_data successfully resized.
```

LVM always shows this warning for reduction operations. Since you already shrunk the filesystem in step 4, the data is safe.

### Alternative: Use lvresize to specify a relative reduction

```bash
# Reduce by 100GB from current size
sudo lvresize -L -100G /dev/data_vg/db_data
```

## Step 6: Verify and Run fsck Again

After shrinking the LV, run fsck once more to confirm the filesystem is intact:

```bash
sudo e2fsck -f /dev/data_vg/db_data
```

This confirms the resize operations completed without corruption.

## Step 7: Remount and Verify

```bash
# Mount the filesystem
sudo mount /dev/data_vg/db_data /var/lib/postgresql

# Verify the new size
df -h /var/lib/postgresql

# Start services again
sudo systemctl start postgresql
```

## Step 8: Remove the Snapshot (if you created one)

If you created a snapshot in step 0 and everything looks good:

```bash
sudo lvremove /dev/data_vg/db_data_snap
```

## The Combined lvreduce -r Approach

`lvreduce` has a `-r` flag similar to `lvextend`. However, for shrinking, `-r` does things in the right order (filesystem first, then LV), but it still requires the filesystem to be unmounted for ext4. Use it carefully:

```bash
# This does resize2fs then lvreduce automatically
# Still requires the filesystem to be unmounted for ext4
sudo lvreduce -L 100G -r /dev/data_vg/db_data
```

If the filesystem is still mounted, the `-r` flag will refuse to proceed for ext4 (which is the correct behavior - it protects you).

## Shrinking the Root Filesystem

Shrinking `/` (root) cannot be done while the system is running from it. You need to boot from:

- A Ubuntu live USB
- Recovery mode (if you have enough RAM)

From the live environment:

```bash
# Install lvm2 if not present
sudo apt install lvm2

# Activate the VG
sudo vgchange -ay

# Follow steps 2-7 as above
sudo e2fsck -f /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv 30G
sudo lvreduce -L 30G /dev/ubuntu-vg/ubuntu-lv
sudo e2fsck -f /dev/ubuntu-vg/ubuntu-lv
```

Then reboot from the main system and verify.

## Summary of the Correct Order

```
1. Backup / snapshot
2. Stop services
3. Unmount filesystem
4. fsck -f on the device
5. resize2fs <device> <new-smaller-size>
6. lvreduce -L <new-size> <device>
7. fsck -f again to verify
8. Remount
9. Start services
10. Remove snapshot if satisfied
```

Following this sequence consistently prevents data loss during LV shrink operations.
