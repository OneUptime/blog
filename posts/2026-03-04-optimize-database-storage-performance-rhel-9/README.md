# How to Optimize Database Storage Performance on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Database, Storage, Performance, PostgreSQL, MySQL, Linux

Description: Learn how to optimize RHEL storage configuration for database workloads, including file system selection, I/O tuning, and kernel parameter optimization.

---

Database performance depends heavily on storage configuration. A database running on poorly tuned storage will be slow regardless of how much CPU and memory you provide. On RHEL, optimizing the storage stack for database workloads involves selecting the right file system, tuning I/O parameters, and configuring kernel settings for the random I/O patterns that databases generate.

## Choosing the Right File System

### XFS (Recommended for Most Databases)

XFS is the default on RHEL and works well for databases:

```bash
sudo mkfs.xfs -f -d agcount=64 -l size=512m,lazy-count=1 /dev/data_vg/db_lv
```

- `agcount=64` - Multiple allocation groups for parallel metadata operations
- `size=512m` - Larger log for write-heavy workloads
- `lazy-count=1` - Reduces contention on the superblock

### ext4 (Alternative)

ext4 is simpler and also performs well:

```bash
sudo mkfs.ext4 -E lazy_itable_init=0 -O dir_index,extent /dev/data_vg/db_lv
```

## Mount Options for Databases

```text
UUID=...  /var/lib/pgsql  xfs  defaults,noatime,nodiratime,logbufs=8,logbsize=256k  0 0
```

Key options:

- **noatime** - Eliminates access time updates (huge impact for databases)
- **nodiratime** - Same for directory access times
- **logbufs=8** - Increases XFS log buffers
- **logbsize=256k** - Increases XFS log buffer size

## Separating Database Components

Place different database components on separate storage:

```text
/dev/fast_vg/data_lv    /var/lib/pgsql/data    xfs  noatime  0 0
/dev/fast_vg/wal_lv     /var/lib/pgsql/wal     xfs  noatime  0 0
/dev/fast_vg/log_lv     /var/lib/pgsql/log     xfs  noatime  0 0
/dev/ssd_vg/temp_lv     /var/lib/pgsql/temp    xfs  noatime  0 0
```

The most critical separation is between data files and write-ahead logs (WAL/redo logs). WAL writes are sequential, while data file access is random. Putting them on separate devices prevents interference.

## I/O Scheduler Settings

For database workloads, use mq-deadline on HDDs and none on SSDs:

```bash
# SSDs and NVMe
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler

# HDDs
echo "mq-deadline" | sudo tee /sys/block/sda/queue/scheduler
```

## Kernel Parameters for Databases

```bash
sudo tee /etc/sysctl.d/90-database.conf << 'CONF'
# Reduce swappiness - databases manage their own caching
vm.swappiness = 10

# Dirty page settings for write-heavy workloads
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
vm.dirty_expire_centisecs = 500
vm.dirty_writeback_centisecs = 100

# Increase shared memory limits
kernel.shmmax = 68719476736
kernel.shmall = 4294967296

# File descriptor limits
fs.file-max = 2097152

# Optimize for many concurrent connections
net.core.somaxconn = 65535
CONF

sudo sysctl --system
```

## Queue Depth Tuning

For database random I/O patterns:

```bash
# Moderate queue depth for consistent latency
echo 32 | sudo tee /sys/block/sda/queue/nr_requests

# Small read-ahead (databases do random reads)
echo 128 | sudo tee /sys/block/sda/queue/read_ahead_kb
```

For NVMe:

```bash
echo 1023 | sudo tee /sys/block/nvme0n1/queue/nr_requests
echo 128 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

## Using tuned for Database Workloads

Apply the throughput-performance profile:

```bash
sudo tuned-adm profile throughput-performance
```

Or create a custom database profile as shown in the tuned article.

## Transparent Huge Pages

Many databases recommend disabling transparent huge pages:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Make persistent with a systemd service:

```bash
sudo tee /etc/systemd/system/disable-thp.service << 'SERVICE'
[Unit]
Description=Disable Transparent Huge Pages

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled && echo never > /sys/kernel/mm/transparent_hugepage/defrag'

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable --now disable-thp
```

## TRIM/Discard for SSDs

Enable periodic TRIM:

```bash
sudo systemctl enable --now fstrim.timer
```

## Monitoring Database Storage Performance

Watch for I/O bottlenecks:

```bash
# Device-level
iostat -x /dev/nvme0n1 1

# Process-level
sudo iotop -oP | grep -E "postgres|mysql"
```

Key metrics:

- **await** under 1ms for NVMe, under 5ms for SSD
- **%util** under 80%
- **iowait** under 10%

## PostgreSQL-Specific Settings

```text
# postgresql.conf
effective_io_concurrency = 200    # For SSDs (1 for HDDs)
random_page_cost = 1.1            # For SSDs (4.0 for HDDs)
wal_buffers = 64MB
checkpoint_completion_target = 0.9
```

## MySQL/MariaDB-Specific Settings

```text
# my.cnf
innodb_flush_method = O_DIRECT
innodb_io_capacity = 2000         # For SSDs
innodb_io_capacity_max = 4000
innodb_read_io_threads = 16
innodb_write_io_threads = 16
```

## Summary

Optimizing database storage performance on RHEL requires attention to file system choice and mount options, I/O scheduler selection, kernel parameter tuning, and proper separation of database components across storage devices. Use noatime, disable transparent huge pages, tune dirty page settings, and match I/O scheduler to your device type. Monitor with iostat and iotop to verify that your tuning is effective.
