# How to Use vmstat and sar to Monitor Memory Utilization Trends on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Monitoring, Linux

Description: Learn how to use vmstat and sar to Monitor Memory Utilization Trends on RHEL with step-by-step instructions, configuration examples, and best practices.

---

vmstat and sar are essential tools for monitoring memory utilization trends on RHEL. vmstat provides real-time snapshots, while sar collects and reports historical data for capacity planning and troubleshooting.

## Prerequisites

- RHEL
- sysstat package installed

## Step 1: Install sysstat

```bash
sudo dnf install -y sysstat
sudo systemctl enable --now sysstat
```

## Step 2: Real-Time Memory Monitoring with vmstat

```bash
vmstat 5 10
```

This samples every 5 seconds for 10 iterations.

Key columns:

| Column | Description |
|--------|-------------|
| `r` | Processes waiting for CPU |
| `b` | Processes in uninterruptible sleep |
| `swpd` | Virtual memory used (swap) |
| `free` | Free memory |
| `buff` | Buffer cache |
| `cache` | Page cache |
| `si` | Swap in (KB/s) |
| `so` | Swap out (KB/s) |

## Step 3: Detailed Memory Statistics

```bash
vmstat -s
```

This shows a comprehensive summary of memory statistics since boot.

## Step 4: Historical Memory Data with sar

View today's memory history:

```bash
sar -r
```

View a specific date:

```bash
sar -r -f /var/log/sa/sa04
```

Key fields:
- `kbmemfree` - Free memory
- `%memused` - Memory utilization percentage
- `kbbuffers` - Buffer cache
- `kbcached` - Page cache
- `kbcommit` - Committed memory
- `%commit` - Commit ratio

## Step 5: Monitor Swap Activity Over Time

```bash
sar -W
```

Shows `pswpin/s` (pages swapped in) and `pswpout/s` (pages swapped out) per second.

## Step 6: Monitor Page Faults

```bash
sar -B
```

Key fields:
- `pgpgin/s` - Pages paged in from disk
- `pgpgout/s` - Pages paged out to disk
- `fault/s` - Page faults per second
- `majflt/s` - Major faults (required disk I/O)

## Step 7: Set Up Custom Collection Intervals

Edit the sysstat cron:

```bash
sudo vi /etc/sysstat/sysstat
```

Change collection interval:

```
HISTORY=28
SADC_OPTIONS="-S ALL"
```

Edit the timer for more frequent collection:

```bash
sudo systemctl edit sysstat-collect.timer
```

```ini
[Timer]
OnCalendar=*:00/2
```

This collects data every 2 minutes instead of the default 10.

## Step 8: Generate Reports

```bash
sar -r -s 08:00:00 -e 18:00:00
```

This shows memory usage between 8 AM and 6 PM.

## Conclusion

vmstat and sar together provide complete memory monitoring on RHEL. Use vmstat for real-time diagnosis and sar for historical trend analysis. The combination helps you identify memory pressure patterns, predict capacity needs, and troubleshoot intermittent issues.
