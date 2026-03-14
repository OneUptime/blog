# How to Search and Filter Logs with journalctl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Journalctl, Journald, Logging, Linux

Description: Master journalctl on RHEL to efficiently search, filter, and analyze system logs using time ranges, service filters, priority levels, and advanced query techniques.

---

journalctl is the command-line tool for querying the systemd journal on RHEL. It is much more powerful than simply reading flat log files because the journal stores structured data with metadata about each log entry. You can filter by time, service, priority, process ID, and even custom fields.

## Basic Usage

```bash
# View all journal entries (oldest first)
journalctl

# View the most recent entries first
journalctl -r

# Follow new log entries in real time (like tail -f)
journalctl -f

# Show only the last 50 entries
journalctl -n 50

# Show entries without paging (useful in scripts)
journalctl --no-pager -n 100
```

## Filtering by Time

### Absolute Time Ranges

```bash
# Logs from a specific date
journalctl --since "2026-03-01"

# Logs between two dates
journalctl --since "2026-03-01 08:00:00" --until "2026-03-01 18:00:00"

# Logs from a specific time today
journalctl --since "08:00" --until "12:00"
```

### Relative Time Ranges

```bash
# Logs from the last hour
journalctl --since "1 hour ago"

# Logs from the last 30 minutes
journalctl --since "30 min ago"

# Logs from yesterday
journalctl --since yesterday --until today

# Logs from the last 2 days
journalctl --since "2 days ago"
```

### Boot-Based Filtering

```bash
# Logs from the current boot only
journalctl -b

# Logs from the previous boot
journalctl -b -1

# Logs from two boots ago
journalctl -b -2

# List all available boots
journalctl --list-boots
```

## Filtering by Service

```bash
# Logs from a specific systemd unit
journalctl -u sshd

# Logs from multiple services
journalctl -u nginx -u php-fpm

# Logs from a service during a specific time
journalctl -u httpd --since "1 hour ago"

# Follow logs from a service in real time
journalctl -u myapp.service -f
```

## Filtering by Priority

Syslog priorities from 0 (most critical) to 7 (debug):

```mermaid
graph LR
    A[0 emerg] --> B[1 alert]
    B --> C[2 crit]
    C --> D[3 err]
    D --> E[4 warning]
    E --> F[5 notice]
    F --> G[6 info]
    G --> H[7 debug]
```

```bash
# Show only error-level messages and above
journalctl -p err

# Show only warnings and above
journalctl -p warning

# Show a range of priorities (warning through emergency)
journalctl -p warning..emerg

# Combine with service filter
journalctl -u nginx -p err

# Critical messages from the last hour
journalctl -p crit --since "1 hour ago"
```

## Filtering by Process and User

```bash
# Logs from a specific PID
journalctl _PID=1234

# Logs from a specific user
journalctl _UID=1000

# Logs from root (UID 0)
journalctl _UID=0

# Logs from a specific executable
journalctl _EXE=/usr/sbin/sshd

# Logs from a specific group
journalctl _GID=1000
```

## Filtering by Syslog Identifiers

```bash
# Logs from a specific syslog identifier (tag)
journalctl -t sudo

# Logs from kernel messages
journalctl -t kernel

# Logs from a custom application tag
journalctl -t myapp

# List all syslog identifiers in the journal
journalctl -F SYSLOG_IDENTIFIER
```

## Text Search with grep

```bash
# Search for a specific text pattern
journalctl --grep="Failed password"

# Case-insensitive search
journalctl --grep="error" --case-sensitive=no

# Combine grep with other filters
journalctl -u sshd --grep="Failed password" --since "1 hour ago"

# Search for regex patterns
journalctl --grep="(error|fail|timeout)"
```

## Output Formats

journalctl supports several output formats:

```bash
# Default short format
journalctl -o short

# Short format with precise timestamps
journalctl -o short-precise

# ISO 8601 timestamps
journalctl -o short-iso

# Full structured output
journalctl -o verbose

# JSON format (one entry per line)
journalctl -o json

# Pretty-printed JSON
journalctl -o json-pretty

# Export format (for machine processing)
journalctl -o export

# Catalog format (includes explanatory text)
journalctl -o cat
```

### Example: JSON Output

```bash
# Get the last 5 SSH-related entries in JSON
journalctl -u sshd -n 5 -o json-pretty
```

This produces output like:

```json
{
    "__CURSOR" : "s=abc123...",
    "PRIORITY" : "6",
    "_HOSTNAME" : "server1",
    "_SYSTEMD_UNIT" : "sshd.service",
    "SYSLOG_IDENTIFIER" : "sshd",
    "MESSAGE" : "Accepted publickey for admin from 192.168.1.10 port 54321",
    "_PID" : "12345",
    "__REALTIME_TIMESTAMP" : "1709528400000000"
}
```

## Advanced Filtering with Fields

```bash
# List all available field names
journalctl -N

# List all values for a specific field
journalctl -F _SYSTEMD_UNIT

# Filter by systemd unit type
journalctl _SYSTEMD_UNIT=nginx.service

# Combine multiple field filters (AND logic)
journalctl _SYSTEMD_UNIT=sshd.service _HOSTNAME=server1

# Filter by transport (how the message entered the journal)
journalctl _TRANSPORT=kernel
journalctl _TRANSPORT=audit
journalctl _TRANSPORT=syslog
```

## Practical Examples

### Find All Failed SSH Logins

```bash
journalctl -u sshd --grep="Failed password" --since "24 hours ago" --no-pager
```

### Find All Sudo Commands

```bash
journalctl -t sudo --no-pager --since "7 days ago"
```

### Find OOM Killer Events

```bash
journalctl -k --grep="Out of memory" --no-pager
```

### Find Service Crashes

```bash
journalctl -p err -u myapp.service --since "1 week ago" --no-pager
```

### Find All Disk Errors

```bash
journalctl -k --grep="(I/O error|sector|disk)" --no-pager
```

### Get a Count of Errors Per Service

```bash
# List services with errors in the last 24 hours
journalctl -p err --since "24 hours ago" -o json --no-pager | \
    python3 -c "
import sys, json
counts = {}
for line in sys.stdin:
    try:
        entry = json.loads(line)
        unit = entry.get('_SYSTEMD_UNIT', 'unknown')
        counts[unit] = counts.get(unit, 0) + 1
    except:
        pass
for unit, count in sorted(counts.items(), key=lambda x: -x[1]):
    print(f'{count:6d}  {unit}')
"
```

## Monitoring Disk Usage

```bash
# Check how much space the journal is using
journalctl --disk-usage

# Verify the journal files are healthy
journalctl --verify
```

## Summary

journalctl on RHEL provides powerful, structured log queries that go far beyond what plain text log files offer. The key filtering options are `-u` for services, `-p` for priority, `--since`/`--until` for time ranges, `-b` for boot sessions, and `--grep` for text search. Use `-o json-pretty` for structured output and combine filters to narrow down exactly the log entries you need.
