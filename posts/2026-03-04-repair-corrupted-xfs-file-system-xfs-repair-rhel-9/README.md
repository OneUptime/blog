# How to Repair a Corrupted XFS File System with xfs_repair on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Xfs_repair, Filesystem Recovery, Storage, Linux

Description: Learn how to diagnose and repair corrupted XFS file systems on RHEL using xfs_repair, including handling log corruption, lost+found recovery, and dealing with severe damage.

---

XFS is designed to be resilient, but filesystem corruption can still occur due to hardware failures, power outages, or software bugs. The `xfs_repair` utility is the primary tool for checking and repairing XFS filesystems on RHEL. This guide covers how to use it effectively for different corruption scenarios.

## Prerequisites

- A RHEL system with root or sudo access
- A corrupted or potentially corrupted XFS filesystem
- The `xfsprogs` package installed
- The filesystem must be unmounted before repair

## Understanding XFS Recovery

XFS uses a write-ahead journal (log) to maintain consistency. After a crash, the log is replayed automatically during mount, which handles most inconsistencies. `xfs_repair` is needed when:

- The journal replay itself fails
- Hardware errors caused data corruption
- The filesystem will not mount at all
- You suspect silent corruption

## Step 1: Unmount the Filesystem

`xfs_repair` requires the filesystem to be unmounted:

```bash
sudo umount /data
```

If the filesystem is busy:

```bash
sudo fuser -mv /data
sudo umount -l /data
```

For the root filesystem, boot from rescue media.

## Step 2: Run xfs_repair in Check Mode

First, do a dry run to see what would be repaired without making changes:

```bash
sudo xfs_repair -n /dev/sdb1
```

The `-n` flag runs in no-modify mode. Review the output for error messages.

## Step 3: Run xfs_repair

If the check mode found issues, run the actual repair:

```bash
sudo xfs_repair /dev/sdb1
```

The tool runs through several phases:

1. **Phase 1**: Find and verify the superblock
2. **Phase 2**: Scan internal log and clear it
3. **Phase 3**: Scan inode allocation data
4. **Phase 4**: Check inode data and verify directory structures
5. **Phase 5**: Rebuild allocation group headers
6. **Phase 6**: Rebuild free space maps
7. **Phase 7**: Final cleanup

## Step 4: Handle Log Corruption

If `xfs_repair` reports a dirty log that it cannot replay:

```bash
ERROR: The filesystem has valuable metadata changes in a log which needs to
be replayed. Mount the filesystem to replay the log, and unmount it before
re-running xfs_repair.
```

Try mounting and unmounting to replay the log:

```bash
sudo mount /dev/sdb1 /data
sudo umount /data
sudo xfs_repair /dev/sdb1
```

If mounting fails, force log zeroing as a last resort:

```bash
sudo xfs_repair -L /dev/sdb1
```

**Warning**: The `-L` flag discards the log contents, which may result in additional data loss. Only use this when no other option works.

## Step 5: Handle Severe Corruption

For severely damaged filesystems, use verbose mode to get detailed information:

```bash
sudo xfs_repair -v /dev/sdb1
```

If the primary superblock is corrupted, `xfs_repair` automatically tries alternate superblocks. You can also specify one manually:

```bash
sudo xfs_repair -o ag_stride=4 /dev/sdb1
```

## Step 6: Recover Files from lost+found

After repair, some files may have been disconnected from their directories and placed in the `lost+found` directory:

```bash
sudo mount /dev/sdb1 /data
ls -la /data/lost+found/
```

Files in `lost+found` are named by their inode number. You can identify them using the `file` command:

```bash
file /data/lost+found/*
```

To find specific recovered files:

```bash
find /data/lost+found -type f -exec file {} \;
```

## Step 7: Verify the Repair

After repair and remounting, verify the filesystem:

```bash
sudo mount /dev/sdb1 /data
xfs_info /data
df -Th /data
```

Run a filesystem check to confirm:

```bash
sudo umount /data
sudo xfs_repair -n /dev/sdb1
```

This should report no errors.

## Repairing the Root XFS Filesystem

To repair the root filesystem, boot from RHEL installation media in rescue mode:

1. Boot from the ISO
2. Choose "Troubleshooting" then "Rescue a Red Hat Enterprise Linux system"
3. Choose "Skip" to avoid mounting the system
4. Run the repair:

```bash
xfs_repair /dev/mapper/rhel-root
```

5. Reboot:

```bash
reboot
```

## Common xfs_repair Messages

### "would have cleared inode"

In check mode (`-n`), this indicates inodes that would be cleared during actual repair. These may be files with corrupted metadata.

### "entry references free inode"

A directory entry points to an inode that has been freed. The entry will be removed during repair.

### "bad nblocks for inode"

The block count stored in an inode does not match the actual allocated blocks. This is corrected automatically.

### "rebuilding free space trees"

The free space tracking structures are being rebuilt from scratch. This is normal during repair.

## Preventing XFS Corruption

- **Use UPS or battery-backed storage**: Power loss is the most common cause of filesystem corruption.
- **Enable write barriers**: The default mount options include write barriers. Do not disable them unless your storage has battery-backed cache.
- **Monitor disk health**: Use `smartctl` to detect failing disks before they corrupt data.
- **Keep backups**: No filesystem repair tool can guarantee 100% data recovery.

```bash
sudo dnf install smartmontools -y
sudo smartctl -t short /dev/sdb
sudo smartctl -a /dev/sdb
```

## Conclusion

`xfs_repair` is a powerful and reliable tool for fixing corrupted XFS filesystems on RHEL. By understanding its phases and options, you can handle everything from minor inconsistencies to severe corruption. Always attempt a normal log replay (mount/umount) before resorting to log zeroing, and remember that the best protection against corruption is prevention through reliable hardware, write barriers, and regular backups.
