# How to View Podman Container Logs with journalctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, journalctl, Logging

Description: Learn how to view and filter Podman container logs using journalctl when containers run as systemd services.

---

> Access structured, filterable Podman container logs through journalctl when your containers run as systemd services with the journald log driver.

When Podman containers run as systemd services, their output is captured by the systemd journal. This gives you powerful filtering, time-based queries, and structured log access through `journalctl`.

---

## Basic Log Viewing

```bash
# View all logs for a container service

journalctl --user -u webapp.service

# Follow logs in real time (like tail -f)
journalctl --user -u webapp.service -f

# Show the last 50 lines
journalctl --user -u webapp.service -n 50
```

## Time-Based Filtering

```bash
# Logs since the last boot
journalctl --user -u webapp.service -b

# Logs from the last 30 minutes
journalctl --user -u webapp.service --since "30 minutes ago"

# Logs from a specific time range
journalctl --user -u webapp.service --since "2026-03-17 10:00:00" --until "2026-03-17 12:00:00"

# Logs from today only
journalctl --user -u webapp.service --since today
```

## Priority Filtering

```bash
# Show errors and higher-priority messages
journalctl --user -u webapp.service -p err

# Show warnings and above
journalctl --user -u webapp.service -p warning

# Show critical and higher-priority messages
journalctl --user -u webapp.service -p crit
```

## Output Formatting

```bash
# One-line JSON per entry
journalctl --user -u webapp.service -o json

# Pretty-printed JSON
journalctl --user -u webapp.service -o json-pretty

# Short format with timestamps
journalctl --user -u webapp.service -o short-iso

# Verbose format with all fields
journalctl --user -u webapp.service -o verbose

# Plain text without metadata
journalctl --user -u webapp.service -o cat
```

## Filtering by Container Name

```bash
# Filter by Podman container name
journalctl --user CONTAINER_NAME=webapp

# Combine with service filter
journalctl --user -u webapp.service CONTAINER_NAME=webapp

# Filter by container ID
journalctl --user CONTAINER_ID=abc123def456
```

## Searching Log Content

```bash
# Search for specific text (grep-like)
journalctl --user -u webapp.service -g "ERROR"

# Case-insensitive search
journalctl --user -u webapp.service -g "error|warning" --case-sensitive=no

# Combine with time filter
journalctl --user -u webapp.service -g "connection refused" --since "1 hour ago"
```

## Viewing Logs for Multiple Services

```bash
# View logs for multiple services interleaved
journalctl --user -u database.service -u api.service -u webapp.service

# Follow multiple services
journalctl --user -u database.service -u api.service -f
```

## Log Disk Usage

```bash
# Check how much disk space logs use
journalctl --user --disk-usage

# Rotate and clean old logs
journalctl --user --rotate
journalctl --user --vacuum-time=7d
journalctl --user --vacuum-size=500M
```

## Summary

journalctl provides powerful log access for Podman containers running as systemd services. Filter by time, priority, container name, and text patterns. Use JSON output for parsing, follow logs in real time, and combine logs from multiple services for correlated debugging. The journal automatically manages log rotation and disk usage.
