# How to Use nethogs for Per-Process Network Usage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Monitoring, Performance

Description: Learn how to install and use nethogs on Ubuntu to monitor real-time per-process network bandwidth usage and identify bandwidth-hungry applications.

---

When you notice your server's network interface is saturated but tools like `iftop` or `vnstat` only show totals by interface or host, what you really need is a per-process breakdown. That is exactly what `nethogs` provides - it groups network traffic by process, making it straightforward to identify which application is consuming your bandwidth.

## Installing nethogs

On Ubuntu, nethogs is available directly from the official repositories:

```bash
sudo apt update
sudo apt install nethogs -y
```

If you need a more recent version, the package is also available through the `nethogs` PPA or you can compile from source, but for most Ubuntu 22.04 and 24.04 users, the repository version works well.

Verify the installation:

```bash
nethogs --version
```

## Basic Usage

nethogs requires root or CAP_NET_ADMIN privileges because it uses raw socket capture under the hood. The simplest invocation is:

```bash
sudo nethogs
```

This will monitor all network interfaces and display a real-time table showing each process's sent and received bandwidth.

### Specifying an Interface

If your server has multiple network interfaces and you only care about traffic on `eth0` or `ens3`:

```bash
# Monitor a specific interface
sudo nethogs eth0

# Monitor multiple interfaces at once
sudo nethogs eth0 ens3
```

### Output Columns Explained

The nethogs display shows:

- **PID** - Process ID of the application
- **USER** - The user running the process
- **PROGRAM** - The executable path (full path helps identify the exact binary)
- **DEV** - Network device/interface being used
- **SENT** - Outbound traffic rate in KB/s or MB/s
- **RECEIVED** - Inbound traffic rate in KB/s or MB/s

## Interactive Controls

While nethogs is running, several keyboard shortcuts let you adjust the display:

| Key | Action |
|-----|--------|
| `m` | Cycle through display modes (KB/s, KB, B, MB) |
| `r` | Sort by received traffic |
| `s` | Sort by sent traffic |
| `q` | Quit nethogs |

The default sort is by sent traffic, which is often what you want when diagnosing an upstream bandwidth spike.

## Useful Command-Line Flags

### Refresh Rate

By default nethogs updates every second. For slower-moving traffic patterns you might prefer a longer interval:

```bash
# Refresh every 5 seconds
sudo nethogs -d 5 eth0
```

For rapid spikes, go lower:

```bash
# Refresh every 0.5 seconds (500ms)
sudo nethogs -d 0.5 eth0
```

### Setting a Threshold

To filter out processes with very low traffic and focus on the heavy hitters:

```bash
# Only show processes using more than 1 KB/s
sudo nethogs -v 1 eth0
```

### Tracing Mode

nethogs supports a tracing mode that outputs data in a machine-readable format, useful for logging or piping into other tools:

```bash
# Run in tracing mode (non-interactive, outputs to stdout)
sudo nethogs -t eth0
```

Tracing mode output looks like:

```
Refreshing:
/usr/bin/python3/1234/root	0.123	0.456
/usr/bin/rsync/5678/backup	25.301	0.012
```

This makes it easy to capture a session log:

```bash
# Log nethogs output for 60 seconds
sudo nethogs -t -d 2 eth0 | head -100 > /tmp/nethogs_capture.txt
```

## Practical Troubleshooting Scenarios

### Finding the Process Responsible for a Bandwidth Spike

Your monitoring system (such as [OneUptime](https://oneuptime.com/blog/post/how-to-monitor-network-bandwidth-on-ubuntu/view)) alerts you that `eth0` is at 90% capacity. Rather than guessing, run:

```bash
sudo nethogs eth0
```

Sort by sent (`s`) or received (`r`) and look at the top entry. In many cases, you will find it is a backup job (`rsync`, `duplicati`), a package update daemon, or an application pushing logs.

### Identifying Unexpected Outbound Connections

If a process is sending unusual amounts of data outbound, note the PID and investigate further:

```bash
# Get the PID from nethogs, then check its connections
sudo ss -tnp | grep <PID>

# See what files the process has open
sudo lsof -p <PID> | grep -E 'IPv4|IPv6'

# Check the process command line
cat /proc/<PID>/cmdline | tr '\0' ' '
```

### Monitoring During a Scheduled Job

Suppose you suspect a cron job is consuming bandwidth. Run nethogs right before the scheduled time:

```bash
# Start nethogs in tracing mode and log to a file
sudo nethogs -t -d 1 eth0 >> /var/log/nethogs_cron_monitor.log &

# Kill it after the cron window
sleep 300 && sudo pkill nethogs
```

Then review the log to see what process was active during the spike window.

## Persistent Monitoring with a Systemd Service

For ongoing visibility, you can run nethogs in tracing mode as a systemd service and rotate the logs with logrotate.

Create the service file:

```bash
sudo nano /etc/systemd/system/nethogs-monitor.service
```

```ini
[Unit]
Description=nethogs per-process network monitor
After=network.target

[Service]
Type=simple
# Monitor eth0 with 2-second refresh, output to log file
ExecStart=/bin/bash -c 'nethogs -t -d 2 eth0 >> /var/log/nethogs.log'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nethogs-monitor
```

Add a logrotate config to prevent the log from growing without bound:

```bash
sudo nano /etc/logrotate.d/nethogs
```

```
/var/log/nethogs.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

## Comparing nethogs with Similar Tools

| Tool | Granularity | Best For |
|------|-------------|----------|
| `nethogs` | Per-process | Finding which app uses bandwidth |
| `iftop` | Per-connection | Seeing which remote hosts are involved |
| `nload` | Per-interface | Quick bandwidth totals |
| `ss` / `netstat` | Per-socket | Detailed connection state |
| `tcpdump` | Per-packet | Deep packet inspection |

nethogs excels when you need to quickly answer "which process is eating my bandwidth" without wading through packet captures or connection tables.

## Troubleshooting nethogs Issues

### No Traffic Shown

If nethogs shows processes but all bandwidth reads zero, check that you are monitoring the correct interface:

```bash
# List interfaces with active traffic
ip -s link show
```

Also confirm nethogs has the right permissions. Some environments with AppArmor or seccomp restrictions may block raw socket access even for root. Check `dmesg` for denial messages.

### Process Shows as Unknown

When a process appears as `unknown TCP` or similar, it means nethogs could not map the socket to a process. This often happens with short-lived processes or kernel threads. Use `ss -tnp` during the event to capture the association before the process exits.

## Summary

nethogs fills a specific gap in the network monitoring toolkit. While interface-level monitors tell you how much traffic is flowing, only nethogs gives you the per-process breakdown that makes diagnosis fast. Install it, run it with the right interface, and within seconds you know exactly which application is responsible for your bandwidth consumption. For teams running production Ubuntu servers, combining nethogs with a platform like [OneUptime](https://oneuptime.com) for alerting gives you both the automated detection and the manual drill-down capability you need.
