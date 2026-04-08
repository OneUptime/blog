# How to Read and Interpret Ceph Log Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Log, Troubleshooting, Debug

Description: Learn how to find, read, and interpret Ceph log files to identify OSD crashes, monitor warnings, slow requests, and PG state transitions.

---

Ceph generates detailed logs across monitors, OSDs, and managers. Knowing where to look and how to interpret what you find is fundamental to effective troubleshooting.

## Log File Locations

By default, Ceph writes logs to `/var/log/ceph/`:

```bash
ls /var/log/ceph/
# ceph.log          - cluster log
# ceph-mon.hostname.log  - per-monitor log
# ceph-osd.N.log    - per-OSD log
# ceph-mgr.hostname.log  - manager log
```

## Reading the Cluster Audit Log

The cluster-wide log captures significant events:

```bash
# Last 100 lines
tail -100 /var/log/ceph/ceph.log

# Follow in real time
tail -f /var/log/ceph/ceph.log

# Filter for warnings and errors
grep -E "WRN|ERR|HEALTH_WARN|HEALTH_ERR" /var/log/ceph/ceph.log | tail -50
```

## Common Log Patterns and Their Meaning

Slow requests are one of the most common entries:

```text
2026-03-15 14:22:01.123 osd.3 slow request 30.234 seconds
```

This indicates an OSD took more than 30 seconds to handle a request - a sign of disk or network issues.

PG state changes appear like this:

```text
2026-03-15 14:23:11.456 pg 1.3 is active+recovering
2026-03-15 14:25:00.789 pg 1.3 is active+clean
```

OSD down/up events:

```bash
grep -E "osd\.[0-9]+ (down|up|out|in)" /var/log/ceph/ceph.log | tail -20
```

## Adjusting Log Verbosity

For deeper investigation, increase log level on a specific daemon:

```bash
# Increase OSD log verbosity (temporary, resets on restart)
ceph daemon osd.2 config set debug_osd 10
ceph daemon osd.2 config set debug_bluestore 10

# Reset after debugging
ceph daemon osd.2 config set debug_osd 1
```

## Using journalctl for Systemd-Managed Ceph

On systemd-based distributions:

```bash
# Follow OSD 0 logs
journalctl -u ceph-osd@0 -f

# Show errors from the last hour
journalctl -u "ceph-osd@*" --since "1 hour ago" -p err

# Show mon logs with timestamps
journalctl -u "ceph-mon@*" --since "2026-03-15 14:00" --until "2026-03-15 15:00"
```

## Searching for Specific Error Strings

```bash
# Find ENOSPC (no space left) errors
grep -i "ENOSPC\|no space" /var/log/ceph/ceph-osd.*.log

# Find authentication failures
grep -i "auth\|denied\|forbidden" /var/log/ceph/ceph.log

# Find crash backtraces
grep -A 20 "Assertion\|assert\|backtrace" /var/log/ceph/ceph-osd.0.log | head -60
```

## Summary

Ceph logs are stored per daemon under `/var/log/ceph/` and also accessible via `journalctl` on systemd systems. The most important patterns to watch for are slow requests, OSD state changes, and assertion failures. Temporarily increasing log verbosity with `ceph daemon` helps expose root causes that are not visible at the default log level.
