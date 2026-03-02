# How to Use atop for Advanced System Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Linux, System Administration

Description: Learn how to use atop on Ubuntu to monitor CPU, memory, disk, and network resources with per-process detail, including historical recording and replay for post-incident analysis.

---

`atop` is a full-screen performance monitor that shows system-level and process-level resource usage simultaneously. Unlike `top`, it covers CPU, memory, disk I/O, and network in a single view - and it records historical data to files so you can replay exactly what was happening on a system hours or days after an incident occurred.

## Installing atop

```bash
sudo apt update
sudo apt install atop -y
```

Enable and start the atop background daemon for continuous recording:

```bash
sudo systemctl enable atop
sudo systemctl start atop
```

Verify the service is recording:

```bash
sudo systemctl status atop
```

By default, atop records data every 10 minutes to `/var/log/atop/`.

## Running atop Interactively

Start atop in interactive mode:

```bash
atop
```

The screen is divided into two sections:

**System section (top):** Shows aggregate CPU, memory, disk, and network for all resources.

**Process section (bottom):** Shows per-process statistics for the current sort key.

Press `q` to quit.

## Understanding the Display

### System Line Layout

The top of the atop display shows:

```
ATOP - myserver            2026/03/02  14:23:45     1d0h12m elapsed
PRC | sys  8.04s | user 18.5s |              | #proc    198 | #trun      4 |
CPU | sys    12% | user   27% | irq     2%   | idle    59%  | wait     0%  |
CPL | avg1  2.23 | avg5  1.87 | avg15  1.45  |              | numcpu      4|
MEM | tot  15.6G | free  1.2G | cache  8.4G  | buff  512.0M | slab  346.2M |
SWP | tot   4.0G | free  4.0G |              |              | vmcom  12.3G |
DSK |        sda | busy   23% | read    145  | write   289  | avio   2.1ms |
NET | transport  | tcpi    45 | tcpo    52   | udpi      8  | udpo      3  |
NET |   network  | ipi    456 | ipo     467  |              |              |
NET |      eth0  | pcki   456 | pcko    467  | sp  1000 Mbps| si    2.3MB  |
```

### Process Section Columns

By default shows: PID, user, CPU%, memory, disk read/write, command name.

## Keyboard Navigation

In interactive mode:

| Key | Action |
|-----|--------|
| `c` | Sort by CPU usage |
| `m` | Sort by memory usage |
| `d` | Sort by disk activity |
| `n` | Sort by network activity |
| `a` | Automatic sorting (most active resource) |
| `g` | Generic info (default) |
| `t` | Show network per process |
| `p` | Show disk per process |
| `u` | Show memory per process |
| `v` | Show various process flags |
| `f` | Show only active processes (ignore idle) |
| `z` | Toggle showing only active system rows |
| `i` | Toggle showing idle processes |
| `h` | Help |
| `q` | Quit |

The `f` key is particularly useful - it hides lines with zero activity, making busy systems easier to read.

## Changing the Display Interval

```bash
# Update every 5 seconds
atop 5

# Update every 1 second (high resolution)
atop 1
```

## Recording Data to File

Record system activity to a file for later analysis:

```bash
# Record every 30 seconds for 1 hour to a file
atop -w /tmp/atop_session.log 30 120

# The background daemon records to /var/log/atop/ automatically
ls /var/log/atop/
```

Files are named `atop_YYYYMMDD`.

## Replaying Historical Data

This is one of atop's most powerful features:

```bash
# Replay today's recorded data
sudo atop -r /var/log/atop/atop_$(date +%Y%m%d)

# Replay yesterday's data
sudo atop -r /var/log/atop/atop_$(date -d yesterday +%Y%m%d)

# Start replay from a specific time
sudo atop -r /var/log/atop/atop_20260302 -b 14:00
```

In replay mode:
- Press `t` to step forward one interval
- Press `T` to step backward
- Press `b` to jump to a specific time
- Press `g` to fast-forward to the next interval with high activity

## Analyzing a Specific Time Window

When you know an incident happened at 15:30:

```bash
# Open replay at the incident time
sudo atop -r /var/log/atop/atop_$(date +%Y%m%d) -b 15:30
```

Then step through intervals second by second to see exactly what was happening.

## Text Output Mode

For scripting and log analysis, use text output:

```bash
# Show CPU and memory stats in text mode
sudo atop -P CPU,MEM 30 10

# Show all categories in text mode
sudo atop -P ALL 60 60 > /tmp/atop_text_output.txt
```

Supported fields for `-P`:
- `CPU` - CPU utilization
- `cpu` - Per-CPU core stats
- `CPL` - CPU load averages
- `MEM` - Memory usage
- `SWP` - Swap stats
- `DSK` - Disk statistics
- `NET` - Network stats
- `PRC` - Process stats
- `ALL` - Everything

## Adjusting Recording Frequency

The default 600-second (10-minute) recording interval is too coarse for most incident analysis. Change it:

```bash
sudo nano /etc/default/atop
```

Change:

```
INTERVAL=600
```

To:

```
INTERVAL=30
```

Restart the service:

```bash
sudo systemctl restart atop
```

Note: more frequent recording creates larger log files. 30-second intervals use roughly 20x more storage than 600-second intervals.

## Configuring Data Retention

By default, atop keeps logs for 28 days. The cleanup script is at `/etc/cron.daily/atop`:

```bash
cat /etc/cron.daily/atop
```

To change retention:

```bash
sudo nano /etc/default/atop
```

Set `LOGPATH` and the days to keep data.

## Filtering the Process List

In interactive mode, limit the process view:

```bash
# Show only processes matching a pattern
# Press 'u' then type a username to filter by user

# Or from command line, show only processes for a user
atop -u www-data 5
```

## Per-Process Network Statistics

One thing `atop` does that most tools don't is show network bandwidth per process. Press `n` in the process section to sort by network activity. This requires kernel support and may need the `netatop` module:

```bash
# Install netatop kernel module
sudo apt install netatop -y
sudo modprobe netatop
```

## Combining atop with System Alerts

Use atop's text output to trigger alerts:

```bash
#!/bin/bash
# atop-alert.sh - check CPU load and alert

CPU_THRESHOLD=80

CURRENT_CPU=$(atop -P CPU 1 1 | awk '/^CPU/ {print 100 - $NF}')

if (( $(echo "$CURRENT_CPU > $CPU_THRESHOLD" | bc -l) )); then
    echo "HIGH CPU: ${CURRENT_CPU}%" | mail -s "CPU Alert on $(hostname)" admin@example.com
fi
```

## atop vs top vs htop

Each tool has its place:

- **top/htop** - Real-time process list, good for quick inspection
- **vmstat/iostat** - Specific resource monitoring, good for scripting
- **atop** - Comprehensive view with historical recording, best for post-incident analysis

The historical replay capability makes atop uniquely valuable for debugging incidents that have already resolved. When someone says "the server was slow for 20 minutes this morning," you can replay exactly that window rather than trying to reproduce the problem.

```bash
# Quick start: install, configure short interval, start recording
sudo apt install atop -y
sudo sed -i 's/INTERVAL=600/INTERVAL=60/' /etc/default/atop
sudo systemctl restart atop

# Now you have 1-minute resolution historical data being collected
echo "atop is recording to /var/log/atop/"
```

With atop recording at 1-minute intervals, you can revisit any performance event that happened within the retention window and see exactly what the CPU, memory, disk, and network were doing at that moment.
