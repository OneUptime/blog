# How to Use sar for Historical Disk I/O Analysis on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, sar, sysstat, Disk I/O, Performance, Monitoring, Linux

Description: Learn how to use sar on RHEL to collect and analyze historical disk I/O statistics for performance troubleshooting and capacity planning.

---

While tools like `iostat` and `iotop` show you what is happening right now, `sar` (System Activity Reporter) collects and stores performance data over time. This historical data is invaluable for identifying patterns, correlating I/O spikes with events, and planning capacity upgrades. On RHEL, sar is part of the sysstat package and runs automatically once configured.

## Installing and Enabling sysstat

```bash
sudo dnf install sysstat
sudo systemctl enable --now sysstat
```

The sysstat service uses a cron job or systemd timer to collect data every 10 minutes by default. Data files are stored in `/var/log/sa/`.

## Verifying Data Collection

Check that data is being collected:

```bash
ls -l /var/log/sa/
```

You should see files like `sa04` (binary data) and `sar04` (text reports) where the number represents the day of the month.

## Viewing Current Day Disk I/O

```bash
sar -d
```

This shows block device statistics for today:

```text
12:00:01 AM       DEV       tps     rkB/s     wkB/s     dkB/s   areq-sz    aqu-sz     await     %util
12:10:01 AM    dev8-0     12.30     98.40     45.20      0.00     11.66      0.03      2.45      1.23
12:10:01 AM   dev8-16      3.20     25.60     12.80      0.00     12.00      0.01      3.12      0.45
```

## Understanding sar Disk Output

- **DEV** - Device identifier (dev major-minor)
- **tps** - Transfers per second
- **rkB/s** - Read kilobytes per second
- **wkB/s** - Write kilobytes per second
- **areq-sz** - Average request size in kilobytes
- **aqu-sz** - Average queue length
- **await** - Average wait time in milliseconds
- **%util** - Device utilization percentage

## Using Human-Readable Device Names

Add the `-p` flag for pretty device names:

```bash
sar -dp
```

This shows `sda`, `sdb`, `nvme0n1` instead of `dev8-0`.

## Viewing Historical Data

View data from a specific day:

```bash
sar -dp -f /var/log/sa/sa02
```

This shows disk I/O from the 2nd of the current month.

## Filtering by Time Range

View data between specific hours:

```bash
sar -dp -s 09:00:00 -e 17:00:00
```

Combine with a historical file:

```bash
sar -dp -f /var/log/sa/sa02 -s 14:00:00 -e 16:00:00
```

## Viewing I/O Wait Statistics

CPU-level I/O wait information:

```bash
sar -u
```

Look for the `%iowait` column. Consistent values above 20% suggest disk I/O bottlenecks.

## Viewing All I/O Statistics Together

```bash
sar -b
```

This shows overall I/O statistics:

- **bread/s** - Blocks read per second
- **bwrtn/s** - Blocks written per second
- **tps** - Total transfers per second
- **rtps** - Read transfers per second
- **wtps** - Write transfers per second

## Exporting Data for Analysis

Export to a delimited format:

```bash
sadf -d /var/log/sa/sa04 -- -dp > disk_io_data.csv
```

Export in JSON format:

```bash
sadf -j /var/log/sa/sa04 -- -dp > disk_io_data.json
```

## Configuring Collection Interval

To change from the default 10-minute interval to 1-minute:

```bash
sudo vi /etc/systemd/system/sysstat-collect.timer.d/override.conf
```

```ini
[Timer]
OnCalendar=
OnCalendar=*:0/1
```

Reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart sysstat-collect.timer
```

## Configuring Data Retention

By default, sysstat keeps 28 days of data. Change this in:

```bash
sudo vi /etc/sysstat/sysstat
```

Set the `HISTORY` variable:

```text
HISTORY=90
```

## Analyzing Trends

Find the busiest times for disk I/O:

```bash
sar -dp -f /var/log/sa/sa04 | sort -k5 -rn | head -10
```

This sorts by write throughput and shows the top 10 periods.

## Creating Weekly Reports

```bash
#!/bin/bash
REPORT_DIR="/var/log/sa/reports"
mkdir -p "$REPORT_DIR"

for day in $(seq 1 7); do
    FILE="/var/log/sa/sa$(printf '%02d' $day)"
    if [ -f "$FILE" ]; then
        sar -dp -f "$FILE" >> "$REPORT_DIR/weekly_disk_io.txt"
    fi
done
```

## Summary

The `sar` command on RHEL provides historical disk I/O data essential for trend analysis and capacity planning. Enable the sysstat service to start collecting data, use `sar -dp` for readable device statistics, and export with `sadf` for detailed analysis. Historical data helps you correlate I/O patterns with application behavior and plan infrastructure upgrades based on actual usage trends rather than guesswork.
