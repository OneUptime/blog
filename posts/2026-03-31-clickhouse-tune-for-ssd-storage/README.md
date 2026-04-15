# How to Tune ClickHouse for SSD Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SSD, Storage, Performance, Tuning, I/O

Description: Tune ClickHouse configuration and Linux settings to get maximum performance from SSD-backed storage deployments.

---

SSDs provide dramatically lower latency and higher I/O throughput than spinning disks, but ClickHouse must be configured to take full advantage of them. This guide covers OS-level and ClickHouse-level tuning for SSD storage.

## Set the I/O Scheduler

SSDs have built-in queuing, so a simple scheduler works best. Use `mq-deadline` or `none`:

```bash
# Check current scheduler
cat /sys/block/sda/queue/scheduler

# Set for SATA SSD
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Persist via udev rule
echo 'ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"' \
  | sudo tee /etc/udev/rules.d/60-scheduler.rules
```

## Increase Queue Depth

SSDs handle deep I/O queues efficiently:

```bash
echo 64 | sudo tee /sys/block/sda/queue/nr_requests
echo 64 | sudo tee /sys/block/sda/queue/read_ahead_kb
```

## Disable SSD Write Cache Flush (with UPS)

If you have a UPS or battery-backed write cache, you can disable sync-on-write for higher write throughput:

```xml
<!-- config.xml -->
<fsync_metadata>false</fsync_metadata>
```

Keep `fsync_metadata` enabled unless you accept data loss risk on power failure.

## Configure ClickHouse Max Read Ahead

Allow ClickHouse to read larger blocks from SSD:

```xml
<max_read_buffer_size>1048576</max_read_buffer_size>
```

## Use SSD-Optimized Merge Settings

SSDs can handle more concurrent merges than HDDs:

```xml
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>3</background_merges_mutations_concurrency_ratio>
```

```sql
ALTER TABLE events MODIFY SETTING
    merge_max_block_size = 8192,
    min_merge_bytes_to_use_direct_io = 10737418240;
```

Setting `min_merge_bytes_to_use_direct_io` to 10 GB means ClickHouse uses direct I/O (bypassing page cache) only for very large merges, allowing the OS to cache smaller merges.

## Use `min_bytes_for_wide_part` to Control Part Format

SSD performance benefits from wide part format for active partitions:

```sql
ALTER TABLE events MODIFY SETTING
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 512;
```

## Monitor SSD I/O

Check disk I/O usage:

```bash
iostat -x 1 5
```

Check ClickHouse I/O metrics:

```sql
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric LIKE '%Read%' OR metric LIKE '%Write%'
ORDER BY metric;
```

## Configure TRIM/DISCARD

Enable periodic TRIM to maintain SSD performance over time:

```bash
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer
```

Or mount with `discard` option in `/etc/fstab`:

```text
UUID=xxx /data ext4 defaults,discard 0 2
```

## Summary

SSD tuning for ClickHouse involves setting the right I/O scheduler, increasing queue depth, allowing deeper merge concurrency, and configuring TRIM. These changes reduce write amplification and ensure ClickHouse can exploit the low-latency, high-IOPS capabilities of your SSD hardware.
