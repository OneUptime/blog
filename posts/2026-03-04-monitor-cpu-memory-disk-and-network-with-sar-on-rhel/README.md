# How to Monitor CPU, Memory, Disk, and Network with sar (sysstat) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Sar, Sysstat, Performance Monitoring, CPU, Memory, Disk, Network

Description: Use sar from the sysstat package on RHEL to collect and review historical system performance data for CPU, memory, disk I/O, and network activity.

---

The `sar` command from the sysstat package collects and reports system activity data on RHEL. Unlike real-time tools like top or vmstat, sar stores historical data so you can look back at what happened during a problem window hours or days ago.

## Install and Enable sysstat

```bash
# Install sysstat
sudo dnf install -y sysstat

# Enable and start the data collection service
sudo systemctl enable --now sysstat

# sysstat collects data every 10 minutes by default
# Data is stored in /var/log/sa/
```

## CPU Monitoring

```bash
# Show CPU utilization for today
sar -u

# Show CPU stats from 3 samples, 2 seconds apart
sar -u 2 3

# Show per-CPU breakdown
sar -P ALL 2 3

# Show CPU stats for a specific day (sa15 = 15th of the month)
sar -u -f /var/log/sa/sa15
```

## Memory Monitoring

```bash
# Show memory utilization
sar -r

# Show memory stats in real time (5 samples, 1 second interval)
sar -r 1 5

# Key columns:
# kbmemfree - free memory in KB
# kbmemused - used memory in KB
# %memused  - percentage of memory used
# kbbuffers - kernel buffers
# kbcached  - page cache

# Show swap usage
sar -S
```

## Disk I/O Monitoring

```bash
# Show disk I/O activity for all devices
sar -d

# Show I/O for specific device
sar -d -p 1 5
# -p makes device names human-readable (sda instead of dev8-0)

# Key columns:
# tps    - transfers per second
# rkB/s  - kilobytes read per second
# wkB/s  - kilobytes written per second
# await  - average wait time in ms
# %util  - percentage utilization of the device

# Show block device activity
sar -b
```

## Network Monitoring

```bash
# Show network interface statistics
sar -n DEV

# Real-time network stats (5 samples, 2 seconds apart)
sar -n DEV 2 5

# Key columns:
# rxpck/s - received packets per second
# txpck/s - transmitted packets per second
# rxkB/s  - received kilobytes per second
# txkB/s  - transmitted kilobytes per second

# Show network errors
sar -n EDEV

# Show TCP connection statistics
sar -n TCP

# Show socket usage
sar -n SOCK
```

## View Historical Data

```bash
# Show CPU data from a specific date (the 10th of this month)
sar -u -f /var/log/sa/sa10

# Show data between specific times
sar -u -f /var/log/sa/sa10 -s 08:00:00 -e 12:00:00

# Show memory data from yesterday
sar -r -f /var/log/sa/sa$(date -d yesterday +%d)
```

## Change Collection Interval

```bash
# Edit the sysstat collection frequency
sudo vi /etc/cron.d/sysstat
# Default line: */10 * * * * root /usr/lib64/sa/sa1 1 1
# Change to every 5 minutes:
# */5 * * * * root /usr/lib64/sa/sa1 1 1
```

## Generate a Full System Report

```bash
# Generate an ASCII report for today
sar -A > /tmp/full-sar-report.txt

# Generate an SVG graph (requires sadf)
sadf -g /var/log/sa/sa$(date +%d) -- -u > /tmp/cpu-graph.svg
```

sar is one of the most reliable performance tools on RHEL. Because it stores data automatically, you can always go back and check what happened, even if you were not watching when the problem occurred.
