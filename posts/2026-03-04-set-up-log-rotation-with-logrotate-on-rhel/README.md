# How to Set Up Log Rotation with logrotate on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, logrotate, Logging, Disk Management, System Administration

Description: Configure logrotate on RHEL to automatically rotate, compress, and clean up log files, preventing disk space exhaustion from growing log files.

---

Log files grow continuously and will eventually fill your disk if left unchecked. logrotate handles this by rotating, compressing, and removing old log files on a schedule. It comes pre-installed on RHEL and runs daily via a systemd timer.

## How logrotate Works

```bash
# logrotate is triggered by a systemd timer
systemctl status logrotate.timer

# The main configuration file
cat /etc/logrotate.conf

# Per-application configs go in this directory
ls /etc/logrotate.d/
```

## Default Configuration

```bash
# /etc/logrotate.conf
# Rotate logs weekly
weekly

# Keep 4 weeks of old logs
rotate 4

# Create new log files after rotation
create

# Use date as suffix for rotated files
dateext

# Compress rotated files
compress

# Include per-application configs
include /etc/logrotate.d
```

## Create a Custom Rotation Rule

```bash
# Create a config for a custom application log
sudo tee /etc/logrotate.d/myapp << 'EOF'
/var/log/myapp/*.log {
    # Rotate daily
    daily

    # Keep 14 rotated files
    rotate 14

    # Compress old logs with gzip
    compress

    # Don't compress the most recent rotated file
    # (useful if the app still writes to it briefly)
    delaycompress

    # Don't error if the log file is missing
    missingok

    # Don't rotate empty files
    notifempty

    # Create new file with these permissions
    create 0640 myapp myapp

    # Run a command after rotation
    postrotate
        # Signal the app to reopen its log files
        systemctl reload myapp 2>/dev/null || true
    endscript
}
EOF
```

## Rotation by Size Instead of Time

```bash
# Rotate when the file exceeds a specific size
sudo tee /etc/logrotate.d/largelogs << 'EOF'
/var/log/bigapp.log {
    # Rotate when file exceeds 100MB
    size 100M

    # Keep 5 rotated copies
    rotate 5

    compress
    missingok
    notifempty
}
EOF
```

## Test Your Configuration

```bash
# Dry run to see what logrotate would do (no changes made)
sudo logrotate -d /etc/logrotate.d/myapp

# Force rotation to test it works
sudo logrotate -f /etc/logrotate.d/myapp

# Check the rotated files
ls -la /var/log/myapp/
```

## Troubleshoot logrotate

```bash
# View the logrotate state file to see last rotation times
cat /var/lib/logrotate/logrotate.status

# Run logrotate in verbose mode
sudo logrotate -v /etc/logrotate.conf

# Check if the timer is running
systemctl list-timers | grep logrotate
```

## Common Options Reference

```bash
# copytruncate  - copy the log then truncate (for apps that can't reopen files)
# sharedscripts - run postrotate only once, even for multiple matching files
# maxage 30     - remove rotated files older than 30 days
# minsize 10M   - only rotate if file is at least 10MB
# olddir /var/log/old - move rotated files to a different directory
```

Well-configured logrotate rules keep your RHEL systems from running out of disk space while retaining enough log history for troubleshooting.
