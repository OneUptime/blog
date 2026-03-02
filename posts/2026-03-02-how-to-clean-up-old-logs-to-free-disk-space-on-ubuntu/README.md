# How to Clean Up Old Logs to Free Disk Space on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Disk Management, System Administration, logrotate

Description: Reclaim disk space on Ubuntu by safely cleaning up old log files from journald, rsyslog, application logs, and configuring automatic log rotation to prevent future accumulation.

---

Log files are a common source of unexpected disk space consumption on long-running servers. A verbose application, a crashed service writing errors repeatedly, or simply logs that were never configured to rotate can fill up a disk partition. This guide covers safely cleaning up logs while keeping the information you actually need.

## Identifying Where Disk Space Is Going

Before deleting anything, find out what's actually using disk space:

```bash
# Overall disk usage
df -h

# Find the largest directories
du -sh /* 2>/dev/null | sort -h | tail -20

# Narrow down to /var/log
du -sh /var/log/* 2>/dev/null | sort -h | tail -20

# Look deeper if /var/log is the culprit
du -sh /var/log/**/* 2>/dev/null | sort -h | tail -30

# Find the largest individual log files
find /var/log -name "*.log" -o -name "*.log.*" | \
    xargs ls -la 2>/dev/null | sort -k5 -n | tail -20

# Find all files over 100MB in /var/log
find /var/log -size +100M -type f -exec ls -lh {} \;
```

## Cleaning Up systemd Journal

The systemd journal is often a significant disk consumer:

```bash
# Check current journal disk usage
journalctl --disk-usage

# Remove journal entries older than 7 days
sudo journalctl --vacuum-time=7d

# Keep only the last 500MB of journal data
sudo journalctl --vacuum-size=500M

# Keep only the last 10 journal archive files
sudo journalctl --vacuum-files=10

# Combine: keep last 30 days but no more than 1GB
sudo journalctl --vacuum-time=30d --vacuum-size=1G

# Verify the result
journalctl --disk-usage
```

After vacuuming, configure journald to enforce limits automatically:

```bash
sudo nano /etc/systemd/journald.conf.d/99-size-limits.conf
```

```bash
[Journal]
# Keep at most 500MB of logs
SystemMaxUse=500M

# Always keep 500MB free
SystemKeepFree=500M

# Rotate files larger than 50MB
SystemMaxFileSize=50M

# Delete entries older than 30 days
MaxRetentionSec=30day
```

```bash
sudo systemctl restart systemd-journald
journalctl --disk-usage
```

## Cleaning Up Rotated and Compressed Logs

Rotated logs (`.log.1`, `.log.2.gz`) accumulate over time:

```bash
# List all rotated log files
find /var/log -name "*.gz" -o -name "*.1" -o -name "*.2" -o -name "*.old" | \
    xargs ls -lh 2>/dev/null | sort -k5 -n

# Calculate how much space they use
find /var/log -name "*.gz" | xargs du -ch 2>/dev/null | tail -1

# Remove all compressed log archives (keep current logs only)
# WARNING: This permanently deletes old log data
sudo find /var/log -name "*.gz" -delete

# Remove logs older than 30 days
sudo find /var/log -name "*.log.*" -mtime +30 -delete
sudo find /var/log -name "*.gz" -mtime +30 -delete

# Remove specific rotated files
sudo rm -f /var/log/syslog.{1,2,3,4}.gz
sudo rm -f /var/log/auth.log.{1,2,3,4}.gz
```

## Truncating vs. Deleting Log Files

For currently open log files, truncate rather than delete to avoid breaking the logging daemon:

```bash
# WRONG: Deleting an open log file (daemon keeps writing to deleted file)
# sudo rm /var/log/syslog   # DON'T DO THIS

# RIGHT: Truncate the file to zero size (daemon keeps its file handle)
sudo truncate -s 0 /var/log/syslog

# Alternative using shell redirection
sudo bash -c '> /var/log/nginx/access.log'

# Or use tee to zero a file
sudo tee /var/log/myapp.log < /dev/null

# After truncating, tell the daemon to reopen its log files
sudo kill -HUP $(cat /var/run/rsyslogd.pid)  # rsyslog
sudo systemctl kill -s HUP rsyslog            # Also works for rsyslog
sudo nginx -s reopen                          # nginx
```

## Safely Removing Application-Specific Logs

Check common log locations:

```bash
# Apache/nginx logs
ls -lh /var/log/apache2/ /var/log/nginx/

# MySQL/MariaDB
ls -lh /var/log/mysql/

# PostgreSQL
ls -lh /var/log/postgresql/

# Application-specific logs in /var/log
ls -lh /var/log/

# Snap package logs
ls -lh /var/snap/*/common/*.log 2>/dev/null

# Docker logs (if running containers)
ls -lh /var/lib/docker/containers/*/
```

Clean up old application logs:

```bash
# Remove MySQL slow query logs older than 14 days
sudo find /var/log/mysql -name "slow-*.log" -mtime +14 -delete

# Remove old Apache access logs
sudo find /var/log/apache2 -name "access.log.*" -mtime +7 -delete

# Remove old PostgreSQL logs
sudo find /var/log/postgresql -name "*.log" -mtime +30 -delete
```

## Docker Log Cleanup

Docker containers can accumulate large log files:

```bash
# Check docker log sizes
find /var/lib/docker/containers -name "*-json.log" -exec ls -lh {} \;

# Total docker log disk usage
du -sh /var/lib/docker/containers/

# Truncate all docker container logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# Configure docker to limit log size (edit daemon config)
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Apply docker logging limits
sudo systemctl restart docker
```

## Configuring logrotate for Automatic Cleanup

logrotate handles rotation and cleanup automatically. Verify it's configured correctly for your logs:

```bash
# Check logrotate configuration
cat /etc/logrotate.conf

# List all logrotate configurations
ls /etc/logrotate.d/

# Check logrotate status (when things were last rotated)
cat /var/lib/logrotate/status | head -30

# Test logrotate configuration (dry run)
sudo logrotate --debug /etc/logrotate.conf 2>&1 | head -50

# Force immediate rotation (don't wait for schedule)
sudo logrotate --force /etc/logrotate.conf
```

Create or fix logrotate configurations for applications without one:

```bash
sudo nano /etc/logrotate.d/myapp
```

```bash
/var/log/myapp/*.log {
    # Rotate daily
    daily

    # Keep 7 days of logs
    rotate 7

    # Compress old logs
    compress

    # Delay compression one cycle (in case log is still being written)
    delaycompress

    # Don't fail if the log file is missing
    missingok

    # Don't rotate empty files
    notifempty

    # Create new empty log file after rotation
    create 640 myapp adm

    # Signal the app to reopen its log files
    postrotate
        systemctl kill -s HUP myapp.service
    endscript
}
```

## Automated Log Cleanup Script

For systems with recurring log accumulation, a cleanup script run via cron:

```bash
sudo nano /usr/local/bin/log-cleanup
```

```bash
#!/bin/bash
# Log cleanup script for Ubuntu
# Run via cron: 0 3 * * 0 /usr/local/bin/log-cleanup >> /var/log/log-cleanup.log 2>&1

set -euo pipefail

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] log-cleanup:"

echo "$LOG_PREFIX Starting log cleanup"

# Journal cleanup - keep last 30 days, max 1GB
echo "$LOG_PREFIX Cleaning systemd journal..."
journalctl --vacuum-time=30d --vacuum-size=1G
echo "$LOG_PREFIX Journal disk usage: $(journalctl --disk-usage 2>&1 | grep -o '[0-9.]*[KMGTP]* archived')"

# Remove compressed logs older than 30 days
echo "$LOG_PREFIX Removing old compressed logs..."
old_count=$(find /var/log -name "*.gz" -mtime +30 | wc -l)
find /var/log -name "*.gz" -mtime +30 -delete
echo "$LOG_PREFIX Removed $old_count old compressed log files"

# Remove rotated logs older than 14 days
find /var/log -name "*.log.[0-9]*" -mtime +14 -delete 2>/dev/null || true

# Docker logs if docker is running
if systemctl is-active --quiet docker 2>/dev/null; then
    echo "$LOG_PREFIX Checking Docker logs..."
    docker_log_size=$(du -sh /var/lib/docker/containers/ 2>/dev/null | awk '{print $1}' || echo "N/A")
    echo "$LOG_PREFIX Docker container log total: $docker_log_size"
fi

echo "$LOG_PREFIX Cleanup complete"
echo "$LOG_PREFIX Current /var/log usage: $(du -sh /var/log | awk '{print $1}')"
```

```bash
sudo chmod +x /usr/local/bin/log-cleanup

# Schedule weekly cleanup
sudo crontab -e
```

```bash
# Run cleanup every Sunday at 3 AM
0 3 * * 0 /usr/local/bin/log-cleanup >> /var/log/log-cleanup.log 2>&1
```

## Emergency Disk Space Recovery

When the disk is critically full and services are failing:

```bash
# Emergency: find the biggest log files right now
find /var/log -type f -exec ls -s {} \; | sort -n | tail -20

# Emergency: delete all compressed logs immediately
sudo find /var/log -name "*.gz" -delete

# Emergency: truncate the largest log files
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/auth.log

# Emergency: vacuum journal aggressively
sudo journalctl --vacuum-size=100M

# Verify disk space freed
df -h /var/log
```

After the emergency, investigate why logs grew so large and fix the root cause - whether it's a misconfigured application logging excessively, missing logrotate configuration, or a service that's crashing repeatedly and filling logs with error messages.

Proactive log management - configuring rotation, setting retention limits, and periodically reviewing log sizes - prevents these situations from becoming emergencies in the first place.
