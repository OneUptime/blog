# How to Monitor XFS File System Health and Fragmentation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Monitoring, Fragmentation, Storage, Linux

Description: Learn how to monitor XFS file system health, detect fragmentation, and track filesystem metrics on RHEL using built-in XFS tools and system utilities.

---

Proactive monitoring of XFS filesystem health helps prevent unexpected storage failures and performance degradation. This guide covers the tools and techniques for monitoring XFS filesystems on RHEL, including health checks, fragmentation analysis, and usage tracking.

## Prerequisites

- A RHEL system with root or sudo access
- XFS filesystems to monitor
- The `xfsprogs` package installed

## Step 1: Check Basic Filesystem Information

Get an overview of the filesystem configuration:

```bash
xfs_info /data
```

This shows block size, allocation group count, log configuration, and enabled features.

Check space usage:

```bash
df -Th /data
```

Check inode usage:

```bash
df -i /data
```

## Step 2: Monitor Filesystem Health with xfs_db

The `xfs_db` tool provides low-level filesystem inspection. Run it on an unmounted filesystem or use the read-only mode:

```bash
sudo xfs_db -r /dev/vg_data/lv_data
```

Inside `xfs_db`:

```bash
xfs_db> freesp -s
```

This shows the free space distribution, which indicates fragmentation.

For a quick summary:

```bash
sudo xfs_db -r -c 'freesp -s' /dev/vg_data/lv_data
```

## Step 3: Measure File Fragmentation

Use `filefrag` to check fragmentation of individual files:

```bash
sudo filefrag /data/important_file
```

Output example:

```bash
/data/important_file: 3 extents found
```

A file with many extents is fragmented. Check multiple files:

```bash
sudo filefrag /data/*
```

For a directory tree:

```bash
find /data -type f -exec filefrag {} + 2>/dev/null | sort -t: -k2 -rn | head -20
```

This shows the most fragmented files.

## Step 4: Check Free Space Fragmentation

Use `xfs_db` to analyze free space fragmentation:

```bash
sudo xfs_db -r -c 'freesp -s' /dev/vg_data/lv_data
```

The output shows:

```bash
   from      to extents  blocks    pct
      1       1      15      15   0.01%
      2       3      10      25   0.02%
      4       7       8      45   0.03%
      8      15       5      55   0.04%
...
 262144  524287       2  450000  35.00%
 524288 1048575       1  800000  64.90%
```

A healthy filesystem has large contiguous free space regions. Many small free extents indicate fragmentation.

## Step 5: Monitor XFS Statistics

XFS maintains runtime statistics in `/proc/fs/xfs/stat`:

```bash
cat /proc/fs/xfs/stat
```

Key metrics include:

- **xs_write_calls**: Number of write system calls
- **xs_read_calls**: Number of read system calls
- **xs_log_writes**: Number of log writes
- **xs_allocx**: Number of extent allocations
- **xs_freex**: Number of extent frees

Monitor these over time to detect changes in workload patterns:

```bash
# Capture stats every 5 seconds
while true; do
    echo "--- $(date) ---"
    cat /proc/fs/xfs/stat
    sleep 5
done
```

## Step 6: Use xfs_spaceman for Space Management

The `xfs_spaceman` tool provides space management and reporting:

```bash
sudo xfs_spaceman -c 'freesp' /data
```

Check for filesystem health issues:

```bash
sudo xfs_spaceman -c 'health' /data
```

This reports on the health status of various filesystem metadata structures.

## Step 7: Monitor with System Tools

### Using iostat

Monitor I/O performance of the underlying device:

```bash
sudo dnf install sysstat -y
iostat -x 1 /dev/sdb
```

Watch for:
- High `await` values (slow disk response)
- High `%util` (disk saturation)
- Low throughput relative to expected performance

### Using iotop

Find processes doing the most I/O:

```bash
sudo dnf install iotop -y
sudo iotop
```

### Using dmesg

Check for XFS-related kernel messages:

```bash
sudo dmesg | grep -i xfs
```

Look for error messages like:
- `XFS: Internal error` - filesystem corruption detected
- `XFS: Corruption detected` - metadata inconsistency
- `XFS: Filesystem has been shut down` - critical error causing filesystem shutdown

## Step 8: Set Up Automated Monitoring

Create a monitoring script:

```bash
sudo tee /usr/local/bin/xfs-monitor.sh << 'SCRIPT'
#!/bin/bash

FILESYSTEM="/data"
DEVICE="/dev/mapper/vg_data-lv_data"
THRESHOLD=85
INODE_THRESHOLD=80

# Check space usage
USAGE=$(df --output=pcent "$FILESYSTEM" | tail -1 | tr -d ' %')
if [ "$USAGE" -ge "$THRESHOLD" ]; then
    echo "WARNING: $FILESYSTEM is ${USAGE}% full" | \
      logger -t xfs-monitor -p user.warning
fi

# Check inode usage
INODE_USAGE=$(df --output=ipcent "$FILESYSTEM" | tail -1 | tr -d ' %')
if [ "$INODE_USAGE" -ge "$INODE_THRESHOLD" ]; then
    echo "WARNING: $FILESYSTEM inodes are ${INODE_USAGE}% used" | \
      logger -t xfs-monitor -p user.warning
fi

# Check for XFS errors in dmesg
if dmesg | tail -100 | grep -qi "xfs.*error\|xfs.*corrupt\|xfs.*shutdown"; then
    echo "CRITICAL: XFS errors detected in kernel log" | \
      logger -t xfs-monitor -p user.crit
fi
SCRIPT
sudo chmod +x /usr/local/bin/xfs-monitor.sh
```

Schedule it:

```bash
echo '*/15 * * * * root /usr/local/bin/xfs-monitor.sh' | sudo tee /etc/cron.d/xfs-monitor
```

## Step 9: Monitor XFS Quota Usage

If quotas are enabled:

```bash
sudo xfs_quota -x -c 'report -u -h' /data
sudo xfs_quota -x -c 'report -g -h' /data
sudo xfs_quota -x -c 'report -p -h' /data
```

## Key Health Indicators

| Indicator | Healthy | Warning | Critical |
|-----------|---------|---------|----------|
| Space usage | Below 80% | 80-90% | Above 90% |
| Inode usage | Below 70% | 70-85% | Above 85% |
| Free space fragments | Few large | Many medium | Many small |
| File fragmentation | 1-5 extents | 5-20 extents | 20+ extents |
| I/O latency | Below 10ms | 10-50ms | Above 50ms |

## Conclusion

Monitoring XFS filesystem health on RHEL involves tracking space usage, inode utilization, fragmentation levels, I/O performance, and kernel error messages. By combining XFS-specific tools like `xfs_db`, `filefrag`, and `xfs_spaceman` with system monitoring tools like `iostat` and automated scripts, you can detect and address filesystem issues before they impact your applications. Regular monitoring is the foundation of reliable storage management.
