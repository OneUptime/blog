# How to Use iostat to Monitor Disk I/O Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Linux, Storage, System Administration

Description: Learn how to use iostat on Ubuntu to monitor disk I/O performance, identify bottlenecks, and analyze storage device utilization with practical examples.

---

`iostat` is the primary tool for diagnosing disk I/O performance on Linux. It reports input/output statistics for devices and partitions, making it possible to identify whether a performance problem is caused by disk saturation, poor I/O patterns, or inadequate storage hardware.

It's part of the `sysstat` package, which also includes `pidstat` and `sar`.

## Installing iostat

```bash
sudo apt update
sudo apt install sysstat -y
```

Enable the sysstat collection service:

```bash
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

## Basic Usage

Run once for a current snapshot:

```bash
iostat
```

Output:

```text
Linux 5.15.0-91-generic (ubuntu-server)  03/02/2026  _x86_64_    (4 CPU)

avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           8.32    0.00    2.15    1.23    0.00   88.30

Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
sda               12.45       156.32       423.18         0.00    2987654    8091234          0
```

For continuous monitoring:

```bash
# Update every 2 seconds
iostat 2

# Update every 1 second, 20 times
iostat 1 20
```

## Extended Statistics with -x

The most useful mode is extended, which shows much more detail:

```bash
iostat -x 1
```

Extended output columns:

```text
Device      r/s     w/s   rkB/s   wkB/s  rrqm/s  wrqm/s  %rrqm  %wrqm r_await w_await aqu-sz rareq-sz wareq-sz  svctm  %util
sda        8.32   12.45  156.32  423.18    0.12    2.34   1.42   15.83    0.52    2.31   0.04    18.79    33.99   0.48   1.01
nvme0n1   45.23  123.45 1234.56 5678.90    0.00    0.45   0.00    0.36    0.08    0.12   0.02    27.30    46.01   0.08   1.35
```

Key columns explained:

- `r/s` and `w/s` - Reads and writes per second
- `rkB/s` and `wkB/s` - Read and write throughput in KB/s
- `rrqm/s` and `wrqm/s` - Requests merged per second (higher means I/O is sequential, which is good)
- `r_await` and `w_await` - Average time in milliseconds for I/O requests to be served (includes queue time)
- `aqu-sz` - Average queue size. Values consistently above 1 indicate the device is overwhelmed.
- `%util` - Percentage of time the device was busy. Values above 80-90% indicate saturation.

## The Most Important Metrics

### %util - Device Utilization

This is the first number to check. A spinning disk at 100% util is saturated and cannot handle more I/O. An NVMe drive at 100% util might still have headroom due to internal parallelism.

```bash
# Watch utilization, highlight high values
iostat -x 1 | awk '/^Device/ || /^sd/ || /^nvme/ {
    if ($NF+0 > 80) print "HIGH UTIL: " $0
    else print $0
}'
```

### await - I/O Latency

`await` (or `r_await`/`w_await` in newer versions) is the average time in milliseconds from when an I/O request was submitted to when it completed. Expected values:
- Spinning disk: 5-20ms is normal
- SSD: 0.1-1ms is normal
- NVMe: <0.1ms is normal

If await spikes beyond these baselines, either the queue is growing (device saturation) or the device itself is slow.

### aqu-sz - Queue Depth

If the average queue size is consistently above 1-2, more I/O is being submitted than the device can process in real time.

## Showing Only Specific Devices

```bash
# Show only sda
iostat -x 1 sda

# Show sda and nvme0n1
iostat -x 1 sda nvme0n1
```

## Human-Readable Output

Use `-h` for megabytes instead of kilobytes:

```bash
iostat -xh 1
```

## Comparing Disk Types

Here's how to distinguish a performance problem between a spinning disk and an NVMe:

```bash
# Get a 5-second average for all devices
iostat -x 5 1
```

If `sda` (spinning disk) shows `%util` at 90%+ with `await` at 50ms, it's saturated. If `nvme0n1` shows `%util` at 90% but `await` at 0.5ms, the NVMe is handling load fine despite high utilization.

## Checking I/O Patterns

Random vs. sequential I/O matters a lot for spinning disks:

```bash
# rrqm/s and wrqm/s show merged requests
iostat -x 1
```

High `rrqm/s` and `wrqm/s` mean many I/O requests are being merged into larger sequential operations - this is good for spinning disks. A ratio of `rrqm/s` to `r/s` near zero means mostly random I/O.

## Using -d for Device-Only Output

Skip the CPU summary:

```bash
# Show only device stats, no CPU
iostat -d -x 1
```

## Logging iostat for Trend Analysis

```bash
# Capture 1 hour of data
iostat -x -t 5 720 > /var/log/iostat_$(date +%Y%m%d_%H%M%S).log

# The -t flag adds timestamps
iostat -x -t 1
```

## Correlating iostat with Application Behavior

A practical workflow for diagnosing slow database queries:

```bash
# Terminal 1: Watch disk stats
iostat -x 1

# Terminal 2: Watch which process is causing I/O
iotop -o -d 1

# Terminal 3: Check database slow query log
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

When a slow query starts, watch `await` spike in iostat and the process appear in iotop.

## Understanding Disk Scheduler Impact

The I/O scheduler affects iostat metrics. Check the current scheduler:

```bash
# Check scheduler for sda
cat /sys/block/sda/queue/scheduler
```

For SSDs and NVMe, `mq-deadline` or `none` typically performs better than `cfq`. For spinning disks, `mq-deadline` provides good latency control.

## Writing a Quick I/O Health Check

```bash
#!/bin/bash
# io-health-check.sh

echo "=== Disk I/O Health Check ==="
echo "Time: $(date)"
echo ""

iostat -x 1 2 | tail -n +4 | awk '
NF > 0 && $1 != "Device" {
    util = $NF + 0
    await_val = $(NF-6) + 0
    if (util > 80) {
        printf "WARNING: %s utilization at %.1f%%\n", $1, util
    }
    if (await_val > 50) {
        printf "WARNING: %s await time at %.1f ms\n", $1, await_val
    }
}
'
```

## iostat vs. Other Tools

`iostat` is your first stop for disk performance. From there:
- Use `iotop` to find which process is doing the I/O
- Use `pidstat -d` to track I/O per process over time
- Use `blktrace` for deep-dive block layer tracing
- Use `smartctl` to check disk health (separate issue from performance)

The key habit is running `iostat -x 1` and watching for `%util` approaching 100% or `await` values that exceed the expected baseline for your storage type. Those two numbers tell you most of what you need to know about disk health under load.
