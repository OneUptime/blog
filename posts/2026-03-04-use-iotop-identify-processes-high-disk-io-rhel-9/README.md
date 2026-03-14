# How to Use iotop to Identify Processes Causing High Disk I/O on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Iotop, Disk I/O, Performance, Monitoring, Linux

Description: Learn how to use iotop on RHEL to identify which processes are consuming the most disk I/O and causing performance problems.

---

When your RHEL system experiences high disk I/O, you need to quickly identify which processes are responsible. The `iotop` command provides a real-time, top-like view of disk I/O activity per process, making it easy to pinpoint the source of storage bottlenecks.

## Installing iotop

```bash
sudo dnf install iotop
```

## Basic Usage

Run iotop as root:

```bash
sudo iotop
```

This shows a continuously updating display similar to `top`, but for disk I/O:

```text
Total DISK READ:       5.23 M/s | Total DISK WRITE:      12.45 M/s
Current DISK READ:     5.23 M/s | Current DISK WRITE:    12.45 M/s
    TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
  12345 be/4  mysql       3.21 M/s    8.76 M/s  0.00 %  45.23 %  mysqld
  23456 be/4  root        1.98 M/s    3.45 M/s  0.00 %  22.11 %  rsync --archive
    789 be/4  postgres    0.04 M/s    0.24 M/s  0.00 %   3.45 %  postgres: writer
```

## Understanding the Output

- **TID** - Thread ID
- **PRIO** - I/O scheduling priority (be = best effort, rt = real time, idle = idle)
- **DISK READ** - Current read throughput for this process
- **DISK WRITE** - Current write throughput for this process
- **SWAPIN** - Percentage of time spent swapping in
- **IO>** - Percentage of time spent waiting for I/O
- **COMMAND** - The process command

## Showing Only Active Processes

By default, iotop shows all processes. To show only processes currently performing I/O:

```bash
sudo iotop -o
```

This is the most commonly used option because it filters out idle processes and focuses on the actual I/O consumers.

## Showing Processes Instead of Threads

By default, iotop shows individual threads. To aggregate by process:

```bash
sudo iotop -P
```

Combine with the active-only filter:

```bash
sudo iotop -oP
```

## Batch Mode for Logging

Use batch mode to redirect output to a file:

```bash
sudo iotop -botPqqq --iter=60 > /tmp/iotop_log.txt
```

Options explained:

- `-b` - Batch mode (non-interactive)
- `-o` - Only show active processes
- `-t` - Add timestamps
- `-P` - Show processes, not threads
- `-qqq` - Suppress headers for cleaner output
- `--iter=60` - Run for 60 iterations

## Setting the Update Interval

Change the refresh interval (default is 1 second):

```bash
sudo iotop -d 5
```

This updates every 5 seconds, which gives more meaningful averages.

## Filtering by User

While iotop does not have a built-in user filter, you can pipe batch mode output:

```bash
sudo iotop -botP --iter=10 | grep mysql
```

## Accumulative Mode

Show total I/O since iotop started instead of current rate:

```bash
sudo iotop -a
```

This is useful for identifying processes that generate bursts of I/O rather than sustained throughput.

## Interactive Keyboard Shortcuts

While iotop is running:

- **o** - Toggle showing only active processes
- **p** - Toggle between process and thread view
- **a** - Toggle accumulative mode
- **r** - Reverse the sort order
- **Left/Right arrows** - Change the sort column
- **q** - Quit

## Alternative: Using pidstat for I/O Monitoring

If iotop is not available, `pidstat` from the sysstat package can show per-process I/O:

```bash
pidstat -d 1
```

Output:

```text
Average:      UID       PID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
Average:       27     12345   3284.00   8960.00      0.00      45  mysqld
Average:        0     23456   2028.00   3530.00      0.00      22  rsync
```

## Creating an I/O Monitoring Script

```bash
#!/bin/bash
# Monitor top I/O processes and alert if threshold exceeded
THRESHOLD_MB=50
LOG="/var/log/io_monitor.log"

while true; do
    TOP_IO=$(iotop -botPqqq --iter=1 | head -5)
    TOTAL_WRITE=$(echo "$TOP_IO" | awk '{sum += $6} END {print sum/1024}')

    if (( $(echo "$TOTAL_WRITE > $THRESHOLD_MB" | bc -l) )); then
        echo "$(date): High I/O detected - ${TOTAL_WRITE}MB/s write" >> "$LOG"
        echo "$TOP_IO" >> "$LOG"
    fi
    sleep 10
done
```

## Correlating iotop with iostat

Use both tools together for a complete picture:

1. **iostat** tells you which devices are under load
2. **iotop** tells you which processes are causing that load

```bash
# Terminal 1: Monitor device-level I/O
iostat -x 1

# Terminal 2: Monitor process-level I/O
sudo iotop -oP
```

## Summary

The `iotop` command is essential for identifying which processes cause high disk I/O on RHEL. Use `iotop -oP` to see only active processes aggregated by PID, batch mode for logging, and accumulative mode for catching burst I/O. Combined with `iostat` for device-level metrics, you get complete visibility into storage performance issues.
