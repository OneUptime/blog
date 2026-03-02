# How to Monitor System Resources with vmstat on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Linux, System Administration

Description: Learn how to use vmstat on Ubuntu to monitor virtual memory, CPU activity, disk I/O, and system processes for comprehensive performance analysis.

---

`vmstat` - virtual memory statistics - is one of the oldest and most reliable performance tools on Linux. Despite its name, it reports on much more than memory: CPU usage, disk activity, process states, and paging are all covered in a single compact output. It's often the first tool experienced sysadmins reach for when a system starts behaving poorly.

## Installing vmstat

`vmstat` is part of the `procps` package, which is installed by default on Ubuntu:

```bash
# Check if it's available
which vmstat

# Install if missing
sudo apt install procps -y
```

## Basic Usage

Run `vmstat` once for an immediate snapshot:

```bash
vmstat
```

Sample output:

```
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2  0      0 2048576  81920 4194304    0    0     5    12  523 1234  8  2 89  1  0
```

For continuous monitoring, provide an interval:

```bash
# Update every 2 seconds
vmstat 2

# Update every 1 second, 30 times, then exit
vmstat 1 30
```

## Understanding the Output Columns

### Procs
- `r` - Processes in run queue (waiting for CPU). Sustained values above the number of CPU cores indicate CPU saturation.
- `b` - Processes in uninterruptible sleep (waiting for I/O). High values indicate I/O bottleneck.

### Memory (in KB)
- `swpd` - Virtual memory used. Nonzero means the system has swapped to disk at some point.
- `free` - Free memory
- `buff` - Memory used as file system buffers
- `cache` - Memory used as page cache (this memory can be reclaimed)

Note: `free` alone doesn't tell the full story. Available memory is closer to `free + buff + cache`.

### Swap
- `si` - Swap-in per second (reading from swap to RAM). Should be 0 on a healthy system.
- `so` - Swap-out per second (writing from RAM to swap). Nonzero indicates memory pressure.

### I/O (in blocks per second)
- `bi` - Blocks received from block device (reads)
- `bo` - Blocks sent to block device (writes)

### System
- `in` - Interrupts per second
- `cs` - Context switches per second. Very high values (tens of thousands) can indicate too many threads competing for CPU.

### CPU (percentages)
- `us` - User CPU time
- `sy` - System (kernel) CPU time
- `id` - Idle time
- `wa` - I/O wait time. High `wa` means the CPU is idle waiting for disk.
- `st` - Time stolen by hypervisor (relevant in VMs)

## Reading Memory Statistics in Detail

Get more detailed memory information with `-s`:

```bash
vmstat -s
```

This shows totals and individual categories:

```
     16384000 K total memory
      9437184 K used memory
      6291456 K active memory
      3145728 K inactive memory
      2097152 K free memory
        81920 K buffer memory
      4194304 K swap cache
```

## Disk Statistics

The `-d` flag shows per-disk I/O statistics:

```bash
vmstat -d
```

Output includes reads, writes, and I/O time per disk device. This complements `iostat` but is available in the same tool.

## Partition Statistics

For per-partition statistics:

```bash
vmstat -p /dev/sda1
```

## Slab Cache Statistics

The `-m` flag shows slab cache usage - useful when diagnosing kernel memory issues:

```bash
vmstat -m | head -20
```

## Timestamps

Add timestamps to vmstat output for logging:

```bash
# Add timestamp to each line
vmstat -t 1

# Or prepend manually
vmstat 1 | awk '{print strftime("%Y-%m-%d %H:%M:%S"), $0; fflush()}'
```

## Diagnosing Common Problems with vmstat

### High CPU Run Queue

If `r` consistently exceeds the number of CPU cores, you have CPU saturation:

```bash
vmstat 1 | awk 'NR>2 {print $1, "r:", $1}'
```

A run queue of 8 on a 4-core system means 4 processes are waiting for CPU at any given moment - twice the hardware capacity.

### Memory Pressure

Watch swap activity:

```bash
# Alert if swap activity is detected
vmstat 1 | awk 'NR>2 && ($7+$8 > 0) {print "SWAP ACTIVITY: si=" $7 " so=" $8}'
```

### I/O Wait Problem

When `wa` is high, the system is CPU-idle but waiting for disk:

```bash
# Monitor and flag high I/O wait
vmstat 1 | awk 'NR>2 && $16 > 20 {print "HIGH IO WAIT:", $16 "%"}'
```

### Context Switch Spike

Very high `cs` values suggest thread contention:

```bash
# Alert on excessive context switches
vmstat 1 | awk 'NR>2 && $12 > 50000 {print "HIGH CONTEXT SWITCHES:", $12 "/s"}'
```

## Logging vmstat for Analysis

Capture performance data during an incident or for baseline analysis:

```bash
# Capture 1 hour of data with timestamps
vmstat -t 5 720 > /var/log/vmstat_$(date +%Y%m%d_%H%M%S).log

# Run in background
nohup vmstat -t 1 > /var/log/vmstat.log 2>&1 &
```

## Comparing vmstat with Related Tools

vmstat is a quick overview tool. When it points to a problem, you drill deeper:

| vmstat Indicator | What to Use Next |
|-----------------|-----------------|
| High `r` (run queue) | `top`, `pidstat -u` |
| High `si/so` (swap) | `free -m`, `/proc/meminfo` |
| High `wa` (I/O wait) | `iostat -x`, `iotop` |
| High `cs` (context switches) | `pidstat -w` |
| High `b` (blocked processes) | `ps aux`, `lsof` |

## A Practical Monitoring Loop

Here's a simple script for capturing vmstat during a load test:

```bash
#!/bin/bash
# capture-vmstat.sh - captures system stats during a test

OUTPUT="/tmp/vmstat_$(date +%Y%m%d_%H%M%S).log"

echo "Capturing vmstat to $OUTPUT"
echo "Press Ctrl+C to stop"

# Header
echo "timestamp r b swpd free buff cache si so bi bo in cs us sy id wa st" > "$OUTPUT"

vmstat 1 | while read line; do
    echo "$(date +%Y-%m-%dT%H:%M:%S) $line" >> "$OUTPUT"
done
```

## Interpreting a Healthy System

On a well-functioning system you typically see:
- `r` at or below core count
- `b` at 0
- `si` and `so` both at 0
- `wa` below 5%
- `id` above 70% (unless intentionally under load)
- `cs` reasonable for the workload (a busy web server might have 10,000-50,000 cs/s normally)

The first vmstat output line after startup is always a summary since boot - ignore it for real-time analysis. The subsequent lines show actual per-interval statistics.

`vmstat` takes less than a second to run and gives you an immediate health overview of any Linux system. Make it a habit to run it first when investigating performance issues - it usually points you in the right direction within the first few seconds.
