# How to Manage Systemd Journal Size on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Linux, Journal, Logging, DevOps, Server Administration, Disk Management

Description: A comprehensive guide to controlling systemd journal disk usage on Ubuntu through configuration, vacuuming, retention policies, and monitoring strategies.

---

Unmanaged systemd journals can silently consume gigabytes of disk space, leading to full filesystems, degraded performance, and even service outages. This guide covers everything you need to know about managing journal size on Ubuntu systems-from basic configuration to production-ready strategies.

## What is the Systemd Journal?

The systemd journal is a centralized logging system that collects and stores log data from the kernel, system services, and applications. Unlike traditional syslog, journald stores logs in a structured binary format, enabling powerful querying capabilities through `journalctl`.

Key characteristics of the systemd journal:

- **Binary format**: Logs are stored in `.journal` files, not plain text
- **Indexed storage**: Fast queries across millions of log entries
- **Automatic rotation**: Built-in log rotation without external tools
- **Metadata-rich**: Each entry includes timestamps, PIDs, UIDs, SELinux contexts, and more
- **Rate limiting**: Protects against log flooding from misbehaving services

Journal files are typically stored in `/var/log/journal/` (persistent) or `/run/log/journal/` (volatile/memory-based).

## Prerequisites

Before proceeding, ensure you have:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04/24.04 examples)
- Root or sudo access to the system
- Basic familiarity with the command line

Verify that systemd-journald is running on your system.

```bash
# Check if systemd-journald service is active
# The service should show "active (running)" status
systemctl status systemd-journald
```

## Checking Current Journal Size

Before making changes, understand your current disk usage. These commands reveal how much space journals are consuming.

```bash
# Display total disk usage of all journal files
# Shows both archived and active journals
journalctl --disk-usage
```

Sample output: `Archived and active journals take up 2.3G in the file system.`

For more detailed information about journal files, examine the storage directory directly.

```bash
# List journal files with sizes, sorted by modification time
# The machine-id subdirectory contains your system's journals
ls -lh /var/log/journal/*/

# Show total size of journal directory
du -sh /var/log/journal/
```

You can also check journal statistics including the number of entries and time span covered.

```bash
# Display comprehensive journal statistics
# Shows entry counts, data size, and time range
journalctl --header | head -50
```

## Understanding journald.conf Configuration

The main configuration file for systemd-journald is `/etc/systemd/journald.conf`. Changes here control storage behavior, size limits, and retention policies.

```bash
# View the current configuration with all options
# Lines starting with # are comments/defaults
cat /etc/systemd/journald.conf
```

To make changes, edit this file and restart the journal service.

```bash
# Open the configuration file for editing
# Use your preferred editor (nano, vim, etc.)
sudo nano /etc/systemd/journald.conf
```

After making changes, restart journald to apply them.

```bash
# Restart the journald service to apply configuration changes
# This is safe and does not lose existing logs
sudo systemctl restart systemd-journald

# Verify the service restarted successfully
systemctl status systemd-journald
```

## Size-Based Limits

Control journal size using these configuration options in `/etc/systemd/journald.conf`.

```ini
[Journal]
# Maximum disk space journals can use (hard limit)
# When reached, oldest entries are deleted to make room
SystemMaxUse=500M

# Keep at least this much free space on the filesystem
# Journals are trimmed when free space drops below this
SystemKeepFree=1G

# Maximum size of individual journal files before rotation
# Smaller values mean more frequent rotation
SystemMaxFileSize=50M

# Maximum disk space all journal files can use
# Alternative to SystemMaxUse for more explicit control
SystemMaxFiles=100
```

For systems using volatile (memory-based) storage, use the `Runtime` variants.

```ini
[Journal]
# Maximum memory for volatile journals (stored in /run)
# Important for systems without persistent storage
RuntimeMaxUse=100M

# Keep this much memory free when using volatile storage
RuntimeKeepFree=50M

# Maximum size of individual volatile journal files
RuntimeMaxFileSize=10M
```

Here is a complete example configuration for a production server with moderate logging needs.

```ini
[Journal]
# Store journals persistently on disk
Storage=persistent

# Limit total journal size to 1GB
SystemMaxUse=1G

# Ensure at least 2GB free space remains
SystemKeepFree=2G

# Rotate individual files at 100MB
SystemMaxFileSize=100M

# Compress journal files to save space
Compress=yes
```

## Time-Based Retention

Control how long logs are kept using time-based settings. These work alongside size limits-whichever triggers first causes deletion.

```ini
[Journal]
# Delete journal entries older than 2 weeks
# Accepts: s (seconds), min, h, d, w (weeks), month, year
MaxRetentionSec=2week

# Alternative: keep logs for 30 days
# MaxRetentionSec=30d

# For high-volume servers, keep only 7 days
# MaxRetentionSec=7d
```

Time-based retention is applied during rotation and vacuum operations, not continuously. Entries older than `MaxRetentionSec` are removed when the journal rotates or when you run vacuum commands.

## Vacuum Operations (Manual Cleanup)

When you need immediate disk space recovery, use vacuum commands. These are safe to run on production systems.

```bash
# Remove journal entries until total size is under 500MB
# This is the most common cleanup operation
sudo journalctl --vacuum-size=500M
```

```bash
# Remove journal entries older than 7 days
# Useful for keeping only recent logs
sudo journalctl --vacuum-time=7d
```

```bash
# Reduce to maximum 5 journal files
# Keeps the newest files, removes oldest
sudo journalctl --vacuum-files=5
```

You can combine vacuum options for more precise control.

```bash
# Remove entries older than 14 days AND keep under 1GB
# Both conditions are applied
sudo journalctl --vacuum-time=14d --vacuum-size=1G
```

To see what would be deleted without actually removing anything, there is no dry-run option, but you can check dates and sizes first.

```bash
# Check the date range of current journal entries
# Helps estimate what vacuum-time would remove
journalctl --list-boots
journalctl -o short-precise | head -1
journalctl -o short-precise | tail -1
```

## Persistent vs Volatile Storage

The `Storage` option in journald.conf determines where logs are stored.

```ini
[Journal]
# Options: volatile, persistent, auto, none

# volatile: Store only in memory (/run/log/journal/)
# Logs are lost on reboot - good for ephemeral systems
Storage=volatile

# persistent: Always store on disk (/var/log/journal/)
# Logs survive reboots - recommended for most servers
Storage=persistent

# auto: Use /var/log/journal/ if it exists, otherwise volatile
# Default behavior on most Ubuntu installations
Storage=auto

# none: Disable journal storage entirely
# Logs are only forwarded to other targets (syslog, console)
Storage=none
```

To switch from volatile to persistent storage, create the journal directory.

```bash
# Create the persistent journal directory
# journald will automatically start using it
sudo mkdir -p /var/log/journal

# Set correct ownership and permissions
sudo systemd-tmpfiles --create --prefix /var/log/journal

# Restart journald to apply the change
sudo systemctl restart systemd-journald

# Verify persistent storage is now active
journalctl --disk-usage
ls -la /var/log/journal/
```

For containers or systems where logs should not persist, switch to volatile.

```bash
# Ensure volatile storage is configured
# Edit /etc/systemd/journald.conf and set Storage=volatile

# Remove existing persistent journals (optional, frees disk space)
sudo rm -rf /var/log/journal/*

# Restart journald
sudo systemctl restart systemd-journald
```

## Rate Limiting Configuration

Rate limiting prevents a single service from flooding the journal. Configure these settings to protect against runaway logging.

```ini
[Journal]
# Maximum log entries per interval from a single service
# Default is 10000 entries per 30 seconds
RateLimitIntervalSec=30s
RateLimitBurst=10000

# For stricter rate limiting on high-security systems
# RateLimitIntervalSec=10s
# RateLimitBurst=1000

# Disable rate limiting entirely (not recommended)
# RateLimitIntervalSec=0
```

When rate limiting kicks in, you will see messages like this in the journal.

```bash
# Check for rate limiting messages
# These indicate a service is logging excessively
journalctl -u systemd-journald | grep -i "suppressed"
```

To identify which services are being rate-limited or logging excessively.

```bash
# Find services with the most log entries in the last hour
# High counts may indicate candidates for rate limit tuning
journalctl --since "1 hour ago" -o json | \
  jq -r '._SYSTEMD_UNIT // "kernel"' | \
  sort | uniq -c | sort -rn | head -20
```

## Forward to Syslog

journald can forward all messages to a traditional syslog daemon (rsyslog, syslog-ng) for compatibility with existing log infrastructure.

```ini
[Journal]
# Forward all journal entries to syslog socket
# Enable this if you use rsyslog for log aggregation
ForwardToSyslog=yes

# Forward kernel messages to syslog
ForwardToKMsg=no

# Forward to the console (useful for debugging)
ForwardToConsole=no

# Forward to a wall message (all logged-in users)
ForwardToWall=yes

# Maximum syslog message log level to forward
# 0=emerg, 1=alert, 2=crit, 3=err, 4=warning, 5=notice, 6=info, 7=debug
MaxLevelSyslog=debug
```

Configure rsyslog to receive forwarded messages.

```bash
# Check if rsyslog is receiving journal messages
# Look for entries with the imuxsock module
cat /etc/rsyslog.conf | grep -A5 "imuxsock"

# View rsyslog's output to verify forwarding works
tail -f /var/log/syslog
```

For centralized logging, combine journald forwarding with rsyslog remote logging.

```bash
# Example rsyslog configuration to forward to remote server
# Add to /etc/rsyslog.d/50-remote.conf
# *.* @logserver.example.com:514    # UDP
# *.* @@logserver.example.com:514   # TCP
```

## Journal Corruption and Repair

Journal files can become corrupted due to disk issues, improper shutdowns, or filesystem errors. journald includes self-healing capabilities.

```bash
# Verify journal file integrity
# Checks all journal files and reports any issues
journalctl --verify
```

If corruption is detected, journald will report which files are affected.

```bash
# Example output showing corrupted file
# FAIL: /var/log/journal/.../system.journal (Invalid argument)
```

To repair corrupted journals.

```bash
# Option 1: Remove only corrupted files (journald recreates them)
# First, identify corrupted files from --verify output
sudo rm /var/log/journal/*/system.journal  # Only if corrupted

# Option 2: Rotate current journal and start fresh
# Existing logs are preserved in rotated files
sudo journalctl --rotate

# Option 3: Complete reset (loses all logs)
# Use only as last resort
sudo systemctl stop systemd-journald
sudo rm -rf /var/log/journal/*
sudo systemctl start systemd-journald
```

Prevent corruption by ensuring clean shutdowns and healthy filesystems.

```bash
# Check filesystem for errors (requires unmount or recovery mode)
sudo fsck -n /dev/sda1

# Monitor disk health for early warning signs
sudo smartctl -a /dev/sda | grep -E "(Reallocated|Pending|Uncorrectable)"
```

## Monitoring Journal Health

Proactive monitoring helps catch issues before they cause outages. Set up these checks for production systems.

```bash
# Script to check journal disk usage and alert if high
# Add to cron or monitoring system

#!/bin/bash
# journal-health-check.sh

# Get journal size in bytes
JOURNAL_SIZE=$(journalctl --disk-usage | grep -oP '[\d.]+[GMK]?(?=\s)')
JOURNAL_BYTES=$(journalctl --disk-usage --output=json 2>/dev/null | jq '.size' 2>/dev/null || echo "0")

# Check for corruption
VERIFY_OUTPUT=$(journalctl --verify 2>&1)
CORRUPT_COUNT=$(echo "$VERIFY_OUTPUT" | grep -c "FAIL" || echo "0")

# Output status
echo "Journal Size: $JOURNAL_SIZE"
echo "Corrupted Files: $CORRUPT_COUNT"

# Alert if size exceeds threshold (2GB example)
if [ "$JOURNAL_BYTES" -gt 2147483648 ]; then
    echo "WARNING: Journal size exceeds 2GB"
    exit 1
fi

# Alert if corruption detected
if [ "$CORRUPT_COUNT" -gt 0 ]; then
    echo "ERROR: Journal corruption detected"
    exit 2
fi

exit 0
```

Monitor journal growth over time.

```bash
# Log journal size daily for trend analysis
# Add to crontab: 0 0 * * * /usr/local/bin/log-journal-size.sh

#!/bin/bash
# log-journal-size.sh
DATE=$(date +%Y-%m-%d)
SIZE=$(journalctl --disk-usage | grep -oP '[\d.]+[GMK]?(?=\s)')
echo "$DATE,$SIZE" >> /var/log/journal-size-history.csv
```

Check for excessive logging from specific services.

```bash
# Find the top 10 services by log volume in the last 24 hours
journalctl --since "24 hours ago" --output=short | \
  awk '{print $5}' | cut -d'[' -f1 | sort | uniq -c | sort -rn | head -10
```

## Best Practices for Production

Follow these recommendations for managing journal size in production environments.

### 1. Set Explicit Size Limits

Never rely on defaults. Configure explicit limits based on your disk capacity and logging volume.

```ini
[Journal]
# Production server with 100GB+ storage
Storage=persistent
SystemMaxUse=2G
SystemKeepFree=5G
SystemMaxFileSize=100M
MaxRetentionSec=30d
Compress=yes
```

### 2. Implement Log Rotation Schedules

Create a systemd timer to regularly vacuum old logs.

```bash
# Create a timer unit for regular journal maintenance
sudo tee /etc/systemd/system/journal-vacuum.timer << 'EOF'
[Unit]
Description=Weekly journal vacuum

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create the corresponding service unit
sudo tee /etc/systemd/system/journal-vacuum.service << 'EOF'
[Unit]
Description=Vacuum old journal entries

[Service]
Type=oneshot
ExecStart=/usr/bin/journalctl --vacuum-time=14d --vacuum-size=1G
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now journal-vacuum.timer

# Verify the timer is active
systemctl list-timers | grep journal
```

### 3. Monitor Disk Space Proactively

Set up alerts before disk space becomes critical.

```bash
# Check available space on journal partition
df -h /var/log/journal

# Set up a simple monitoring check
USAGE=$(df /var/log/journal | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USAGE" -gt 80 ]; then
    echo "WARNING: Journal partition is ${USAGE}% full"
fi
```

### 4. Tune Rate Limiting Per Service

For services that legitimately need high log throughput, adjust rate limits in their unit files.

```bash
# Override rate limiting for a specific service
sudo systemctl edit myapp.service

# Add these lines in the editor
[Service]
LogRateLimitIntervalSec=0
LogRateLimitBurst=0
```

### 5. Use Structured Logging

Configure applications to emit structured log data that journald can index efficiently.

```bash
# Example: logging with systemd-cat for structured entries
echo "Application started" | systemd-cat -t myapp -p info

# View structured fields for better filtering
journalctl -t myapp -o json-pretty
```

### 6. Centralize Logs for Critical Systems

Do not rely solely on local journals for production systems. Forward to a centralized logging platform.

```ini
[Journal]
# Enable forwarding while maintaining local storage
Storage=persistent
ForwardToSyslog=yes
MaxLevelSyslog=info
```

## Troubleshooting

Common issues and their solutions.

### Journal Taking Too Much Disk Space

```bash
# Immediate relief: vacuum to 500MB
sudo journalctl --vacuum-size=500M

# Long-term fix: configure limits in journald.conf
sudo nano /etc/systemd/journald.conf
# Set SystemMaxUse=1G

sudo systemctl restart systemd-journald
```

### Cannot Find Old Logs

```bash
# Check if logs are being rotated too aggressively
cat /etc/systemd/journald.conf | grep -E "(MaxRetention|MaxUse)"

# List available boot sessions
journalctl --list-boots

# Check time range of available logs
journalctl -o short-precise | head -1
journalctl -o short-precise | tail -1
```

### journald Using Too Much Memory

```bash
# Check current memory usage of journald
systemctl status systemd-journald | grep Memory

# Reduce memory usage with compression and smaller buffers
# Edit /etc/systemd/journald.conf
# Compress=yes
# SystemMaxUse=500M

sudo systemctl restart systemd-journald
```

### Rate Limiting Dropping Important Logs

```bash
# Identify which service is being rate-limited
journalctl -p warning | grep -i "suppressed"

# Increase rate limits for that service
sudo systemctl edit affected-service.service
# Add: LogRateLimitBurst=50000

sudo systemctl restart affected-service
```

### Journal Files Not Rotating

```bash
# Force immediate rotation
sudo journalctl --rotate

# Check if rotation is blocked by open file handles
lsof | grep journal

# Verify journald is running correctly
systemctl status systemd-journald
journalctl -u systemd-journald --since "1 hour ago"
```

### Permission Denied Errors

```bash
# Fix journal directory permissions
sudo systemd-tmpfiles --create --prefix /var/log/journal

# Ensure correct ownership
sudo chown -R root:systemd-journal /var/log/journal
sudo chmod -R 2755 /var/log/journal

# Add user to systemd-journal group for read access
sudo usermod -aG systemd-journal $USER
```

---

Effective journal management is essential for maintaining healthy Ubuntu systems. By configuring appropriate size limits, implementing regular vacuum operations, and monitoring journal health, you prevent disk space issues before they impact your services. Remember that logging configuration is a balance between retaining enough history for debugging and conserving disk resources.

For comprehensive monitoring of your journal health, disk usage, and system metrics, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time alerting when disk usage approaches critical thresholds, tracks log volume trends over time, and integrates with your existing infrastructure to give you complete visibility into your systems. With OneUptime's monitoring capabilities, you can catch journal-related issues before they cause service disruptions and maintain the reliability your users expect.
