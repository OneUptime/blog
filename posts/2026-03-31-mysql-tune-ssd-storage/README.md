# How to Tune MySQL for SSD Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, SSD, Storage, InnoDB

Description: Tune MySQL InnoDB settings specifically for SSD and NVMe storage to maximize I/O throughput, reduce latency, and leverage the higher IOPS capacity of flash storage.

---

SSDs and NVMe drives fundamentally change MySQL I/O characteristics. Unlike spinning disks, they have no seek latency and can handle thousands of random I/O operations per second. MySQL's default settings were designed for HDDs and leave SSD performance underutilized.

## Key Differences Between SSD and HDD for MySQL

On spinning disks, sequential I/O is far faster than random I/O due to seek time. SSDs have roughly equal latency for both. This changes how you should tune:

- `innodb_io_capacity` can be set much higher on SSDs
- The `O_DIRECT` flush method is safe and beneficial on SSDs
- Random read-ahead settings can be adjusted differently
- Doublewrite buffer overhead is proportionally smaller

## InnoDB I/O Capacity Settings for SSD

```text
[mysqld]
# NVMe SSD: 10,000-50,000+ IOPS
innodb_io_capacity = 4000
innodb_io_capacity_max = 8000

# For SATA SSD (typically 10,000-80,000+ random IOPS):
# innodb_io_capacity = 1000
# innodb_io_capacity_max = 3000
```

Check actual I/O stats to verify tuning impact:

```sql
SELECT
  variable_name,
  variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_data_read',
  'Innodb_data_written',
  'Innodb_data_reads',
  'Innodb_data_writes',
  'Innodb_data_fsyncs'
);
```

## Flush Method Configuration

`O_DIRECT` bypasses the OS page cache for InnoDB data files, which is generally best for SSD as it avoids double buffering (RAM used in both MySQL's buffer pool and the OS cache):

```text
[mysqld]
innodb_flush_method = O_DIRECT
```

On Linux, you can also use `O_DIRECT_NO_FSYNC` if your filesystem and hardware guarantee write ordering:

```text
innodb_flush_method = O_DIRECT_NO_FSYNC
```

## Disable Read-Ahead for Random Workloads

SSDs have near-zero random I/O latency, so aggressive read-ahead may actually hurt performance for random access patterns by loading pages that won't be used:

```text
[mysqld]
# For predominantly random I/O workloads on SSD
innodb_read_ahead_threshold = 0
innodb_random_read_ahead = OFF
```

For sequential workloads (table scans, backups), keep the defaults:

```text
innodb_read_ahead_threshold = 56
```

## Filesystem and Mount Options for SSD

Use XFS or ext4 with the `noatime` mount option to reduce unnecessary write amplification:

```bash
# /etc/fstab
/dev/nvme0n1p1  /var/lib/mysql  xfs  defaults,noatime,nodiratime  0  2
```

For NVMe drives, check and configure the I/O scheduler:

```bash
# Check current scheduler
cat /sys/block/nvme0n1/queue/scheduler

# Set to none/mq-deadline for NVMe (not cfq or deadline which are for HDDs)
echo mq-deadline | sudo tee /sys/block/nvme0n1/queue/scheduler

# Make permanent in /etc/udev/rules.d/60-scheduler.rules
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="mq-deadline"' | \
  sudo tee /etc/udev/rules.d/60-scheduler.rules
```

## Doublewrite Buffer on SSD

With fast SSD storage, you can safely enable the doublewrite buffer (it protects against partial page writes) without significant overhead:

```text
[mysqld]
innodb_doublewrite = ON

# Dedicate a separate doublewrite tablespace for SSD
innodb_doublewrite_files = 4
innodb_doublewrite_pages = 64
```

## Verifying SSD Performance Improvement

Run a quick I/O benchmark before and after tuning:

```bash
# Test sequential write speed
fio --name=seq-write --ioengine=sync --rw=write --bs=16k \
  --size=1G --directory=/var/lib/mysql --output-format=terse

# Test random read IOPS
fio --name=rand-read --ioengine=libaio --rw=randread --bs=16k \
  --iodepth=32 --size=1G --directory=/var/lib/mysql
```

## Summary

Tuning MySQL for SSD storage primarily means increasing `innodb_io_capacity` and `innodb_io_capacity_max` to match the device's true IOPS capacity, using `O_DIRECT` to eliminate OS page cache double buffering, and setting the I/O scheduler to `mq-deadline` or `none` on NVMe devices. Disable random read-ahead for random-access workloads since SSDs do not benefit from sequential prefetching the way HDDs do. These changes allow MySQL to fully leverage the low latency and high parallelism of flash storage.
