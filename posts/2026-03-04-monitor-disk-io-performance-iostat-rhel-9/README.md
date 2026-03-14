# How to Monitor Disk I/O Performance with iostat on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Iostat, Disk I/O, Performance, Monitoring, Linux

Description: Learn how to use iostat on RHEL to monitor disk I/O performance, identify bottlenecks, and understand storage throughput metrics.

---

The `iostat` command is one of the most valuable tools for monitoring disk I/O performance on RHEL. It provides detailed statistics about CPU utilization and device I/O throughput, helping you identify storage bottlenecks and capacity issues before they affect application performance.

## Installing iostat

The `iostat` command is part of the `sysstat` package:

```bash
sudo dnf install sysstat
```

## Basic Usage

Run iostat without options to see a summary since boot:

```bash
iostat
```

Output:

```text
Linux 5.14.0-362.el9.x86_64    03/04/2026      _x86_64_

avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           2.30    0.00    1.50    0.80    0.00   95.40

Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
sda              15.20       120.50       85.30         0.00    1205000     853000          0
sdb               3.40        45.20       12.10         0.00     452000     121000          0
```

## Understanding iostat Output

### CPU Section

- **%user** - Time spent in user-space applications
- **%system** - Time spent in kernel operations
- **%iowait** - Time the CPU was idle while waiting for I/O to complete
- **%idle** - Time the CPU was idle with no pending I/O

High `%iowait` indicates disk I/O is a bottleneck.

### Device Section

- **tps** - Transfers per second (I/O operations per second)
- **kB_read/s** - Kilobytes read per second
- **kB_wrtn/s** - Kilobytes written per second
- **kB_dscd/s** - Kilobytes discarded per second (TRIM operations)

## Extended Statistics

For detailed per-device metrics, use the `-x` flag:

```bash
iostat -x
```

Additional fields include:

- **r/s** - Read requests per second
- **w/s** - Write requests per second
- **rkB/s** - Kilobytes read per second
- **wkB/s** - Kilobytes written per second
- **rrqm/s** - Read requests merged per second
- **wrqm/s** - Write requests merged per second
- **r_await** - Average time for read requests (milliseconds)
- **w_await** - Average time for write requests (milliseconds)
- **aqu-sz** - Average queue size
- **%util** - Percentage of time the device was busy

## Key Metrics to Watch

### %util (Utilization)

When `%util` approaches 100%, the device is saturated:

```bash
iostat -x 1 | awk '/^sd/ && $NF > 80 {print $1, "util:", $NF"%"}'
```

### await (Average Wait Time)

High await values indicate slow I/O response:

- SSD: await should be under 1-2ms
- HDD: await under 10-20ms is normal
- Values above 50ms indicate a problem

### aqu-sz (Average Queue Size)

A consistently growing queue indicates the device cannot keep up with demand.

## Continuous Monitoring

Monitor every 2 seconds, showing 10 reports:

```bash
iostat -x 2 10
```

Monitor continuously until interrupted:

```bash
iostat -x 1
```

The first report shows averages since boot. Subsequent reports show the interval since the last report.

## Monitoring Specific Devices

```bash
iostat -x /dev/sda 1
```

Or with NVMe devices:

```bash
iostat -x /dev/nvme0n1 1
```

## Displaying in Megabytes

```bash
iostat -xm 1
```

## Monitoring with Timestamps

```bash
iostat -xt 1
```

## Combining with Other Tools

Create a simple monitoring script:

```bash
#!/bin/bash
echo "Monitoring disk I/O - Press Ctrl+C to stop"
echo "Timestamp | Device | r/s | w/s | rMB/s | wMB/s | await | util%"
echo "---"
iostat -xmt 1 | awk '
/^[0-9]/ { timestamp = $1" "$2 }
/^sd|^nvme|^vd/ {
    printf "%s | %s | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f\n",
        timestamp, $1, $2, $8, $3, $9, $10, $NF
}'
```

## Identifying I/O Bottlenecks

Signs of a disk I/O bottleneck:

1. **High %iowait** in the CPU section (above 20%)
2. **High %util** approaching 100% for a device
3. **High await** values compared to device baseline
4. **Growing aqu-sz** indicating queuing

When you see these signs, investigate with:

```bash
# Which processes are doing I/O
iotop -oP

# What files are being accessed
fatrace -f W
```

## Summary

The `iostat` command is essential for disk I/O monitoring on RHEL. Use `iostat -x` for extended statistics, watch `%util`, `await`, and `aqu-sz` as your primary indicators, and combine with tools like `iotop` for process-level visibility. Regular monitoring helps you identify and resolve storage performance issues before they impact your applications.
