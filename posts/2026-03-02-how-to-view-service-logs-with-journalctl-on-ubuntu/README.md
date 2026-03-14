# How to View Service Logs with journalctl on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Journalctl, Logging, Linux

Description: Use journalctl on Ubuntu to view, filter, and search systemd service logs by service name, time range, priority level, and other criteria for effective log analysis.

---

`journalctl` is the command for reading logs from the systemd journal. On Ubuntu, most system services write their logs to the journal, which stores them in a structured binary format and provides powerful filtering capabilities. Understanding `journalctl` makes diagnosing service problems significantly faster than manually searching through text log files.

## Basic Usage

```bash
# View all journal entries (oldest first, paginated with 'less')
journalctl

# View in reverse chronological order (newest first)
journalctl -r

# Follow journal in real time (like tail -f)
journalctl -f

# Show the last N lines
journalctl -n 50
journalctl -n 100

# Show the last 50 lines and follow
journalctl -n 50 -f
```

## Filtering by Service

The most common operation is viewing logs for a specific service:

```bash
# View logs for a specific service (use the unit name)
journalctl -u nginx.service

# Short form also works
journalctl -u nginx

# View logs for multiple services
journalctl -u nginx -u postgresql

# Follow logs for a service
journalctl -u nginx -f

# Last 50 lines for a service
journalctl -u nginx -n 50

# View logs since last boot for a service
journalctl -u nginx -b
```

The `-u` flag is the most important filter for service debugging.

## Filtering by Time

```bash
# View logs from today
journalctl --since today

# View logs from the last hour
journalctl --since "1 hour ago"

# View logs between specific times
journalctl --since "2026-03-01 10:00:00" --until "2026-03-01 11:00:00"

# View logs from a specific date
journalctl --since "2026-03-01"

# View logs from the last 30 minutes
journalctl --since "30 minutes ago"

# Combine with service filter
journalctl -u nginx --since "2026-03-02 00:00:00" --until "2026-03-02 06:00:00"
```

## Filtering by Boot

```bash
# View logs from the current boot
journalctl -b

# View logs from the previous boot
journalctl -b -1

# View logs from two boots ago
journalctl -b -2

# List available boots with their identifiers and timestamps
journalctl --list-boots

# View logs for a specific boot by ID
journalctl -b 7d5...  # (use the ID from --list-boots)
```

This is extremely useful for debugging boot failures - you can look at logs from a previous failed boot.

## Filtering by Priority (Log Level)

Syslog priority levels from most to least critical:

```bash
# Show only emergency messages (level 0)
journalctl -p emerg

# Show errors and above (errors, critical, alert, emergency)
journalctl -p err

# Show warnings and above
journalctl -p warning

# Show notice and above (most verbose useful filter)
journalctl -p notice

# Levels: emerg(0), alert(1), crit(2), err(3), warning(4), notice(5), info(6), debug(7)

# Show all messages with this priority and higher
journalctl -p err -u nginx

# Range of priorities
journalctl -p err..warning
```

For finding problems quickly, start with `-p err` to see errors and critical issues.

## Output Formats

```bash
# Default output with color coding (where supported)
journalctl -u nginx

# Short format (timestamp, hostname, service, message)
journalctl -o short

# Verbose output (all fields)
journalctl -o verbose

# JSON output (one JSON object per log entry)
journalctl -o json

# Pretty-printed JSON
journalctl -o json-pretty

# Compact cat format (just the message, no metadata)
journalctl -o cat

# Export format (suitable for piping to journalctl --import)
journalctl -o export
```

JSON output is useful for programmatic processing:

```bash
# Extract only the message field with jq
journalctl -u nginx -o json | jq -r '.MESSAGE' | head -20

# Get entries with timestamps and messages
journalctl -u nginx -o json | jq -r '"\(.__REALTIME_TIMESTAMP) \(.MESSAGE)"' | head -20
```

## Searching Log Content

```bash
# journalctl does not have a built-in grep, but you can pipe to grep
journalctl -u nginx | grep "error"

# Case-insensitive search
journalctl -u nginx | grep -i "timeout"

# Multiple patterns
journalctl -u nginx | grep -E "error|warning|critical"

# Search across all services
journalctl | grep "Out of memory"

# Using grep with context
journalctl -u myapp | grep -A 5 "FAILED"
```

## Filtering by Process ID or User

```bash
# View logs from a specific process ID
journalctl _PID=1234

# View logs from a specific executable
journalctl _EXE=/usr/sbin/sshd

# View logs from a specific user (by UID)
journalctl _UID=1000

# View logs from the root user
journalctl _UID=0

# View kernel messages
journalctl -k

# View only syslog messages
journalctl SYSLOG_FACILITY=3
```

## Viewing Logs for Failed Services

```bash
# Find failed services first
systemctl --failed

# Then view their logs
journalctl -u failing-service.service -n 100

# View logs from last boot to see why it failed
journalctl -u failing-service.service -b

# Check if the service was killed by the OOM killer
journalctl -k | grep -i "oom\|killed"

# Check for segmentation faults
journalctl | grep "Segmentation fault\|core dumped"
```

## Disk Usage and Log Rotation

The journal has a maximum disk size configured in `/etc/systemd/journald.conf`:

```bash
# Check current disk usage
journalctl --disk-usage

# Rotate logs (archive old logs, start fresh)
sudo journalctl --rotate

# Delete logs older than 2 weeks
sudo journalctl --vacuum-time=2weeks

# Delete logs to reduce total size below 500MB
sudo journalctl --vacuum-size=500M

# Delete old archived journals, keeping the last N
sudo journalctl --vacuum-files=5
```

Configure persistent storage and size limits:

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# Store logs persistently on disk (default is "auto" which uses /var/log/journal if it exists)
Storage=persistent

# Maximum total size of all journal files
SystemMaxUse=2G

# Maximum size of individual journal files
SystemMaxFileSize=200M

# Keep at least this much free on the filesystem
SystemKeepFree=500M

# How long to keep old journal files
MaxRetentionSec=1month

# Verbosity of journal messages
MaxLevelStore=debug
MaxLevelSyslog=notice
```

```bash
sudo systemctl restart systemd-journald
```

## Practical Log Analysis Workflows

### Debugging a Service That Recently Failed

```bash
# 1. Check service status
sudo systemctl status myapp.service

# 2. View recent logs (last 100 lines)
journalctl -u myapp.service -n 100

# 3. See logs from the last time it failed
journalctl -u myapp.service -b | grep -A 10 -B 5 "failed"

# 4. Check if it was killed by signal
journalctl -u myapp.service | grep "killed\|signal\|exit"

# 5. Check system resources around the time of failure
journalctl --since "10 minutes ago" | grep -i "memory\|oom\|error"
```

### Monitoring Multiple Services

```bash
# Watch logs from several services simultaneously
journalctl -f -u nginx -u postgresql -u redis

# Filter for errors only across these services
journalctl -f -u nginx -u postgresql -p err
```

### Exporting Logs for Analysis

```bash
# Export last hour of nginx logs to a file
journalctl -u nginx --since "1 hour ago" > /tmp/nginx-last-hour.log

# Export to JSON for further processing
journalctl -u nginx --since "1 hour ago" -o json > /tmp/nginx.json

# Compress and archive
journalctl -u nginx --since "2026-03-01" -o export | xz -c > /tmp/nginx-march.log.xz
```

### Checking System Boot Time Issues

```bash
# Analyze the time spent starting services at boot
systemd-analyze

# See which services took the most time to start
systemd-analyze blame

# Graphical overview (generates an SVG)
systemd-analyze plot > /tmp/boot-analysis.svg

# View critical path in boot chain
systemd-analyze critical-chain
```

## Quick Reference

```bash
# Service logs, last 100 lines, follow
journalctl -u SERVICE -n 100 -f

# Service logs, errors only, this boot
journalctl -u SERVICE -p err -b

# All errors since yesterday
journalctl -p err --since yesterday

# Kernel messages from this boot
journalctl -k -b

# Check disk usage and clean up
journalctl --disk-usage
sudo journalctl --vacuum-time=4weeks
```

`journalctl` is far more capable than traditional syslog-style log management. The structured storage format means filtering is fast even across large log volumes, and the ability to filter by boot session is invaluable when diagnosing issues that require looking at what happened before a system restart.
