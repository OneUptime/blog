# How to Use sar for Historical System Performance Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Linux, System Administration, sysstat

Description: Learn how to use sar on Ubuntu to review historical CPU, memory, network, and disk performance data for post-incident analysis and capacity planning.

---

One of the most common situations in system administration is getting a call about a performance issue that happened an hour ago - or last Tuesday. `top` and `vmstat` only show you what's happening now. `sar` (System Activity Reporter) shows you what happened in the past.

`sar` is part of the `sysstat` package and collects system performance data on a schedule, storing it in binary data files. You can then query those files to review historical metrics.

## Installing and Enabling sysstat

```bash
sudo apt update
sudo apt install sysstat -y
```

Enable and start the collection service:

```bash
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

Verify data collection is enabled:

```bash
# Check the sysstat config
cat /etc/default/sysstat
```

You should see `ENABLED="true"`. If not:

```bash
sudo sed -i 's/ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
sudo systemctl restart sysstat
```

By default, data is collected every 10 minutes and stored in `/var/log/sysstat/`.

## Adjusting Collection Frequency

The default 10-minute interval is too coarse for detecting short spikes. Edit the cron job:

```bash
sudo nano /etc/cron.d/sysstat
```

Change:

```
5-55/10 * * * * root command -v debian-sa1 > /dev/null && debian-sa1 1 1
```

To collect every 2 minutes:

```
*/2 * * * * root command -v debian-sa1 > /dev/null && debian-sa1 1 1
```

## Basic sar Usage

Running `sar` without arguments shows today's CPU activity in 10-minute intervals:

```bash
sar
```

Output:

```
Linux 5.15.0-91-generic (ubuntu-server)  03/02/2026  _x86_64_    (4 CPU)

00:00:01        CPU     %user     %nice   %system   %iowait    %steal     %idle
00:10:01        all      8.32      0.00      2.15      1.23      0.00     88.30
00:20:01        all     12.45      0.00      3.21      0.98      0.00     83.36
```

## Viewing Historical Data

Data files are stored as `/var/log/sysstat/saDD` where DD is the day of the month:

```bash
# View yesterday's data
sar -f /var/log/sysstat/sa$(date -d yesterday +%d)

# View data from the 15th of this month
sar -f /var/log/sysstat/sa15

# Specify date with -s and -e (start/end time)
sar -f /var/log/sysstat/sa01 -s 14:00:00 -e 16:00:00
```

## CPU Statistics

```bash
# CPU usage today
sar -u

# Per-CPU breakdown (each core separately)
sar -u ALL

# Historical CPU for a specific day
sar -u -f /var/log/sysstat/sa28
```

## Memory Statistics

```bash
# Memory usage statistics
sar -r

# Memory utilization percentage
sar -r ALL
```

Key columns:
- `kbmemfree` - Free memory
- `kbmemused` - Used memory
- `%memused` - Memory usage percentage
- `kbbuffers` - Buffer cache
- `kbcached` - Page cache
- `kbcommit` - Memory committed to processes
- `%commit` - Percentage of total RAM+swap committed

High `%commit` values (above 100%) mean the system is overcommitted - more memory has been promised to processes than physically exists.

## Swap Statistics

```bash
# Swap usage over time
sar -S
```

Nonzero `pswpin/s` (pages swapped in) or `pswpout/s` (pages swapped out) during a time window identifies when memory pressure occurred.

## Disk I/O Statistics

```bash
# Block device statistics
sar -b

# Per-device extended statistics (like iostat -x)
sar -d

# Per-device with human-readable device names
sar -d -p
```

## Network Statistics

```bash
# Network interface statistics
sar -n DEV

# Specific network errors
sar -n EDEV

# TCP statistics
sar -n TCP

# TCP error statistics
sar -n ETCP

# Socket statistics
sar -n SOCK
```

For network troubleshooting, `sar -n DEV` is particularly useful:

```bash
# Show historical network traffic for eth0
sar -n DEV -f /var/log/sysstat/sa02 | grep eth0
```

Columns include `rxpck/s`, `txpck/s`, `rxkB/s`, `txkB/s` - packets and bytes per second per interface.

## Load Average and Process Queue

```bash
# Run queue and load average
sar -q
```

Columns:
- `runq-sz` - Run queue size (processes waiting for CPU)
- `plist-sz` - Process and thread count
- `ldavg-1/5/15` - Load averages

This is critical for post-incident analysis: if the 1-minute load average spiked to 24 on an 8-core system at 14:32, that's exactly when the incident started.

## Context Switches and Interrupts

```bash
# System-wide context switches and interrupts
sar -w
```

- `proc/s` - New processes per second
- `cswch/s` - Context switches per second

## Practical Post-Incident Analysis Workflow

When you get a report that "the server was slow yesterday between 2 and 4 PM," here's how to investigate:

```bash
# Step 1: Check CPU during the incident window
sar -u -f /var/log/sysstat/sa$(date -d yesterday +%d) -s 14:00:00 -e 16:00:00

# Step 2: Check if it was memory pressure
sar -r -f /var/log/sysstat/sa$(date -d yesterday +%d) -s 14:00:00 -e 16:00:00

# Step 3: Check for swap activity
sar -S -f /var/log/sysstat/sa$(date -d yesterday +%d) -s 14:00:00 -e 16:00:00

# Step 4: Check disk I/O
sar -b -f /var/log/sysstat/sa$(date -d yesterday +%d) -s 14:00:00 -e 16:00:00

# Step 5: Check network
sar -n DEV -f /var/log/sysstat/sa$(date -d yesterday +%d) -s 14:00:00 -e 16:00:00
```

## Converting sar Data to CSV

For graphing or importing into other tools:

```bash
# Convert to CSV format
sar -u -f /var/log/sysstat/sa01 | awk 'NF > 0' > cpu_data.csv

# Use sadf for proper CSV output
sadf -d /var/log/sysstat/sa01 -- -u > cpu_data.csv

# JSON output
sadf -j /var/log/sysstat/sa01 -- -u > cpu_data.json
```

`sadf` is a companion tool that converts sysstat data files to various formats.

## Generating HTML Reports

```bash
# Generate an HTML report from a day's data
sadf -g /var/log/sysstat/sa01 > report.html
```

Open it in a browser for visual graphs of all metrics over the day.

## Retention Configuration

By default, sysstat keeps data for 7 days. Increase retention:

```bash
sudo nano /etc/sysstat/sysstat
```

Change:

```
HISTORY=7
```

To keep 30 days:

```
HISTORY=30
```

## Automation Example

A script that generates a daily performance summary:

```bash
#!/bin/bash
# daily-perf-summary.sh

YESTERDAY=$(date -d yesterday +%d)
SAFILE="/var/log/sysstat/sa${YESTERDAY}"
REPORT="/tmp/perf_report_$(date -d yesterday +%Y-%m-%d).txt"

{
    echo "=== Performance Report for $(date -d yesterday +%Y-%m-%d) ==="
    echo ""
    echo "--- CPU Summary ---"
    sar -u -f "$SAFILE" | tail -5
    echo ""
    echo "--- Memory Summary ---"
    sar -r -f "$SAFILE" | tail -5
    echo ""
    echo "--- Disk I/O Summary ---"
    sar -b -f "$SAFILE" | tail -5
    echo ""
    echo "--- Peak Load ---"
    sar -q -f "$SAFILE" | sort -k5 -rn | head -5
} > "$REPORT"

cat "$REPORT"
```

`sar` is most valuable when you've already set it up before you need it. Running `sudo apt install sysstat` and enabling the service takes 30 seconds and gives you weeks of historical performance data to work with when problems inevitably occur.
