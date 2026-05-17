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

Extended output columns (sysstat 12.x groups read, write, discard and flush metrics together):

```text
Device     r/s    rkB/s  rrqm/s  %rrqm r_await rareq-sz    w/s    wkB/s  wrqm/s  %wrqm w_await wareq-sz   d/s   dkB/s  drqm/s  %drqm d_await dareq-sz   f/s f_await aqu-sz  %util
sda       8.32   156.32    0.12   1.42    0.52    18.79  12.45   423.18    2.34  15.83    2.31    33.99  0.00    0.00    0.00   0.00    0.00     0.00  0.00    0.00   0.04   1.01
nvme0n1  45.23  1234.56    0.00   0.00    0.08    27.30 123.45  5678.90    0.45   0.36    0.12    46.01  0.00    0.00    0.00   0.00    0.00     0.00  0.00    0.00   0.02   1.35
```

Key columns explained:

- `r/s` and `w/s` - Reads and writes per second
- `rkB/s` and `wkB/s` - Read and write throughput in KB/s
- `rrqm/s` and `wrqm/s` - Requests merged per second (higher means I/O is sequential, which is good)
- `r_await` and `w_await` - Average time in milliseconds for I/O requests to be served (includes queue time)
- `d/s`, `dkB/s`, `d_await` - Discard request metrics (relevant for SSDs/NVMe that support TRIM)
- `f/s`, `f_await` - Flush request metrics
- `aqu-sz` - Average queue size. Values consistently above 1 indicate the device is overwhelmed.
- `%util` - Percentage of time the device was busy. Values above 80-90% indicate saturation.

Note: the `svctm` field that appeared in older sysstat releases was removed in sysstat 12.0 because it could no longer be reliably computed on multi-queue block devices.

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

Use `-h` to auto-format sizes (k, M, G, ...) and lay out the report for easier reading (it implies `--human --pretty`). Use `-m` if you specifically want megabytes per second instead of the default kilobytes:

```bash
# Auto-formatted, human-friendly layout
iostat -xh 1

# Force megabytes per second
iostat -xm 1
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

Modern Ubuntu kernels (5.x and later) use the multi-queue block layer, so the available schedulers are typically `none`, `mq-deadline`, `kyber`, and `bfq` (the legacy `cfq` and single-queue `deadline` schedulers were removed in Linux 5.0). For NVMe, `none` is usually the default and works well; for SATA SSDs, `mq-deadline` is a common choice; for spinning disks, `mq-deadline` or `bfq` give good latency control.

## Writing a Quick I/O Health Check

```bash
#!/bin/bash
# io-health-check.sh

echo "=== Disk I/O Health Check ==="
echo "Time: $(date)"
echo ""

# In sysstat 12.x the extended report has these columns (after Device):
#   1:r/s 2:rkB/s 3:rrqm/s 4:%rrqm 5:r_await 6:rareq-sz
#   7:w/s 8:wkB/s 9:wrqm/s 10:%wrqm 11:w_await 12:wareq-sz
#   13:d/s 14:dkB/s 15:drqm/s 16:%drqm 17:d_await 18:dareq-sz
#   19:f/s 20:f_await 21:aqu-sz 22:%util
# So $1=Device, $6=r_await, $12=w_await, $23=%util.
iostat -dx 1 2 | awk '
NF >= 23 && $1 != "Device" {
    r_await = $6 + 0
    w_await = $12 + 0
    util = $23 + 0
    if (util > 80) {
        printf "WARNING: %s utilization at %.1f%%\n", $1, util
    }
    if (r_await > 50 || w_await > 50) {
        printf "WARNING: %s await high (r=%.1f ms, w=%.1f ms)\n", $1, r_await, w_await
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
