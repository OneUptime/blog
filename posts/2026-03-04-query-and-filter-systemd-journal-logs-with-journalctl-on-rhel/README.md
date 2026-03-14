# How to Query and Filter systemd Journal Logs with journalctl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Journalctl, Systemd, Logging, Journal, Troubleshooting

Description: Master journalctl on RHEL to query, filter, and search systemd journal logs by service, time range, priority, and other criteria for fast troubleshooting.

---

The systemd journal collects log data from the kernel, services, and applications. The `journalctl` command is the primary tool for querying this data on RHEL. Knowing how to filter and search effectively saves significant time when troubleshooting.

## Basic Queries

```bash
# Show all journal entries (oldest first)
journalctl

# Show entries in reverse order (newest first)
journalctl -r

# Show only the last 50 entries
journalctl -n 50

# Show entries from the current boot
journalctl -b

# Show entries from the previous boot
journalctl -b -1
```

## Filter by Service Unit

```bash
# Show logs for a specific service
journalctl -u sshd.service

# Show logs for multiple services
journalctl -u httpd.service -u mariadb.service

# Show logs for a service since the last boot
journalctl -u nginx.service -b
```

## Filter by Time Range

```bash
# Show logs since a specific date and time
journalctl --since "2025-01-15 08:00:00"

# Show logs between two timestamps
journalctl --since "2025-01-15 08:00:00" --until "2025-01-15 12:00:00"

# Show logs from the last hour
journalctl --since "1 hour ago"

# Show logs from today only
journalctl --since today
```

## Filter by Priority

```bash
# Priority levels: emerg(0), alert(1), crit(2), err(3),
#                  warning(4), notice(5), info(6), debug(7)

# Show only error messages and above
journalctl -p err

# Show only critical and emergency messages
journalctl -p crit

# Show warnings for a specific service
journalctl -u httpd.service -p warning
```

## Filter by Process, User, or Group

```bash
# Show logs for a specific PID
journalctl _PID=1234

# Show logs for a specific user (by UID)
journalctl _UID=1000

# Show logs from a specific executable
journalctl _EXE=/usr/sbin/sshd
```

## Search and Output Formats

```bash
# Search for a string using grep (pipe output)
journalctl -u sshd | grep "Failed password"

# Output in JSON format for parsing
journalctl -u sshd -o json-pretty -n 5

# Output as a short format with full timestamps
journalctl -o short-full

# Show kernel messages only (like dmesg)
journalctl -k
```

## Combine Filters

```bash
# SSH errors since this morning
journalctl -u sshd.service -p err --since today

# All authentication failures in the last 24 hours
journalctl -t sshd --since "24 hours ago" | grep "authentication failure"

# Disk-related kernel messages from this boot
journalctl -k -b | grep -i "disk\|sd[a-z]\|nvme"
```

## Check Disk Usage

```bash
# See how much disk space the journal uses
journalctl --disk-usage
```

These filtering techniques let you quickly narrow down to the exact log entries you need instead of scrolling through thousands of lines of irrelevant output.
