# How to Tune XFS File System Performance with Mount Options on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Performance Tuning, Storage, Linux

Description: Learn how to optimize XFS file system performance on RHEL by configuring mount options, adjusting I/O parameters, and tuning for specific workloads.

---

XFS offers numerous tuning options that can significantly impact filesystem performance depending on your workload. From mount options to I/O scheduler settings, the right configuration can dramatically improve throughput and reduce latency. This guide covers the most effective XFS tuning parameters on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem to tune
- The `xfsprogs` package installed

## Understanding XFS Performance Factors

XFS performance is influenced by several layers:

1. **Mount options**: Control filesystem behavior at the VFS level
2. **Filesystem geometry**: Set during `mkfs.xfs` (block size, allocation groups)
3. **I/O scheduler**: Determines how the kernel orders disk requests
4. **Block device settings**: Queue depth, read-ahead, and more

## Mount Options for Performance

### noatime and relatime

By default, Linux usually mounts filesystems with `relatime`, which reduces access time (atime) updates compared with strict atime while preserving compatibility for most applications.

```bash
/dev/vg_data/lv_data /data xfs noatime 0 0
```

Options:
- `noatime`: Never update access times (best performance)
- `relatime`: Update access times only if the previous atime is older than the modification/change time or is more than 24 hours old (default, good compromise)
- `nodiratime`: Disable access time updates for directories only

For most workloads, `noatime` provides the best performance improvement.

### logbufs and logbsize

The XFS log buffer settings affect write performance:

```bash
/dev/vg_data/lv_data /data xfs defaults,noatime,logbufs=8,logbsize=256k 0 0
```

- `logbufs=8`: Number of in-memory log buffers (range: 2-8, default: varies by log size)
- `logbsize=256k`: Size of each log buffer (valid values: 16k, 32k, 64k, 128k, 256k)

Increasing these values improves write performance at the cost of using more memory. The maximum `logbsize` depends on the log stripe unit.

### allocsize

Controls the size of buffered I/O preallocation:

```bash
/dev/vg_data/lv_data /data xfs defaults,noatime,allocsize=64k 0 0
```

For workloads that write many large files, increasing `allocsize` reduces fragmentation:

```bash
allocsize=1m
```

For workloads with many small files, leaving the default dynamic behavior is usually better; use a smaller fixed value only after benchmarking:

```bash
allocsize=4k
```

### inode64

Allows inode allocation across the entire filesystem rather than restricting it to the first terabyte:

```bash
/dev/vg_data/lv_data /data xfs defaults,inode64 0 0
```

This is the default on 64-bit RHEL systems, but worth verifying on large filesystems.

### discard and nodiscard

For SSD and thin-provisioned storage:

```bash
/dev/vg_data/lv_data /data xfs defaults,discard 0 0
```

The `discard` option sends TRIM commands to the storage when blocks are freed. For better performance, consider using periodic `fstrim` instead of continuous discard:

```bash
sudo systemctl enable --now fstrim.timer
```

### Write Barriers

Write barriers ensure data integrity by flushing the disk cache at critical points. On RHEL 9, XFS no longer supports the `barrier` or `nobarrier` mount options; adding `nobarrier` can prevent the filesystem from mounting.

### largeio

Reports larger optimal I/O sizes for aligned filesystems:

```bash
/dev/vg_data/lv_data /data xfs defaults,largeio 0 0
```

This changes the optimal I/O size reported by `stat(2)` for filesystems created with a stripe width, or for filesystems mounted with `allocsize`. It does not by itself force larger physical I/O operations.

## Filesystem Creation Options

These settings are specified at `mkfs.xfs` time and cannot be changed afterward.

### Block Size

```bash
sudo mkfs.xfs -b size=4096 /dev/sdb1
```

The default 4096 bytes works well for most workloads. Although `mkfs.xfs` accepts block sizes up to 65536 bytes, XFS on Linux can only mount filesystems with block sizes no larger than the system page size, which is typically 4096 bytes on x86_64 RHEL systems.

### Allocation Group Count

```bash
sudo mkfs.xfs -d agcount=32 /dev/sdb1
```

More allocation groups improve parallelism for concurrent operations. The default is scaled automatically based on the underlying device size, but for large filesystems with many concurrent users, increasing this can help.

### Log Configuration

Place the log on a separate, fast device for write-intensive workloads:

```bash
sudo mkfs.xfs -l logdev=/dev/ssd_log,size=512m /dev/sdb1
```

Mount with the external log:

```bash
/dev/sdb1 /data xfs defaults,logdev=/dev/ssd_log 0 0
```

### Stripe Alignment

For RAID or LVM striped storage:

```bash
sudo mkfs.xfs -d su=64k,sw=4 /dev/vg_stripe/lv_data
```

This aligns the filesystem with the storage stripe geometry for optimal performance.

## I/O Scheduler Tuning

Check the current I/O scheduler:

```bash
cat /sys/block/sda/queue/scheduler
```

For high-performance SSDs or CPU-bound systems with fast storage, `none` is often best:

```bash
echo none | sudo tee /sys/block/sda/queue/scheduler
```

For HDDs, `mq-deadline` usually performs well:

```bash
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
```

Make persistent via udev rules:

```bash
sudo tee /etc/udev/rules.d/60-ioscheduler.rules << EOF
ACTION=="add|change", KERNEL=="sd*", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="sd*", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
EOF
```

## Read-Ahead Tuning

Increase read-ahead for sequential workloads:

```bash
sudo blockdev --setra 4096 /dev/sdb
```

Check current value:

```bash
sudo blockdev --getra /dev/sdb
```

The value is in 512-byte sectors, so 4096 equals 2 MB of read-ahead.

## Workload-Specific Configurations

### Database Workload

```bash
/dev/vg_data/lv_data /data xfs noatime,logbufs=8,logbsize=256k 0 0
```

Also consider using an external log device on fast storage.

### File Server / NAS

```bash
/dev/vg_data/lv_data /data xfs noatime,allocsize=64k 0 0
```

### Virtual Machine Storage

```bash
/dev/vg_data/lv_data /data xfs noatime,discard 0 0
```

### Backup Storage

```bash
/dev/vg_data/lv_data /data xfs noatime,largeio,allocsize=1m 0 0
```

## Benchmarking Changes

Always benchmark before and after tuning to verify improvements:

```bash
sudo dnf install fio -y

# Sequential write test

sudo fio --name=seq_write --directory=/data --rw=write --bs=1M \
  --size=2G --numjobs=1 --runtime=30 --time_based --group_reporting

# Random read test
sudo fio --name=rand_read --directory=/data --rw=randread --bs=4K \
  --size=1G --numjobs=4 --runtime=30 --time_based --group_reporting

# Mixed workload test
sudo fio --name=mixed --directory=/data --rw=randrw --rwmixread=70 --bs=4K \
  --size=1G --numjobs=4 --runtime=30 --time_based --group_reporting
```

## Conclusion

Tuning XFS performance on RHEL involves optimizing at multiple layers, from mount options and filesystem geometry to I/O schedulers and block device settings. The most impactful changes for most workloads are `noatime`, appropriate `logbufs`/`logbsize` values, and correct stripe alignment. Always benchmark your specific workload before and after changes to confirm that tuning produces the desired results.
