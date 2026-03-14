# How to Defragment an XFS File System Using xfs_fsr on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Defragmentation, Xfs_fsr, Storage, Linux

Description: Learn how to defragment XFS file systems on RHEL using xfs_fsr, including identifying fragmented files, running targeted defragmentation, and scheduling automatic maintenance.

---

While XFS is designed to minimize fragmentation through delayed allocation and extent-based allocation, files can still become fragmented over time, especially on filesystems that are heavily used or nearly full. The `xfs_fsr` (XFS filesystem reorganizer) tool defragments files online without requiring downtime. This guide covers how to use it on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem with fragmented files
- The `xfsprogs` package installed

## Understanding XFS Fragmentation

XFS stores file data in extents, which are contiguous blocks on disk. A perfectly defragmented file has a single extent. As files are modified, deleted, and new files are created, the allocator may need to split files across multiple non-contiguous extents.

Fragmentation matters most for:
- Sequential read/write workloads (databases, video files)
- HDD-based storage where seek time is significant
- Filesystems that are frequently near capacity

Fragmentation matters less for:
- SSD-based storage (no seek penalty)
- Random I/O workloads
- Lightly used filesystems with plenty of free space

## Step 1: Assess Fragmentation

Check fragmentation of individual files:

```bash
sudo filefrag /data/largefile
```

Output:

```bash
/data/largefile: 47 extents found
```

Check all files in a directory:

```bash
sudo filefrag /data/*
```

Find the most fragmented files:

```bash
find /data -type f -exec filefrag {} + 2>/dev/null | \
  awk -F: '{print $NF, $1}' | sort -rn | head -20
```

Check free space fragmentation:

```bash
sudo xfs_db -r -c 'freesp -s' /dev/vg_data/lv_data
```

## Step 2: Run xfs_fsr on the Entire Filesystem

Defragment all files on a filesystem:

```bash
sudo xfs_fsr /data
```

By default, `xfs_fsr` runs for two hours. You can specify a different time limit:

```bash
# Run for 30 minutes
sudo xfs_fsr -t 1800 /data
```

The tool works by:
1. Identifying fragmented files
2. Allocating new contiguous space
3. Copying the file data to the new location
4. Updating the inode to point to the new extents
5. Freeing the old fragmented extents

This happens online with no downtime.

## Step 3: Defragment a Specific File

Target a specific fragmented file:

```bash
sudo xfs_fsr -v /data/database/datafile.dbf
```

The `-v` flag provides verbose output showing the defragmentation progress.

## Step 4: Defragment with Verbose Output

See what `xfs_fsr` is doing:

```bash
sudo xfs_fsr -v /data 2>&1 | tee /var/log/xfs_fsr.log
```

The verbose output shows each file being processed and whether it was successfully defragmented.

## Step 5: Schedule Automatic Defragmentation

Create a systemd timer for regular defragmentation:

```bash
sudo tee /etc/systemd/system/xfs-defrag.service << EOF
[Unit]
Description=XFS Filesystem Defragmentation
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/xfs_fsr -t 3600 /data
Nice=19
IOSchedulingClass=idle
EOF

sudo tee /etc/systemd/system/xfs-defrag.timer << EOF
[Unit]
Description=Weekly XFS Defragmentation

[Timer]
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now xfs-defrag.timer
```

This runs defragmentation every Sunday at 2 AM for up to one hour, with low I/O priority.

Or use cron:

```bash
echo '0 2 * * 0 root /usr/sbin/xfs_fsr -t 3600 /data >> /var/log/xfs_fsr.log 2>&1' | \
  sudo tee /etc/cron.d/xfs-defrag
```

## Step 6: Monitor Defragmentation Progress

While `xfs_fsr` is running, monitor its progress:

```bash
# Check if it's running
ps aux | grep xfs_fsr

# Monitor I/O impact
iostat -x 1 /dev/sdb
```

## Step 7: Verify Results

After defragmentation, check the improvement:

```bash
# Check a previously fragmented file
sudo filefrag /data/largefile
```

The extent count should be lower than before.

## Advanced Options

### Resume from a Previous Run

`xfs_fsr` saves its progress in `/var/tmp/.fsrlast_xfs`. When run again, it can resume where it left off:

```bash
sudo xfs_fsr /data
# (interrupted)
sudo xfs_fsr /data
# Continues from where it stopped
```

### Set Priority of Files to Defragment

`xfs_fsr` processes files in inode order by default. To focus on specific directories, run `xfs_fsr` on individual files:

```bash
find /data/important -type f -exec filefrag {} + 2>/dev/null | \
  awk -F: '{gsub(/[^0-9]/, "", $NF); if ($NF > 5) print $1}' | \
  while read file; do
    sudo xfs_fsr -v "$file"
  done
```

This only defragments files with more than 5 extents in the `/data/important` directory.

## When Defragmentation Helps

- **Before**: A database data file has 200 extents, causing slow sequential scans.
- **After**: The same file has 1-3 extents, and sequential I/O performance improves significantly.

## When Defragmentation Does Not Help

- **SSD storage**: SSDs have no seek penalty, so fragmentation has minimal performance impact.
- **Random I/O workloads**: If your workload is primarily random access, defragmentation provides little benefit.
- **Filesystem nearly full**: `xfs_fsr` needs contiguous free space to defragment files. If the filesystem is more than 90% full, defragmentation may not be effective.

## Preventing Fragmentation

- **Keep filesystems below 80% capacity**: More free space allows the allocator to find contiguous regions.
- **Use appropriate allocsize mount option**: Larger preallocation reduces fragmentation for large files.
- **Avoid in-place file modifications**: Appending to files causes less fragmentation than random writes.
- **Use delayed allocation**: This is enabled by default in XFS and helps the allocator make better decisions.

## Conclusion

`xfs_fsr` is an effective tool for defragmenting XFS filesystems on RHEL, and it works online without any downtime. While XFS is designed to minimize fragmentation, long-running filesystems under heavy use benefit from periodic defragmentation. Schedule regular `xfs_fsr` runs during off-peak hours, monitor fragmentation levels, and keep filesystems from becoming too full to maintain optimal performance.
