# How to Configure ausearch for Searching Audit Logs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, auditd, Compliance, Linux

Description: Master ausearch on Ubuntu to efficiently query and analyze audit logs, using filters for time, users, system calls, and keys to investigate security events.

---

`ausearch` is the standard tool for querying the Linux Audit System's logs. While `grep` can technically search audit log files, `ausearch` understands the audit log format and provides semantic filtering - search by user, syscall, time window, or key label - and can produce human-readable output by translating UIDs to usernames and syscall numbers to names.

This guide covers ausearch thoroughly, from basic queries to complex multi-filter searches, and shows how to use `aureport` for summary views.

## Basic ausearch Usage

The audit log lives at `/var/log/audit/audit.log`. ausearch always reads from this log by default. All searches require root or the `adm` group membership:

```bash
# Show all audit events (extremely verbose)
sudo ausearch

# Show only recent events (last 10 minutes is the default for -ts recent)
sudo ausearch -ts recent

# Show events from the last hour
sudo ausearch -ts today

# Show events with human-readable output (-i interprets UIDs, syscalls, etc.)
sudo ausearch -ts recent -i
```

## Filtering by Time

Time filtering is one of the most important ausearch capabilities for incident investigation:

```bash
# Preset time keywords
sudo ausearch -ts today           # Events since midnight today
sudo ausearch -ts yesterday       # Events yesterday
sudo ausearch -ts recent          # Events in last 10 minutes
sudo ausearch -ts week-ago        # Events from one week ago to now
sudo ausearch -ts month-ago       # Events from one month ago to now
sudo ausearch -ts checkpoint      # Events since last time checkpoint was set

# Explicit start time
sudo ausearch -ts "2026-03-01 08:00:00"

# Time range with start and end
sudo ausearch -ts "2026-03-01 08:00:00" -te "2026-03-01 09:00:00"

# Short date format
sudo ausearch -ts 03/01/2026 -te 03/02/2026
```

## Filtering by Key Label

Keys are the most common search method when you have named rules:

```bash
# Search by key label (set with -k in audit rules)
sudo ausearch -k identity-files
sudo ausearch -k ssh-config
sudo ausearch -k setuid-execution

# Combine key with time filter
sudo ausearch -k identity-files -ts today

# Combine key with interpretation
sudo ausearch -k setuid-execution -ts recent -i
```

## Filtering by User

```bash
# Search by effective user ID
sudo ausearch -ua admin
sudo ausearch -ua 1001

# Search by real user ID (the user who ran the command, before setuid)
sudo ausearch -ui 1001

# Search by login UID (the UID used to log in, even if su was used after)
sudo ausearch --loginuid 1001

# Find all events by username (resolves name to UID internally)
sudo ausearch -ua www-data -ts today
```

## Filtering by System Call

```bash
# Search for specific syscall events
sudo ausearch -sc execve
sudo ausearch -sc open
sudo ausearch -sc connect

# Combine with user filter
sudo ausearch -sc execve -ua 1001 -ts today

# Syscall by number
sudo ausearch -sc 59    # 59 = execve on x86_64
```

## Filtering by Process

```bash
# Search by process ID
sudo ausearch -p 5678

# Search by parent process ID
sudo ausearch --ppid 1234

# Search by executable path
sudo ausearch -x /usr/bin/wget

# Search by command name
sudo ausearch -c bash

# Combine for specific context
sudo ausearch -c python3 -ts today -i
```

## Filtering by Event Type

```bash
# Search for specific audit record types
sudo ausearch -m SYSCALL
sudo ausearch -m USER_AUTH
sudo ausearch -m USER_LOGIN
sudo ausearch -m USER_LOGOUT
sudo ausearch -m ADD_USER
sudo ausearch -m DEL_USER
sudo ausearch -m ANOM_LOGIN_FAILURES
sudo ausearch -m AVC    # SELinux denials

# List all event types
sudo ausearch -m help 2>&1 | head -30

# Combine message type with time
sudo ausearch -m USER_LOGIN -ts today -i
```

## Filtering by Exit Code

```bash
# Search for failed syscalls (exit code != 0)
sudo ausearch --exit -13    # EACCES - permission denied
sudo ausearch --exit -2     # ENOENT - no such file or directory
sudo ausearch --exit -1     # EPERM - operation not permitted

# Find all failed operations
sudo ausearch -ts today --exit -1

# Combine with syscall
sudo ausearch -sc open --exit -13 -ts today -i
```

This is useful for finding unauthorized access attempts - if someone tries to read `/etc/shadow` and fails, the exit code will be -13 (EACCES).

## Combining Multiple Filters

Multiple filters are combined with AND logic by default:

```bash
# Find execve calls by user 1001 that failed today
sudo ausearch -sc execve -ua 1001 --exit -1 -ts today -i

# Find all login failures
sudo ausearch -m USER_AUTH -ts today --exit -1 -i

# Find sudo usage by a specific user
sudo ausearch -k sudoers-change -ua admin -ts week-ago

# Find all events from a login session
sudo ausearch -se 42 -i    # Session ID 42
```

## Output Formatting

```bash
# Default: show raw audit records
sudo ausearch -k identity-files -ts recent

# Interpreted output (translate UIDs, syscalls, etc.)
sudo ausearch -k identity-files -ts recent -i

# Show only events where the operation succeeded
sudo ausearch -k identity-files -ts recent --success yes

# Show only failed events
sudo ausearch -k identity-files -ts recent --success no

# Output in column format (easier to parse with awk)
sudo ausearch -k identity-files -ts recent -m SYSCALL --format csv

# Minimal context (less output per event)
sudo ausearch -ts recent -i --format text
```

## Using aureport for Summary Views

`aureport` generates statistical reports from audit logs and complements ausearch:

```bash
# Overall summary
sudo aureport --summary

# Failed authentication events
sudo aureport --auth --failed

# Executable report (what programs ran)
sudo aureport --executable

# Login report
sudo aureport --login

# Syscall report with counts
sudo aureport --syscall

# Key report (events grouped by key label)
sudo aureport --key

# User report
sudo aureport --user

# File access report
sudo aureport --file

# Report for a specific time period
sudo aureport --start today --end now --summary

# Top 10 most active files
sudo aureport --file --summary | head -15
```

## Searching Rotated Logs

By default, ausearch only reads the current log file. To search rotated logs:

```bash
# Search all rotated log files in addition to current
sudo ausearch -if /var/log/audit/audit.log.1

# Search a specific log file
sudo ausearch -if /var/log/audit/audit.log.2

# Search across multiple logs with a loop
for log in /var/log/audit/audit.log*; do
    echo "=== Searching $log ==="
    sudo ausearch -if "$log" -k setuid-execution -ts "2026-02-01" 2>/dev/null
done
```

## Practical Investigation Workflows

### Investigating a Compromise

When investigating a potential compromise, start with a timeline:

```bash
# 1. Find all logins in the suspected timeframe
sudo ausearch -m USER_LOGIN -ts "2026-03-01 00:00:00" -te "2026-03-01 23:59:59" -i

# 2. Find all commands run by the suspicious user
sudo ausearch -sc execve -ua suspectuser -ts "2026-03-01" -i

# 3. Find what files they accessed
sudo ausearch -ua suspectuser -m PATH -ts "2026-03-01" -i

# 4. Check for privilege escalation
sudo ausearch -k setuid-execution -ua suspectuser -ts "2026-03-01" -i

# 5. Find any downloads or network connections
sudo ausearch -sc connect -ua suspectuser -ts "2026-03-01" -i
```

### Monitoring for Brute Force Attempts

```bash
# Find failed logins
sudo ausearch -m USER_AUTH --success no -ts today -i | grep -A 5 "USER_AUTH"

# Count failures per source
sudo ausearch -m USER_AUTH --success no -ts today | grep "addr=" | sort | uniq -c | sort -rn | head -10

# Use aureport for a cleaner view
sudo aureport --auth --failed --start today
```

### Verifying Compliance

For PCI DSS requirement of logging privileged user access:

```bash
# Report all root commands executed today
sudo ausearch -sc execve -ua root -ts today -i | grep "comm="

# All sudo uses
sudo ausearch -k sudoers-change -ts today -i

# All changes to sensitive files
sudo ausearch -k identity-files -ts this-week -i
```

## Writing ausearch Output to Files

```bash
# Save results to a file
sudo ausearch -k setuid-execution -ts today -i > /tmp/setuid-audit.txt

# Append to an investigation log
sudo ausearch -k identity-files -ts recent -i >> /tmp/investigation-$(date +%Y%m%d).txt

# Generate a CSV report
sudo ausearch -ts today -m SYSCALL --format csv > /tmp/syscall-report.csv
```

## Troubleshooting ausearch

**No output from ausearch:** Verify auditd is running (`systemctl status auditd`) and that rules are loaded (`auditctl -l`). Check that the key or event type you are searching for actually has entries.

**Permission denied:** ausearch requires root or membership in the `adm` group. Add your user: `sudo usermod -a -G adm username`.

**Timestamps out of sync:** If system time was wrong when events were recorded, the `-ts` filter may miss them. Use a broader time range or remove the time filter.

**Too many events:** Use more specific filters (key + user + time) to narrow results. Consider piping through `head` or `grep` for specific patterns.

Efficient use of ausearch transforms raw audit logs into actionable security intelligence. The key to productive investigations is combining multiple filters and using `aureport` for high-level views before diving into individual events with `ausearch`.
