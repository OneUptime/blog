# How to Monitor System Performance with sysstat and sar on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Sysstat, Sar, Performance Monitoring, Linux, System Administration

Description: Learn how to install and use sysstat and sar on RHEL to collect and analyze system performance data over time.

---

The sysstat package provides tools for collecting, reporting, and archiving system performance data on RHEL. The `sar` command is the primary tool for reviewing historical performance metrics including CPU, memory, disk I/O, and network usage.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access

## Installing sysstat

Install the sysstat package:

```bash
sudo dnf install sysstat -y
```

Enable and start the data collection service:

```bash
sudo systemctl enable --now sysstat
```

## How sysstat Collects Data

The sysstat service runs a cron job (via systemd timer) every 10 minutes to collect system activity data. Data files are stored in `/var/log/sa/`:

```bash
ls /var/log/sa/
```

Files named `saDD` contain binary data for day DD. Files named `sarDD` contain text reports.

## Monitoring CPU Usage

View CPU usage for today:

```bash
sar -u
```

View CPU usage per core:

```bash
sar -P ALL
```

View CPU usage for a specific time range:

```bash
sar -u -s 09:00:00 -e 17:00:00
```

## Monitoring Memory Usage

View memory usage:

```bash
sar -r
```

This shows free memory, used memory, buffers, cached memory, and swap usage.

View swap usage specifically:

```bash
sar -S
```

## Monitoring Disk I/O

View disk I/O statistics:

```bash
sar -d
```

View specific device activity:

```bash
sar -d -p
```

The `-p` flag shows device names instead of device numbers.

## Monitoring Network Usage

View network interface statistics:

```bash
sar -n DEV
```

View network errors:

```bash
sar -n EDEV
```

View TCP statistics:

```bash
sar -n TCP
```

View socket statistics:

```bash
sar -n SOCK
```

## Monitoring Load Average

View system load averages:

```bash
sar -q
```

## Viewing Historical Data

View data from a previous day. The data files use the format `saDD`:

```bash
sar -u -f /var/log/sa/sa01
```

View yesterday's memory data:

```bash
sar -r -f /var/log/sa/sa$(date -d yesterday +%d)
```

## Real-Time Monitoring

Run sar in real-time mode with a 2-second interval for 10 samples:

```bash
sar -u 2 10
```

Monitor disk I/O in real time:

```bash
sar -d 2 10
```

## Using Other sysstat Tools

### iostat

View CPU and disk I/O statistics:

```bash
iostat -xz 2 5
```

### mpstat

View per-processor statistics:

```bash
mpstat -P ALL 2 5
```

### pidstat

Monitor individual process resource usage:

```bash
pidstat -u 2 5
pidstat -r 2 5
pidstat -d 2 5
```

### cifsiostat

Monitor CIFS filesystem statistics (if applicable):

```bash
cifsiostat 2 5
```

## Adjusting Collection Interval

Edit the sysstat timer to change the collection interval:

```bash
sudo systemctl edit sysstat-collect.timer
```

Add an override:

```ini
[Timer]
OnCalendar=
OnCalendar=*:0/5
```

This changes collection to every 5 minutes. Reload the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl restart sysstat-collect.timer
```

## Conclusion

The sysstat tools on RHEL provide essential historical performance data. Use sar for reviewing trends, iostat for disk performance, mpstat for CPU analysis, and pidstat for per-process monitoring. Regular data collection helps identify performance bottlenecks and capacity planning needs.
