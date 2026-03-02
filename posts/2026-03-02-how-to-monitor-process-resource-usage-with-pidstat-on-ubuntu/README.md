# How to Monitor Process Resource Usage with pidstat on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Linux, System Administration

Description: Learn how to use pidstat on Ubuntu to monitor per-process CPU, memory, I/O, and thread statistics for effective performance troubleshooting.

---

When you need to understand exactly which process is consuming your system resources, tools like `top` give you a snapshot, but `pidstat` gives you a time-series view per process. It's part of the `sysstat` package and lets you track CPU usage, memory, I/O, and context switching at the process level over time.

## Installing sysstat

If `pidstat` isn't already installed:

```bash
sudo apt update
sudo apt install sysstat -y
```

Verify it's available:

```bash
pidstat --version
```

## Basic pidstat Usage

The simplest form runs pidstat once per second and shows CPU stats for all running processes:

```bash
# Show CPU usage for all processes, refresh every 1 second
pidstat 1
```

Output columns:
- `PID` - Process ID
- `%usr` - CPU used in user space
- `%system` - CPU used in kernel space
- `%CPU` - Total CPU percentage
- `CPU` - Which CPU core the process ran on
- `Command` - Process name

To run it for a fixed number of intervals:

```bash
# Report every 2 seconds, 10 times
pidstat 2 10
```

## Monitoring a Specific Process

You can target a specific PID:

```bash
# Monitor PID 1234 every second
pidstat -p 1234 1
```

Or monitor processes by name pattern using `-C`:

```bash
# Monitor all processes with "nginx" in the command name
pidstat -C nginx 1
```

## CPU Statistics

The default view shows CPU stats. You can be explicit about it with `-u`:

```bash
# CPU usage per process
pidstat -u 1
```

To show per-thread CPU breakdown instead of per-process:

```bash
# Show individual threads, not just process totals
pidstat -u -t 1
```

This is useful when debugging applications with multiple worker threads where one thread might be spinning at 100%.

## Memory Statistics

Use `-r` to report memory usage:

```bash
# Memory stats per process
pidstat -r 1
```

Key columns:
- `minflt/s` - Minor page faults per second (data already in memory)
- `majflt/s` - Major page faults per second (required disk I/O)
- `VSZ` - Virtual memory size in KB
- `RSS` - Resident set size (physical memory) in KB
- `%MEM` - Percentage of total physical memory

High `majflt/s` values indicate a process is frequently accessing memory pages that had to be pulled from disk - a sign of memory pressure.

```bash
# Watch memory and spot major page faults for a Java process
pidstat -r -C java 1
```

## Disk I/O Statistics

The `-d` flag shows per-process disk I/O:

```bash
# Disk I/O per process
pidstat -d 1
```

Columns include:
- `kB_rd/s` - Kilobytes read per second
- `kB_wr/s` - Kilobytes written per second
- `kB_ccwr/s` - Kilobytes whose write was canceled (buffer cache)

This is invaluable when `iostat` shows high disk utilization but you need to know which process is responsible.

```bash
# Combine with a specific PID to track a database process
pidstat -d -p $(pgrep postgres | head -1) 1
```

## Context Switching Statistics

Excessive context switching degrades performance. Use `-w` to monitor it:

```bash
# Context switches per process
pidstat -w 1
```

Columns:
- `cswch/s` - Voluntary context switches per second (process waiting for I/O, locks, etc.)
- `nvcswch/s` - Involuntary context switches per second (preempted by scheduler)

High involuntary context switches suggest too many threads competing for CPU time.

## Combining Multiple Statistics

You can combine flags to get a comprehensive view:

```bash
# CPU, memory, and I/O all at once for a specific process
pidstat -u -r -d -p 5678 1
```

Or all statistics at once with `-A`:

```bash
# Everything - CPU, memory, I/O, context switches
pidstat -A 1
```

## Monitoring Child Processes

Some applications fork child processes. Use `-T` to control what gets reported:

```bash
# Show parent process and child processes
pidstat -T ALL -p 1234 1

# Show only child processes
pidstat -T CHILD -p 1234 1
```

## Logging pidstat Output for Later Analysis

For capacity planning, you'll often want to capture stats over time:

```bash
# Log 1-hour of per-second process stats to a file
pidstat -u -r -d 1 3600 > /var/log/pidstat_$(date +%Y%m%d_%H%M%S).log
```

Or with timestamps using `-t`:

```bash
# Include timestamps in output
pidstat -u -t 1 60 | tee /var/log/process_stats.log
```

## Practical Troubleshooting Examples

### Finding the CPU Hog

```bash
# Sort by CPU, watch every 2 seconds
pidstat -u 2 | sort -k8 -rn | head -20
```

### Identifying Memory Leaks

```bash
# Watch RSS growth over time for a specific process
while true; do
    pidstat -r -p $(pgrep myapp) 1 1 | tail -2
    sleep 5
done
```

### Correlating I/O with Application Behavior

```bash
# Run pidstat alongside a load test
pidstat -d -C myapp 1 > io_stats.txt &
# Run your load test here
wait
```

## Understanding the Output During High Load

When a system is under heavy load, pidstat can reveal patterns that generic tools miss. For example, if you see a web server process with consistently high `nvcswch/s` (involuntary context switches), it suggests the process is being preempted frequently - possibly because there are more active threads than CPU cores. The fix might be to reduce worker thread count rather than add more hardware.

Similarly, a batch processing job with near-zero `kB_rd/s` but high `%system` CPU suggests it's doing a lot of syscalls - possibly small, frequent writes that could be batched.

## Combining pidstat with Other Tools

`pidstat` pairs well with other sysstat tools:

```bash
# Run pidstat and iostat side by side in tmux or separate terminals
pidstat -d 1  # in one terminal
iostat -x 1   # in another
```

This lets you correlate per-process I/O with overall disk saturation metrics.

`pidstat` fills a specific gap - it gives you the process-level detail that `vmstat` and `iostat` lack, and the time-series continuity that `ps` lacks. Once you add it to your troubleshooting toolkit, you'll reach for it every time a system starts behaving unexpectedly under load.
