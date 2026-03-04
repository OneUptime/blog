# How to Use ausearch and aureport to Analyze Audit Logs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, auditd, ausearch, aureport, Log Analysis, Security, Linux

Description: Master the ausearch and aureport tools on RHEL to search, filter, and generate reports from audit logs for security analysis and compliance.

---

The Linux audit system on RHEL generates detailed logs of system events, but the raw log format can be difficult to read. The `ausearch` and `aureport` tools are designed to make sense of these logs by searching for specific events and generating human-readable reports. This guide covers practical usage of both tools.

## Understanding the Audit Log Format

Before diving into the tools, it helps to understand what a raw audit log entry looks like:

```
type=SYSCALL msg=audit(1709568000.123:456): arch=c000003e syscall=257
success=yes exit=3 a0=ffffff9c a1=7ffd3c002000 a2=241 a3=1b6
items=2 ppid=1234 pid=5678 auid=1000 uid=0 gid=0 euid=0
comm="vim" exe="/usr/bin/vim" key="sshd_config"
```

The key fields are:
- `audit(1709568000.123:456)` - timestamp and event serial number
- `auid=1000` - audit user ID (original login user)
- `uid=0` - effective user ID
- `comm="vim"` - command name
- `key="sshd_config"` - the audit rule key that triggered this event

## ausearch: Searching Audit Logs

### Basic Search Operations

```bash
# Search for all events (shows everything)
sudo ausearch -m ALL

# Search for events by key name
sudo ausearch -k identity

# Search for events by message type
sudo ausearch -m USER_LOGIN

# Search for events related to a specific file
sudo ausearch -f /etc/passwd

# Search for events by a specific user (using audit UID)
sudo ausearch -ua 1000

# Search for events by effective user ID
sudo ausearch -ui 0
```

### Time-Based Searching

```bash
# Events from today
sudo ausearch -ts today

# Events from the last hour
sudo ausearch -ts recent

# Events from a specific date
sudo ausearch -ts 03/01/2026

# Events between two timestamps
sudo ausearch -ts 03/01/2026 08:00:00 -te 03/01/2026 17:00:00

# Events from this boot
sudo ausearch -ts boot
```

### Interpreting Results

The `-i` flag translates numeric values into human-readable names:

```bash
# Without -i: auid=1000 uid=0
# With -i: auid=jdoe uid=root
sudo ausearch -k identity -i

# Combine with time range
sudo ausearch -k identity -i -ts today
```

### Searching by Event Type

Common message types you might search for:

```bash
# Login events
sudo ausearch -m USER_LOGIN -ts today -i

# Authentication events
sudo ausearch -m USER_AUTH -ts today -i

# Failed login attempts
sudo ausearch -m USER_LOGIN -sv no -ts today -i

# System call events
sudo ausearch -m SYSCALL -k file_delete -ts today

# SELinux AVC denials
sudo ausearch -m AVC -ts today

# Account changes
sudo ausearch -m ADD_USER -m DEL_USER -m ADD_GROUP -m DEL_GROUP -ts today -i
```

### Combining Filters

You can combine multiple search criteria:

```bash
# File changes by a specific user today
sudo ausearch -f /etc/passwd -ua 1000 -ts today -i

# Failed system calls related to a specific key
sudo ausearch -k identity -sv no -ts today -i

# Specific syscall type
sudo ausearch -sc openat -k sshd_config -ts today
```

### Output Formats

```bash
# Raw format (default)
sudo ausearch -k identity

# Interpreted/human-readable
sudo ausearch -k identity -i

# Output in a format suitable for piping to audit2allow
sudo ausearch -m AVC --raw

# CSV-like format for processing
sudo ausearch -k identity --format csv
```

## aureport: Generating Audit Reports

`aureport` generates summary reports from the audit logs. It is useful for getting an overview of system activity.

### Summary Reports

```bash
# Overall summary of all audit events
sudo aureport --summary

# Summary for today only
sudo aureport --summary -ts today
```

### Authentication Reports

```bash
# Authentication report (all login attempts)
sudo aureport --auth

# Failed authentication attempts only
sudo aureport --auth --failed

# Login report
sudo aureport --login

# Failed logins
sudo aureport --login --failed -i
```

### File Access Reports

```bash
# File access summary
sudo aureport --file --summary

# Detailed file access report
sudo aureport --file -i

# Files accessed today
sudo aureport --file -ts today -i
```

### User Activity Reports

```bash
# Account modification report
sudo aureport --mods -i

# Report of commands executed (with sudo)
sudo aureport --comm -i

# Executable report
sudo aureport --executable -i
```

### System Call Reports

```bash
# System call report
sudo aureport --syscall

# System call summary
sudo aureport --syscall --summary

# Anomaly report (unusual events)
sudo aureport --anomaly
```

### Security Event Reports

```bash
# SELinux AVC report
sudo aureport --avc

# Crypto event report (TLS, SSH key exchange)
sudo aureport --crypto

# TTY keystroke report (if tty auditing is enabled)
sudo aureport --tty
```

## Practical Analysis Workflows

### Investigating a Security Incident

```bash
# Step 1: Get an overview of recent activity
sudo aureport --summary -ts today

# Step 2: Check for failed logins
sudo aureport --login --failed -ts today -i

# Step 3: Look at authentication events for a suspicious user
sudo ausearch -ua suspicious_user -ts today -i

# Step 4: Check what files they accessed
sudo ausearch -ua suspicious_user -m SYSCALL -ts today -i | grep -i "key="

# Step 5: Look at their command history
sudo ausearch -ua suspicious_user -m EXECVE -ts today -i
```

### Daily Security Review

```bash
#!/bin/bash
# /usr/local/bin/daily-audit-report.sh
# Generate a daily audit summary report

echo "=============================="
echo "Daily Audit Report - $(date +%Y-%m-%d)"
echo "=============================="

echo ""
echo "--- Event Summary ---"
sudo aureport --summary -ts yesterday -te today

echo ""
echo "--- Failed Logins ---"
sudo aureport --login --failed -ts yesterday -te today -i

echo ""
echo "--- Account Modifications ---"
sudo aureport --mods -ts yesterday -te today -i

echo ""
echo "--- File Access Events ---"
sudo aureport --file --summary -ts yesterday -te today

echo ""
echo "--- Anomalies ---"
sudo aureport --anomaly -ts yesterday -te today -i
```

### Finding Specific Events for Compliance

```bash
# Find all privilege escalation events
sudo ausearch -m USER_CMD -ts this-month -i

# Find all configuration file changes
sudo ausearch -k identity -k sudoers -k sshd_config -ts this-week -i

# Count events by type for the last month
sudo aureport --event --summary -ts this-month
```

## Tips and Best Practices

1. **Always use `-i` for human-readable output** when investigating events manually.
2. **Use time ranges** to limit output. Without them, you search the entire log history.
3. **Pipe to grep or less** for large result sets: `sudo ausearch -k identity -i | less`
4. **Use keys consistently** in your audit rules so you can search by key name.
5. **Automate daily reports** with a cron job or systemd timer.
6. **Archive audit logs** before they rotate so you can search historical data.

## Quick Reference

| Task | Command |
|------|---------|
| Search by key | `ausearch -k keyname` |
| Search by file | `ausearch -f /path/to/file` |
| Search by user | `ausearch -ua username` |
| Today's events | `ausearch -ts today` |
| Failed logins | `aureport --login --failed -i` |
| File access summary | `aureport --file --summary` |
| Overall summary | `aureport --summary` |
| Authentication report | `aureport --auth -i` |
| Account changes | `aureport --mods -i` |

## Summary

The `ausearch` and `aureport` tools are essential for making sense of audit logs on RHEL. Use `ausearch` for targeted searches when you know what you are looking for, and `aureport` for generating summary reports and getting an overview of system activity. Combine them into scripts for automated daily security reviews and incident investigation workflows.
