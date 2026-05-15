# How to Choose Between XFS, ext4, and Btrfs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Ext4, Btrfs, Comparison, Linux

Description: A practical comparison of XFS, ext4, and Btrfs on RHEL to help you pick the right filesystem for your workload.

---

RHEL gives you two supported local filesystem options: XFS (the default) and ext4 (the veteran). Btrfs is worth discussing because it often comes up in Linux filesystem comparisons, but it is not available or supported on RHEL 9. After years of running XFS and ext4 on RHEL, and Btrfs on other Linux distributions, here is my take on when to use each one.

## Quick Comparison

| Feature | XFS | ext4 | Btrfs |
|---------|-----|------|-------|
| RHEL default | Yes | No | No |
| Max filesystem size | 1 PB | 50 TB | Not supported on RHEL 9 |
| Max file size | 8 EB | 16 TB | Not supported on RHEL 9 |
| Online grow | Yes | Yes | Not supported on RHEL 9 |
| Online shrink | No | No | Not supported on RHEL 9 |
| Snapshots | No (use LVM or Stratis) | No (use LVM) | Not supported on RHEL 9 |
| Checksums | Metadata only | Metadata only (no data checksums) | Not supported on RHEL 9 |
| RHEL support status | Full | Full | Removed / unsupported |
| Defragmentation | xfs_fsr | e4defrag | Not supported on RHEL 9 |

## XFS - The Default Choice

XFS is the default filesystem on RHEL for good reasons. It handles large files and high-throughput workloads extremely well.

### When to Use XFS

- Large filesystems (multi-terabyte)
- High-throughput sequential I/O (video, backups, large datasets)
- Systems with many concurrent I/O operations
- When you want the best-tested and best-supported option on RHEL

### XFS Strengths

```bash
# Create an XFS filesystem

mkfs.xfs /dev/vg_data/lv_data

# Grow XFS online (no unmount needed)
xfs_growfs /data
```

- Excellent parallel I/O performance (allocation groups work independently)
- Delayed allocation reduces fragmentation
- Online defragmentation with `xfs_fsr`
- Built-in quota support that is fast and efficient
- Handles large files and large filesystems gracefully

### XFS Limitations

- Cannot be shrunk (ever, not even offline)
- Slightly higher CPU overhead for metadata operations compared to ext4
- Less mature tooling for data recovery compared to ext4

## ext4 - The Reliable Veteran

ext4 has been the default Linux filesystem for over a decade across many distributions. It is battle-tested and well-understood.

### When to Use ext4

- Small to medium filesystems (under 16 TB)
- Workloads with many small files (mail servers, news servers)
- When you need the ability to shrink the filesystem
- Environments migrated from RHEL 7/8 where ext4 was already in use
- When recovery tools matter (ext4 recovery is very mature)

### ext4 Strengths

```bash
# Create an ext4 filesystem
mkfs.ext4 /dev/vg_data/lv_data

# Grow ext4 online
resize2fs /dev/vg_data/lv_data

# Shrink ext4 offline (requires unmount)
umount /data
e2fsck -f /dev/vg_data/lv_data
resize2fs /dev/vg_data/lv_data 50G
```

- Can be shrunk (unlike XFS)
- Lower memory usage for metadata operations
- Mature recovery tools (`e2fsck`, `debugfs`, `testdisk`)
- Faster metadata operations for small file workloads
- Very predictable performance characteristics

### ext4 Limitations

- No data checksums (silent corruption can go undetected)
- Maximum file size of 16 TB
- No built-in snapshots
- Fragmentation can be an issue with certain workloads

## Btrfs - Not Available on RHEL 9

Btrfs brings modern features like built-in snapshots, checksums, and compression. On RHEL 9, it is not a technology preview. Red Hat removed Btrfs in RHEL 8, including the `btrfs.ko` kernel module and `btrfs-progs`, so stock RHEL 9 systems cannot create, mount, or install on Btrfs filesystems.

### When to Consider Btrfs

- Non-RHEL systems where the distribution supports Btrfs
- Development and testing environments outside stock RHEL
- Systems where snapshots without LVM are valuable
- Workloads that benefit from transparent compression
- When data integrity (checksums) is critical and you accept your distribution's Btrfs support status

### Btrfs Strengths

```bash
# These commands are common on distributions that support Btrfs,
# but they are not available on stock RHEL 9.

# Create a Btrfs filesystem
mkfs.btrfs /dev/vg_data/lv_data

# Create a snapshot
btrfs subvolume snapshot /data /data/.snapshots/snap1

# Enable transparent compression
mount -o compress=zstd /dev/vg_data/lv_data /data
```

- Built-in snapshots (no LVM needed)
- Data and metadata checksums detect corruption
- Transparent compression (zstd, lzo, zlib)
- Online shrink and grow
- Send/receive for incremental backups

### Btrfs Limitations on RHEL

- Removed and unsupported on RHEL 8 and later
- RAID 5/6 support is still considered unstable
- Performance can be unpredictable under heavy random write loads
- More complex to manage and troubleshoot
- Quota groups (qgroups) can cause performance issues

## Decision Framework

```mermaid
graph TD
    A[Choose a Filesystem] --> B{Production system?}
    B -->|Yes| C{Need to shrink filesystem?}
    B -->|No, dev/test| D{Need snapshots?}
    C -->|Yes| E[ext4]
    C -->|No| F{Large files or high throughput?}
    F -->|Yes| G[XFS]
    F -->|No, many small files| E
    D -->|Yes| H[Use LVM/Stratis on RHEL, or Btrfs on another supported distribution]
    D -->|No| G
```

## Performance Comparison

Based on typical benchmarks on RHEL:

### Sequential Read/Write (Large Files)

XFS leads for large sequential operations because its allocation group architecture allows parallel I/O:

```bash
# Quick sequential write test with dd
dd if=/dev/zero of=/data/testfile bs=1M count=1024 oflag=direct
```

### Random I/O (Small Files)

ext4 often edges out XFS for random I/O with small files due to lower metadata overhead.

### Metadata Operations (File Creation/Deletion)

ext4 is faster for creating and deleting many small files. XFS has improved significantly but still lags for very metadata-heavy workloads.

## Migration Considerations

### Moving from ext4 to XFS

There is no in-place conversion. You need to:
1. Back up data
2. Reformat as XFS
3. Restore data

### Moving from XFS to ext4

Same process - backup, reformat, restore. There is no conversion tool.

## My Recommendations

For most RHEL deployments, stick with **XFS**. It is the default, best tested, and handles the widest range of workloads well.

Use **ext4** when you have a specific reason: you need filesystem shrink capability, you have a workload with millions of tiny files, or you are running older software that was tested against ext4.

Use **Btrfs** only outside stock RHEL 9, or when you have a specific need for its features on a distribution that supports it.

## Summary

XFS is the right choice for most RHEL systems - it is the default, well-supported, and performs great for general and large-file workloads. ext4 is better for small-file workloads and when you need shrink capability. Btrfs brings powerful features like snapshots and checksums on distributions that support it, but it is removed and unsupported on RHEL 9. Pick based on your workload, not hype.
