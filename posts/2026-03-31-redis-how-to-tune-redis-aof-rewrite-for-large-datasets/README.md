# How to Tune Redis AOF Rewrite for Large Datasets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Performance Tuning, Persistence, Large Scale

Description: Learn how to tune Redis AOF rewrite settings for large datasets to reduce I/O impact, manage memory usage, and maintain stable performance.

---

## Why AOF Rewrite Needs Tuning for Large Datasets

As your Redis dataset grows, AOF rewrites become heavier operations. The background rewrite process forks a child, writes the full dataset to a temp file, and then atomically swaps it in. For large datasets (tens of GBs), this can cause:

- High disk I/O spikes
- Large copy-on-write (COW) memory usage
- Latency spikes if not managed carefully
- Rewrite storms if the threshold is set too aggressively

Proper tuning ensures rewrites happen at the right time and with acceptable system impact.

## Key Configuration Parameters

### auto-aof-rewrite-percentage and auto-aof-rewrite-min-size

These two settings control when automatic rewrites trigger:

```text
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

Redis triggers a rewrite when:
1. The AOF file is at least `auto-aof-rewrite-min-size` bytes
2. The AOF has grown by at least `auto-aof-rewrite-percentage` percent since the last rewrite

For large datasets, increase the minimum size to avoid frequent rewrites:

```text
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 512mb
```

Or for very large deployments:

```text
auto-aof-rewrite-percentage 150
auto-aof-rewrite-min-size 2gb
```

### no-appendfsync-on-rewrite

During an AOF rewrite, the OS can block on fsync calls when the disk is busy. Setting `no-appendfsync-on-rewrite` to `yes` prevents fsync during the rewrite to avoid latency spikes, at the cost of reduced durability during the rewrite window:

```text
no-appendfsync-on-rewrite yes
```

For latency-sensitive applications with large datasets, this is often the right trade-off.

### aof-rewrite-incremental-fsync

This setting causes the AOF rewrite to fsync incrementally as data is written (every 4 MB by default), which smooths out I/O pressure compared to one large fsync at the end:

```text
aof-rewrite-incremental-fsync yes
```

This is recommended for large datasets on rotating disks or shared storage.

## Monitoring Rewrite Activity

Use `INFO persistence` to monitor rewrite behavior:

```bash
redis-cli INFO persistence
```

Key fields to watch:

```text
aof_enabled:1
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:45
aof_current_rewrite_time_sec:-1
aof_last_bgrewrite_status:ok
aof_current_size:2147483648
aof_base_size:1073741824
```

`aof_last_rewrite_time_sec` tells you how long the last rewrite took in seconds - useful for estimating resource usage.

## Measuring Copy-on-Write Memory

During rewrite, Redis forks a child process. The child gets a copy-on-write snapshot of memory. If the parent writes heavily during the fork, the OS creates physical copies of modified pages. Check COW size:

```bash
redis-cli INFO persistence | grep aof_last_cow_size
```

Example:

```text
aof_last_cow_size:524288000
```

This means 500 MB of extra memory was used due to COW during the last rewrite. If this is large, consider reducing the write rate during rewrites or adding more RAM.

## Scheduling Manual Rewrites During Off-Peak Hours

For very large datasets, disable automatic rewrites and schedule them manually during low-traffic periods:

```text
# Disable auto rewrite
auto-aof-rewrite-percentage 0
```

Then use a cron job to trigger rewrites:

```bash
#!/bin/bash
# Run at 2 AM every night
redis-cli BGREWRITEAOF
```

Wait for completion before exiting:

```bash
#!/bin/bash
redis-cli BGREWRITEAOF
while true; do
  status=$(redis-cli INFO persistence | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r')
  if [ "$status" = "0" ]; then
    echo "Rewrite complete"
    break
  fi
  echo "Rewrite in progress..."
  sleep 5
done
```

## Tuning for SSD vs HDD

On SSDs, incremental fsync is less important but `no-appendfsync-on-rewrite` is still valuable for latency:

```text
# SSD-optimized
aof-rewrite-incremental-fsync yes
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 256mb
```

On HDDs, increase the minimum size significantly to reduce rewrite frequency:

```text
# HDD-optimized
aof-rewrite-incremental-fsync yes
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 200
auto-aof-rewrite-min-size 1gb
```

## Watching for Rewrite Failures

If a rewrite fails (disk full, fork failure, etc.), check logs:

```bash
tail -f /var/log/redis/redis-server.log
```

Example failure message:

```text
# Background AOF rewrite failed
# Can't save in background: fork: Cannot allocate memory
```

This often means you need more available memory for the fork. Consider setting `vm.overcommit_memory` to 1 on Linux to allow the kernel to always permit overcommit, which prevents fork failures:

```bash
echo 1 > /proc/sys/vm/overcommit_memory
```

Or add it permanently:

```bash
# /etc/sysctl.conf
vm.overcommit_memory = 1
```

## Summary

Tuning AOF rewrite for large datasets involves balancing rewrite frequency against I/O impact and memory pressure. Increase the `auto-aof-rewrite-min-size` threshold, enable `no-appendfsync-on-rewrite` to reduce latency spikes, and use incremental fsync to smooth disk I/O. For the largest deployments, disabling automatic rewrites and scheduling them manually gives you the most control over when the I/O pressure occurs.
