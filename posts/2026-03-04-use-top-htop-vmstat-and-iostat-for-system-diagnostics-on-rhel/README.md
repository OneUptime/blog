# How to Use top, htop, vmstat, and iostat for System Diagnostics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, top, htop, vmstat, iostat, System Diagnostics, Performance

Description: Use essential RHEL command-line tools including top, htop, vmstat, and iostat to diagnose CPU, memory, and disk I/O performance issues in real time.

---

When a RHEL system is running slow, the first step is to identify the bottleneck. These four tools cover the basics: CPU, memory, processes, and disk I/O.

## top - Process and CPU Overview

```bash
# Launch top
top

# Key columns:
# PID     - process ID
# %CPU    - CPU percentage
# %MEM    - memory percentage
# RES     - resident memory size
# COMMAND - process name

# Useful keyboard shortcuts inside top:
# P - sort by CPU usage
# M - sort by memory usage
# 1 - show per-CPU stats
# k - kill a process
# q - quit
```

```bash
# Run top in batch mode for scripting (5 iterations, 2 sec interval)
top -b -n 5 -d 2 > /tmp/top-output.txt

# Show only processes from a specific user
top -u apache

# Show specific process IDs
top -p 1234,5678
```

## htop - Interactive Process Viewer

```bash
# Install htop
sudo dnf install -y htop

# Launch htop
htop

# htop advantages over top:
# - color-coded CPU and memory bars
# - mouse support
# - easier process tree view (F5)
# - search processes (F3)
# - filter processes (F4)
# - sort by any column (F6)

# Launch htop showing only a specific user's processes
htop -u apache

# Launch htop in tree mode
htop -t
```

## vmstat - Virtual Memory Statistics

```bash
# Show vmstat output every 2 seconds, 10 times
vmstat 2 10

# Output columns explained:
# procs:  r = runnable processes, b = blocked processes
# memory: swpd = swap used, free = free memory, buff = buffers, cache = cache
# swap:   si = swap in, so = swap out (high values indicate memory pressure)
# io:     bi = blocks in from disk, bo = blocks out to disk
# system: in = interrupts/sec, cs = context switches/sec
# cpu:    us = user, sy = system, id = idle, wa = I/O wait, st = stolen

# Show output with timestamps
vmstat -t 2 5

# Show active/inactive memory
vmstat -a 2 5

# Show disk statistics
vmstat -d

# Show slab info
vmstat -m | head -20
```

## iostat - Disk I/O Statistics

```bash
# Install sysstat if not present (iostat is part of sysstat)
sudo dnf install -y sysstat

# Show basic CPU and disk I/O stats
iostat

# Show extended disk stats every 2 seconds, 5 times
iostat -x 2 5

# Key columns in extended mode:
# rrqm/s  - read requests merged per second
# wrqm/s  - write requests merged per second
# r/s     - reads per second
# w/s     - writes per second
# rkB/s   - kilobytes read per second
# wkB/s   - kilobytes written per second
# await   - average wait time in ms (important for latency)
# %util   - device utilization (100% means saturated)

# Show stats for specific devices only
iostat -x sda nvme0n1 2 5

# Show stats in megabytes
iostat -m -x 2 5

# Show only disk stats (no CPU)
iostat -d -x 2 5
```

## Quick Diagnostic Workflow

When a system is slow, run these commands in this order:

```bash
# Step 1: Check load average and basic resource usage
uptime

# Step 2: Check CPU and memory with vmstat
vmstat 1 5

# Step 3: If I/O wait is high, check disks
iostat -x 1 5

# Step 4: Find the processes consuming resources
top -b -n 1 | head -30
```

These tools are available on every RHEL system and require no additional infrastructure. They are your first line of defense when diagnosing performance problems.
