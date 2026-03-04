# How to Mount File Systems Read-Only for Forensics and Recovery on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Forensics, Recovery, Mount, Storage, Security, Linux

Description: Learn how to mount file systems in read-only mode on RHEL for forensic analysis and data recovery without altering evidence or source data.

---

When performing forensic analysis or recovering data from a damaged system, it is critical to mount file systems in read-only mode. Any write operation -- even an accidental one -- can destroy evidence or corrupt data you are trying to recover. RHEL provides several methods to ensure file systems are mounted without any possibility of modification.

## Why Read-Only Mounting Matters

When you mount a file system normally (read-write), the operating system may:

- Update file access timestamps (atime)
- Replay journal entries on journaled file systems
- Modify superblock metadata
- Run file system checks that alter the disk

For forensic investigations, these changes can invalidate evidence. For data recovery, they can make a bad situation worse.

## Basic Read-Only Mount

Mount a partition read-only using the `-o ro` flag:

```bash
sudo mount -o ro /dev/sdb1 /mnt/evidence
```

Verify it is mounted read-only:

```bash
mount | grep /mnt/evidence
```

You should see `ro` in the mount options:

```text
/dev/sdb1 on /mnt/evidence type xfs (ro,relatime)
```

## Preventing Journal Replay

Journaled file systems like XFS and ext4 may attempt to replay their journal even when mounted read-only. To prevent this:

For XFS:

```bash
sudo mount -o ro,norecovery /dev/sdb1 /mnt/evidence
```

The `norecovery` option prevents XFS from replaying its log.

For ext4:

```bash
sudo mount -o ro,noload /dev/sdb1 /mnt/evidence
```

The `noload` option prevents ext4 from loading or replaying its journal.

## Disabling Access Time Updates

Even on a read-only mount, explicitly add `noatime` for extra safety:

```bash
sudo mount -o ro,norecovery,noatime /dev/sdb1 /mnt/evidence
```

## Using the Block Device Read-Only Flag

For an additional layer of protection, set the block device itself to read-only before mounting:

```bash
sudo blockdev --setro /dev/sdb
```

Verify:

```bash
sudo blockdev --getro /dev/sdb
```

Output of `1` means read-only. Now mount:

```bash
sudo mount -o ro,norecovery /dev/sdb1 /mnt/evidence
```

Even if someone accidentally tries to remount read-write, the block device restriction prevents it.

To reset the device back to read-write later:

```bash
sudo blockdev --setrw /dev/sdb
```

## Working with Disk Images

For forensic work, it is best practice to work with a copy of the disk rather than the original. Create an image:

```bash
sudo dd if=/dev/sdb of=/forensics/disk_image.raw bs=4M status=progress
```

Mount the image using a loop device:

```bash
sudo losetup -r /dev/loop0 /forensics/disk_image.raw
sudo mount -o ro,norecovery /dev/loop0 /mnt/evidence
```

The `-r` flag on losetup sets the loop device to read-only.

For images with partition tables, use the offset:

```bash
# Find partition offsets
sudo fdisk -l /forensics/disk_image.raw

# Mount with offset (example: partition starts at sector 2048, sector size 512)
sudo mount -o ro,norecovery,offset=$((2048*512)) /forensics/disk_image.raw /mnt/evidence
```

## Mounting in fstab as Read-Only

For systems that should always mount a partition read-only:

```text
UUID=...  /mnt/archive  xfs  ro,norecovery,noatime  0 0
```

## Remounting a Currently Mounted File System as Read-Only

If a file system is already mounted read-write and you need to make it read-only:

```bash
sudo mount -o remount,ro /data
```

This fails if any process has files open for writing. Check with:

```bash
sudo lsof +D /data
```

Or use fuser:

```bash
sudo fuser -vm /data
```

## Read-Only Root File System for Recovery

When recovering a system, you may want to keep the root file system read-only. Boot with the kernel parameter:

```text
ro
```

Add it to the kernel command line in GRUB by pressing `e` at the boot menu and appending `ro` to the `linux` line.

## Forensic Best Practices on RHEL

1. **Always image first** - Work with copies, not originals
2. **Use hardware write blockers** when possible for physical media
3. **Set block devices read-only** with `blockdev --setro`
4. **Mount with ro,norecovery,noatime** options
5. **Document every step** including mount commands and timestamps
6. **Verify integrity** with checksums before and after analysis

Calculate a checksum of the source before mounting:

```bash
sha256sum /dev/sdb > /forensics/source_hash.txt
```

After your analysis, verify:

```bash
sha256sum /dev/sdb | diff - /forensics/source_hash.txt
```

## Troubleshooting

If you get "mount: wrong fs type" with norecovery:

- The file system may be too damaged for read-only mounting
- Try mounting without norecovery first to see the error
- Consider using file system-specific recovery tools

If a read-only remount fails:

```bash
# Find processes using the mount
fuser -vm /mnt/evidence
# Stop or kill those processes, then retry
sudo mount -o remount,ro /mnt/evidence
```

## Summary

Mounting file systems read-only is essential for forensic analysis and safe data recovery on RHEL. Use `ro,norecovery,noatime` mount options and set block devices read-only with `blockdev --setro` for maximum protection. Always work with disk images rather than original media when possible, and verify data integrity with checksums throughout the process.
