# How to Audit User Login History on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Auditing, System Administration, Monitoring

Description: Learn how to audit and track user login history on Ubuntu using last, lastb, who, w, and journalctl, including how to detect suspicious access patterns.

---

Reviewing login history is a routine part of security auditing and incident response. Ubuntu provides several tools for this, each drawing from different log sources and showing different angles of the same picture. Knowing which tool to reach for and how to interpret the output saves time when you need answers fast.

## The Key Log Files

Login data on Ubuntu comes from a few sources:

- `/var/log/wtmp` - binary file recording all logins and logouts (read by `last`)
- `/var/log/btmp` - binary file recording failed login attempts (read by `lastb`)
- `/var/log/lastlog` - binary file with the most recent login for each UID (read by `lastlog`)
- `/var/log/auth.log` - text log of authentication events, PAM messages, sudo usage
- systemd journal - contains all of the above plus more, queryable with `journalctl`

## Viewing Recent Logins with last

`last` reads `/var/log/wtmp` and prints a list of recent logins in reverse chronological order:

```bash
last
```

Example output:

```text
alice    pts/1        192.168.1.42     Mon Mar  2 09:15   still logged in
bob      pts/0        10.0.0.5         Mon Mar  2 08:30 - 09:00  (00:30)
root     tty1                          Sun Mar  1 23:45 - 00:02  (00:17)
alice    pts/2        192.168.1.42     Sun Mar  1 18:00 - 20:30  (02:30)
reboot   system boot  5.15.0-91        Sun Mar  1 22:00
```

### Useful last options

```bash
# Show logins for a specific user only
last alice

# Show a limited number of entries
last -n 20

# Show full hostname instead of truncating
last -F

# Show IP addresses instead of hostnames
last -i

# Show logins since a specific date
last --since "2026-02-01"

# Filter by terminal (pts/0 = first SSH session, tty1 = console)
last pts/0
```

### Checking when the system was last rebooted

`last` also records reboots:

```bash
last reboot
# Shows every time the system was rebooted and how long it ran between reboots
```

## Checking Failed Login Attempts with lastb

`lastb` reads `/var/log/btmp` and shows failed authentication attempts. This requires root:

```bash
sudo lastb
```

Example output:

```text
admin    ssh:notty    203.0.113.45     Mon Mar  2 03:15 - 03:15  (00:00)
root     ssh:notty    203.0.113.45     Mon Mar  2 03:14 - 03:14  (00:00)
ubuntu   ssh:notty    198.51.100.22    Mon Mar  2 03:13 - 03:13  (00:00)
```

A flood of failed attempts from the same IP is a brute force scan. Check for volume:

```bash
# Count failed attempts per source IP
sudo lastb --ip | awk '{print $3}' | sort | uniq -c | sort -rn | head -20
```

## Currently Logged-In Users with who and w

```bash
# Show who is currently logged in
who
```

Output:

```text
alice    pts/0        2026-03-02 09:15 (192.168.1.42)
bob      pts/1        2026-03-02 08:30 (10.0.0.5)
```

`w` gives more detail, including what command each logged-in user is running:

```bash
w
```

Output:

```text
 09:30:00 up 10:45,  2 users,  load average: 0.12, 0.08, 0.05
USER     TTY      FROM             LOGIN@   IDLE JCPU   PCPU WHAT
alice    pts/0    192.168.1.42     09:15    2:00  0.05s  0.02s bash
bob      pts/1    10.0.0.5         08:30    1:00  0.10s  0.05s vim /etc/nginx/nginx.conf
```

## Most Recent Login per User with lastlog

```bash
lastlog
```

Shows the last login time and source for every user account on the system, including service accounts. The "**Never logged in**" entries are important to notice - they represent accounts that could potentially be used but haven't been yet.

```bash
# Show only users who have logged in
lastlog | grep -v "Never logged in"

# Check a specific user
lastlog -u alice
```

## Querying with journalctl

The systemd journal captures authentication events with more context than the binary log files:

```bash
# Show all authentication-related log entries
sudo journalctl -u ssh --since "yesterday"

# Show failed SSH login attempts
sudo journalctl _SYSTEMD_UNIT=ssh.service | grep "Failed password"

# Show successful SSH logins
sudo journalctl _SYSTEMD_UNIT=ssh.service | grep "Accepted"

# Login events for a specific user
sudo journalctl _SYSTEMD_UNIT=ssh.service | grep "alice"
```

## Reading auth.log Directly

For text-based log parsing, `/var/log/auth.log` is the source:

```bash
# All sudo usage in the last 24 hours
sudo grep "sudo" /var/log/auth.log | tail -50

# Failed SSH authentication attempts
sudo grep "Failed password" /var/log/auth.log | tail -30

# Successful SSH logins
sudo grep "Accepted password\|Accepted publickey" /var/log/auth.log

# Invalid usernames attempted
sudo grep "Invalid user" /var/log/auth.log | awk '{print $8}' | sort | uniq -c | sort -rn
```

## Building a Login Audit Report

For periodic auditing, a script that pulls together the key information:

```bash
#!/bin/bash
# Login audit summary script

echo "=== Login Audit Report ==="
echo "Generated: $(date)"
echo ""

echo "--- Recent successful logins (last 7 days) ---"
last --since "7 days ago" | grep -v "^$\|^wtmp" | head -30
echo ""

echo "--- Failed login attempts (top 10 source IPs) ---"
sudo lastb --ip 2>/dev/null | awk '{print $3}' | \
    grep -v "^$" | sort | uniq -c | sort -rn | head -10
echo ""

echo "--- Currently logged-in users ---"
w
echo ""

echo "--- Users who have never logged in ---"
lastlog | grep "Never logged in" | awk '{print $1}'
echo ""

echo "--- Recent sudo commands ---"
sudo grep "COMMAND" /var/log/auth.log | tail -20
```

## Detecting Anomalous Login Patterns

Things to look for during an audit:

```bash
# Logins at unusual hours (midnight to 6am)
sudo grep "Accepted" /var/log/auth.log | \
    awk '{print $1, $2, $3, $9}' | \
    awk '$3 ~ /^0[0-6]:/' | head -20

# Logins from unexpected geographic regions (check IPs against known ranges)
last -i | awk '{print $3}' | grep -v "^$\|^::" | sort -u

# Multiple users logging in from the same IP
last -i | awk '{print $3}' | sort | uniq -c | sort -rn | head -10

# Root logins via SSH (should be disabled but worth checking)
sudo grep "Accepted.*root" /var/log/auth.log
```

## Log Rotation and History Depth

The binary log files are rotated by `logrotate`. Check how long history is retained:

```bash
cat /etc/logrotate.d/wtmp
cat /etc/logrotate.d/btmp
```

By default, `wtmp` rotates monthly and keeps one archive. To retain more history:

```bash
sudo nano /etc/logrotate.d/wtmp
```

```text
/var/log/wtmp {
    missingok
    monthly
    rotate 12    # Keep 12 months instead of 1
    create 0664 root utmp
    minsize 1M
}
```

For security-sensitive environments, consider shipping logs to a remote syslog server so local tampering doesn't erase the audit trail. Login audit data is only useful if it's preserved and reviewed regularly.
