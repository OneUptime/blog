# How to Read and Filter journalctl Logs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Systemd, Journalctl, System Administration

Description: Master journalctl on Ubuntu to efficiently query, filter, and analyze systemd journal logs using time ranges, service names, priority levels, and output formats.

---

`journalctl` is the command-line tool for querying the systemd journal. On Ubuntu systems running systemd (which is all modern Ubuntu versions), the journal collects logs from the kernel, systemd itself, and any service managed by systemd. Knowing how to filter and query these logs efficiently saves significant time during troubleshooting.

## Basic journalctl Usage

Without arguments, `journalctl` dumps the entire journal, oldest first:

```bash
# View all journal entries (press G to jump to end, q to quit)
journalctl

# Start at the most recent entries and follow new ones (like tail -f)
journalctl -f

# Show only the most recent entries
journalctl -n 50         # Last 50 lines
journalctl -n 100 -f    # Last 100 lines, then follow
```

## Filtering by Time

Time-based filtering is one of journalctl's most useful features:

```bash
# Show logs since a specific time
journalctl --since "2026-03-02 08:00:00"

# Show logs until a specific time
journalctl --until "2026-03-02 12:00:00"

# Combine both for a time range
journalctl --since "2026-03-02 08:00:00" --until "2026-03-02 10:00:00"

# Relative time references
journalctl --since "1 hour ago"
journalctl --since "2 days ago"
journalctl --since yesterday
journalctl --since today

# This morning to now
journalctl --since "$(date +%Y-%m-%d) 00:00:00"
```

## Filtering by Boot

Systemd tracks which boot each log entry came from:

```bash
# Show logs from the current boot only
journalctl -b

# Show logs from the previous boot
journalctl -b -1

# Show logs from two boots ago
journalctl -b -2

# List available boots with timestamps
journalctl --list-boots

# Show logs from a specific boot by its ID
journalctl -b 0     # Current boot
journalctl -b -3    # Three boots ago

# Combine with time filter
journalctl -b -1 --since "12:00:00" --until "14:00:00"
```

## Filtering by Service or Unit

```bash
# Show logs for a specific systemd service
journalctl -u nginx
journalctl -u nginx.service

# Follow a service's logs in real-time
journalctl -u nginx -f

# Multiple services at once
journalctl -u nginx -u mysql -u redis

# Show logs for a unit from the current boot
journalctl -u sshd -b

# Service logs since yesterday
journalctl -u postgresql --since yesterday
```

## Filtering by Priority Level

Journal entries have syslog-style priority levels:

| Level | Name | Examples |
|-------|------|---------|
| 0 | emerg | System unusable |
| 1 | alert | Immediate action required |
| 2 | crit | Critical conditions |
| 3 | err | Error conditions |
| 4 | warning | Warning conditions |
| 5 | notice | Normal but significant |
| 6 | info | Informational |
| 7 | debug | Debug messages |

```bash
# Show only errors and more severe (err, crit, alert, emerg)
journalctl -p err

# Show warnings and above
journalctl -p warning

# Show a range of priorities
journalctl -p warning..err

# Show only critical and above from the current boot
journalctl -b -p crit

# Very common: show all errors from the current boot
journalctl -b -p err
```

## Filtering by Process or PID

```bash
# Show logs from a specific PID
journalctl _PID=1234

# Show logs from a specific executable
journalctl _EXE=/usr/sbin/sshd

# Show logs from a specific command (without full path)
journalctl _COMM=sshd

# Show logs from a specific user
journalctl _UID=1000

# Find your user's UID
id -u
journalctl _UID=$(id -u)
```

## Searching Log Content

```bash
# journalctl can search through messages with grep
journalctl | grep -i "error\|fail"

# More efficiently, filter by priority and search
journalctl -b -p err | grep mysql

# Show context around matching lines
journalctl -b | grep -A 5 -B 2 "authentication failure"

# Case-insensitive search for a pattern
journalctl -b --grep="failed password" -i
# Note: --grep is a native journalctl feature in newer versions
```

## Output Format Options

journalctl supports multiple output formats:

```bash
# Default format (human-readable)
journalctl -u nginx

# Short format (most compact)
journalctl -o short

# Short with precise timestamps (microseconds)
journalctl -o short-precise

# JSON output (one JSON object per line - great for scripting)
journalctl -o json | head -5

# Pretty-printed JSON
journalctl -o json-pretty | head -30

# Show only message text (no metadata)
journalctl -o cat

# Verbose - show all fields for each entry
journalctl -o verbose | head -50
```

## Using JSON Output for Scripting

```bash
# Extract specific fields from journal entries
journalctl -u sshd -o json | \
    python3 -c "
import sys, json
for line in sys.stdin:
    try:
        entry = json.loads(line)
        if 'MESSAGE' in entry:
            print(f\"{entry.get('__REALTIME_TIMESTAMP','')} {entry['MESSAGE']}\")
    except:
        pass
" | head -20

# With jq (install: sudo apt install jq)
journalctl -u nginx -o json | jq -r '.__REALTIME_TIMESTAMP + " " + .MESSAGE' | head -20

# Extract only failed SSH attempts
journalctl -u sshd -o json | \
    jq -r 'select(.MESSAGE | test("Failed password")) | .MESSAGE'
```

## Showing Kernel Messages

```bash
# Show only kernel messages (equivalent to dmesg)
journalctl -k

# Kernel messages from current boot
journalctl -k -b

# Kernel messages from previous boot (useful after a crash)
journalctl -k -b -1

# Kernel errors only
journalctl -k -p err
```

## Combining Multiple Filters

Filters can be combined, but the logic matters:

```bash
# AND logic: service AND time range
journalctl -u nginx --since "1 hour ago"

# AND logic: service AND priority
journalctl -u mysql -p warning

# OR logic between same field (two _SYSTEMD_UNIT entries)
journalctl _SYSTEMD_UNIT=nginx.service _SYSTEMD_UNIT=mysql.service

# Complex combination
journalctl -u sshd -b -p warning --since "08:00" --until "18:00"
```

## Showing the Full Message

Sometimes messages are truncated:

```bash
# Disable truncation (show full lines)
journalctl --no-pager -u nginx | cat

# Or use output mode
journalctl -u nginx -o cat

# Set terminal width explicitly
COLUMNS=200 journalctl -u nginx
```

## Watching Multiple Services

```bash
# Watch all services matching a pattern
journalctl -f -u "nginx*"

# Watch system for any errors in real-time
journalctl -f -p warning

# Watch specific service with context
journalctl -f -u postgresql -n 20
```

## Disk Usage and Rotation

```bash
# Check how much disk space the journal uses
journalctl --disk-usage

# Verify journal location
ls -lh /var/log/journal/ 2>/dev/null || ls -lh /run/log/journal/

# Reduce journal size (removes old entries)
journalctl --vacuum-size=500M    # Keep only 500MB of logs
journalctl --vacuum-time=7d      # Keep only last 7 days
journalctl --vacuum-files=5      # Keep only 5 archive files
```

## Practical Troubleshooting Examples

```bash
# Investigate a service that recently crashed
journalctl -u myservice -b -p err

# Find what happened right before a crash
journalctl -b -1 --since "23:45:00" --until "23:59:59"

# SSH authentication failures in the last 24 hours
journalctl -u sshd --since "24 hours ago" | grep "Failed\|Invalid"

# Find out why a service failed to start
journalctl -u myservice.service | tail -50

# Check authentication events
journalctl -u systemd-logind --since today

# Find disk-related errors
journalctl -k -b | grep -i "I/O error\|EXT4-fs\|XFS"

# Network errors
journalctl -k -b | grep -i "link.*down\|NETDEV WATCHDOG"

# OOM killer events
journalctl -b | grep -i "oom\|killed process\|out of memory"
```

## Persistent vs. Volatile Logs

By default, Ubuntu may store journal logs in `/run/log/journal/` (volatile, lost on reboot) or `/var/log/journal/` (persistent). Check and configure:

```bash
# Check where logs are stored
ls /var/log/journal/ 2>/dev/null && echo "Persistent logging enabled" || echo "Volatile only"

# Enable persistent logging
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo journalctl --flush   # Move existing logs to persistent storage

# Restart journald
sudo systemctl restart systemd-journald

# Verify
journalctl --disk-usage
```

With persistent logging enabled, `journalctl -b -1` and other historical queries become available even after reboots.

Mastering these filters transforms journalctl from a firehose of log data into a precise diagnostic tool. The combination of time filtering, service filtering, and priority levels covers the vast majority of troubleshooting scenarios on Ubuntu systems.
