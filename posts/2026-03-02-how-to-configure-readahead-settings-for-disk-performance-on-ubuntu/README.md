# How to Configure Readahead Settings for Disk Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Readahead, Performance Tuning, Disk I/O

Description: Configure block device readahead settings on Ubuntu to optimize disk performance for sequential and random workloads, with practical guidance on choosing the right readahead value.

---

Readahead is the kernel's mechanism for predicting that a sequential access pattern will continue and prefetching the next blocks before they're requested. When an application reads a file sequentially, the kernel sees this pattern and speculatively reads ahead by a configured number of kilobytes. If the prediction is correct, the data is already in the page cache when needed, eliminating a disk seek. If wrong, you've wasted memory bandwidth and cache space on data that won't be used.

Getting readahead right depends on your workload: sequential workloads (video streaming, log file analysis, backups) benefit from aggressive readahead; random workloads (databases, key-value stores) are hurt by it because the prefetched data is almost never used.

## Understanding Readahead Units

The `blockdev --getra` command reports readahead in 512-byte sectors, but the `--setra` command sets it in sectors as well. The `ra` value shown by `blockdev` multiplied by 512 gives you bytes.

```bash
# View current readahead for all block devices (value is in 512-byte sectors)
sudo blockdev --getra /dev/sda
# Example: 256 = 256 * 512 = 131072 bytes = 128KB

# Convert to KB for readability
RA=$(sudo blockdev --getra /dev/sda)
echo "Readahead: $((RA * 512 / 1024)) KB"

# Check all devices
for dev in /dev/sd* /dev/nvme*n*; do
    [ -b "$dev" ] || continue
    ra=$(sudo blockdev --getra "$dev" 2>/dev/null)
    echo "$dev: $((ra * 512 / 1024)) KB"
done
```

## Changing Readahead Settings

The `blockdev` command changes readahead for a specific block device:

```bash
# Set readahead to 4MB (value is in 512-byte sectors: 4MB / 512 = 8192)
sudo blockdev --setra 8192 /dev/sda

# Set readahead to 128KB (commonly good for mixed workloads)
sudo blockdev --setra 256 /dev/sda

# Disable readahead for random I/O workloads (databases)
sudo blockdev --setra 0 /dev/sda

# Verify the change
sudo blockdev --getra /dev/sda
```

## Readahead Recommendations by Workload

### Random I/O Workloads (Databases, Key-Value Stores)

```bash
# Disable readahead - random I/O doesn't benefit from it
# PostgreSQL, MySQL, MongoDB, Redis, Cassandra all benefit from disabled readahead

sudo blockdev --setra 0 /dev/nvme0n1    # NVMe database disk
sudo blockdev --setra 0 /dev/sdb        # SSD database disk

# Verify
sudo blockdev --getra /dev/nvme0n1
```

With readahead enabled on a database disk, every 4K random read causes the kernel to read ahead another 128KB or more that will never be accessed. This wastes I/O bandwidth and pushes useful pages out of the page cache.

### Sequential Workloads (Log Processing, ETL, Backups)

```bash
# Large readahead for sequential access patterns
# 2MB - 8MB is typical for streaming workloads

sudo blockdev --setra 4096 /dev/sdb    # 2MB readahead
sudo blockdev --setra 8192 /dev/sdb    # 4MB readahead
sudo blockdev --setra 16384 /dev/sdb   # 8MB readahead

# For NVMe doing large sequential scans
sudo blockdev --setra 8192 /dev/nvme0n1
```

### Mixed Workloads (General Purpose, Web Server Files)

```bash
# Default 128KB is often reasonable
# For slightly better sequential performance: 512KB
sudo blockdev --setra 1024 /dev/sda    # 512KB
sudo blockdev --setra 256 /dev/sda     # 128KB (default)
```

## Making Readahead Settings Persistent

`blockdev --setra` changes are lost on reboot. Make them persistent with udev rules:

```bash
cat << 'EOF' | sudo tee /etc/udev/rules.d/62-readahead.rules
# Readahead configuration by device type and workload

# NVMe devices used as database storage - disable readahead
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", RUN+="/sbin/blockdev --setra 0 /dev/%k"

# SATA/SAS SSDs - moderate readahead for general use
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", RUN+="/sbin/blockdev --setra 256 /dev/%k"

# HDDs - larger readahead for sequential workloads
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", RUN+="/sbin/blockdev --setra 4096 /dev/%k"
EOF

# Apply immediately
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Targeting Specific Mount Points

If you have different disks for different purposes on the same system, target them specifically:

```bash
#!/bin/bash
# /usr/local/bin/set-readahead.sh
# Set readahead based on the role of each disk

# Database volume - disable readahead
if mountpoint -q /var/lib/postgresql; then
    DB_DEV=$(findmnt -n -o SOURCE /var/lib/postgresql | xargs -I {} lsblk -no PKNAME {} | head -1)
    [ -n "$DB_DEV" ] && blockdev --setra 0 "/dev/$DB_DEV"
fi

# Log/backup volume - high readahead
if mountpoint -q /data/backups; then
    BACKUP_DEV=$(findmnt -n -o SOURCE /data/backups | xargs -I {} lsblk -no PKNAME {} | head -1)
    [ -n "$BACKUP_DEV" ] && blockdev --setra 8192 "/dev/$BACKUP_DEV"
fi

# Run at boot
```

## Filesystem-Level Readahead

The block device readahead is separate from the filesystem's own readahead. You can also tune the filesystem's readahead:

```bash
# Set readahead for a mounted filesystem using fsconfig (modern approach)
# For ext4 or XFS, mount with specific readahead options

# For ext4, the max_batch_time and min_batch_time affect readahead behavior
# For XFS, the largeio and swalloc mount options affect readahead

# Manual filesystem readahead via posix_fadvise is for specific files - not a kernel setting
# Applications can call: posix_fadvise(fd, offset, length, POSIX_FADV_SEQUENTIAL)
# This tells the kernel to read ahead for that file descriptor
```

## Application-Level Readahead Control

Some applications manage their own I/O and you can advise the kernel:

```bash
# For a specific file, enable sequential readahead
# Use the 'fadvise' tool if available, or write a small C program
cat << 'C' > /tmp/fadvise-test.c
#include <fcntl.h>
#include <stdio.h>

int main(int argc, char *argv[]) {
    if (argc < 2) return 1;
    int fd = open(argv[1], O_RDONLY);
    if (fd < 0) return 1;
    // Advise kernel this file will be read sequentially
    posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL);
    close(fd);
    printf("Set FADV_SEQUENTIAL on %s\n", argv[1]);
    return 0;
}
C
gcc -o /tmp/fadvise-test /tmp/fadvise-test.c
/tmp/fadvise-test /path/to/large-file
```

## Benchmarking Readahead Impact

Measure the difference with fio:

```bash
sudo apt install fio -y

# Test sequential read performance with different readahead values
for ra in 0 128 256 1024 4096 8192; do
    sudo blockdev --setra $ra /dev/sdb
    echo -n "Readahead $((ra * 512 / 1024))KB: "

    RESULT=$(sudo fio --name=seq-test \
        --filename=/dev/sdb \
        --rw=read \
        --bs=128k \
        --direct=1 \
        --numjobs=1 \
        --iodepth=4 \
        --size=2G \
        --time_based \
        --runtime=20 \
        --group_reporting \
        --output-format=terse 2>/dev/null)

    echo "$RESULT" | awk -F';' '{printf "%.0f MB/s\n", $6/1024}'
done

# Test random read performance with different readahead values
for ra in 0 256 1024; do
    sudo blockdev --setra $ra /dev/sdb
    echo -n "Random read with readahead $((ra * 512 / 1024))KB: "

    RESULT=$(sudo fio --name=rand-test \
        --filename=/dev/sdb \
        --rw=randread \
        --bs=4k \
        --direct=1 \
        --numjobs=4 \
        --iodepth=32 \
        --size=4G \
        --time_based \
        --runtime=20 \
        --group_reporting \
        --output-format=terse 2>/dev/null)

    echo "$RESULT" | awk -F';' '{printf "%.0f IOPS\n", $8}'
done
```

Typical results you'll see:
- Sequential read: higher readahead improves throughput up to a point
- Random read: readahead = 0 gives best IOPS; higher readahead reduces IOPS due to wasted bandwidth

## Monitoring Readahead Effectiveness

```bash
# Check page cache hit rates (readahead success shows as cache hits)
sudo apt install linux-tools-$(uname -r) -y

# Using vmstat - look at 'bi' (blocks in from disk)
vmstat 1 10

# Using iostat - watch 'r/s' vs actual application reads
iostat -xz 1

# Check for readahead-related kernel statistics
cat /sys/block/sda/queue/read_ahead_kb  # Shows readahead in KB (alternative view)

# Monitor cache utilization
free -h
cat /proc/meminfo | grep -E "Cached|Buffers|Active|Inactive"
```

High values in `Inactive(file)` in `/proc/meminfo` can indicate that readahead is reading data into cache that isn't being accessed - a sign that readahead is too aggressive for your workload.

Getting readahead right is a worthwhile optimization. For database servers, disabling readahead can measurably improve IOPS. For sequential processing jobs, tuning it upward can significantly increase throughput. Always benchmark before and after changes on your actual workload.
