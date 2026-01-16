# How to Configure Logrotate for Log Management on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Logrotate, Logs, System Administration, Maintenance, Tutorial

Description: Master log rotation on Ubuntu with logrotate to manage log file sizes, automate cleanup, and prevent disk space issues.

---

Log files grow continuously and can consume all available disk space if left unchecked. Logrotate automatically rotates, compresses, and removes old log files based on configurable rules. This guide covers setup, configuration, and advanced patterns for managing logs on Ubuntu.

## Understanding Logrotate

Logrotate runs daily via cron and processes log files according to configuration rules:
- **Rotate**: Rename current log and start fresh
- **Compress**: gzip old logs to save space
- **Remove**: Delete logs older than specified age
- **Scripts**: Run commands before/after rotation

## Default Configuration

Ubuntu includes logrotate by default:

```bash
# Check logrotate is installed
logrotate --version

# View main configuration
cat /etc/logrotate.conf

# List application-specific configs
ls -la /etc/logrotate.d/
```

### Main Configuration File

```bash
# /etc/logrotate.conf
cat /etc/logrotate.conf
```

Default content:

```
# Rotate logs weekly
weekly

# Keep 4 weeks of logs
rotate 4

# Create new empty log files after rotating
create

# Use date as suffix for rotated files
dateext

# Compress rotated logs
compress

# Include application-specific configs
include /etc/logrotate.d
```

## Creating Custom Configuration

### Configuration Location

- Global settings: `/etc/logrotate.conf`
- Application configs: `/etc/logrotate.d/`

### Basic Configuration Syntax

```bash
# Create configuration for your application
sudo nano /etc/logrotate.d/myapp
```

```
# Log file path (supports wildcards)
/var/log/myapp/*.log {
    # Rotation frequency
    daily

    # Number of rotated files to keep
    rotate 7

    # Don't error if log is missing
    missingok

    # Don't rotate empty files
    notifempty

    # Compress rotated files
    compress

    # Delay compression until next rotation
    delaycompress

    # Create new log file with these permissions
    create 640 root adm
}
```

## Common Configuration Options

### Rotation Frequency

```
daily       # Rotate every day
weekly      # Rotate every week
monthly     # Rotate every month
yearly      # Rotate every year
size 100M   # Rotate when file reaches 100MB
```

### Rotation Count

```
rotate 4    # Keep 4 rotated files
rotate 0    # Delete immediately after rotation
```

### File Handling

```
compress          # Compress rotated files (gzip)
nocompress        # Don't compress
delaycompress     # Compress on next rotation (keep 1 uncompressed)
compresscmd xz    # Use xz instead of gzip
compressoptions -9  # Maximum compression
```

### Naming Options

```
dateext                        # Use date in filename
dateformat -%Y%m%d            # Custom date format
dateyesterday                 # Use yesterday's date
extension .log                # Preserve file extension
```

### File Creation

```
create 640 root adm           # Create new file with mode owner group
nocreate                      # Don't create new file
copy                          # Copy file instead of moving
copytruncate                  # Truncate original file after copy
```

### Conditional Rotation

```
missingok         # Don't error if log is missing
notifempty        # Don't rotate empty files
ifempty           # Rotate even if empty
minsize 100M      # Rotate only if larger than 100MB
maxsize 500M      # Force rotate if larger than 500MB
```

## Practical Examples

### Application Logs

```bash
sudo nano /etc/logrotate.d/myapp
```

```
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        # Send signal to app to reopen log files
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

### Nginx Logs

```bash
sudo nano /etc/logrotate.d/nginx-custom
```

```
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then
            run-parts /etc/logrotate.d/httpd-prerotate
        fi
    endscript
    postrotate
        # Signal nginx to reopen log files
        [ -s /run/nginx.pid ] && kill -USR1 $(cat /run/nginx.pid)
    endscript
}
```

### Size-Based Rotation

```
/var/log/bigapp/*.log {
    size 100M
    rotate 5
    compress
    missingok
    notifempty
    copytruncate
}
```

### Docker Container Logs

```
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
    maxsize 100M
}
```

### Multi-Path Configuration

```
# Multiple log paths with same rules
/var/log/app1/*.log
/var/log/app2/*.log
/home/*/logs/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

## Script Hooks

### Pre and Post Rotation Scripts

```
/var/log/myapp/*.log {
    daily
    rotate 7
    compress

    # Run before rotation
    prerotate
        # Example: flush log buffers
        /usr/bin/myapp --flush-logs
    endscript

    # Run after rotation
    postrotate
        # Example: notify app to reopen logs
        systemctl reload myapp || true
    endscript

    # Run once for all matching files (not per file)
    sharedscripts

    # Run after all rotations complete
    lastaction
        # Example: sync logs to backup server
        rsync -a /var/log/myapp/ backup:/logs/myapp/
    endscript

    # Run before any rotation starts
    firstaction
        # Example: create backup
        tar -czf /backup/logs-pre-rotate.tar.gz /var/log/myapp/
    endscript
}
```

### sharedscripts Explained

Without `sharedscripts`:
- Scripts run once PER file matched

With `sharedscripts`:
- Scripts run once for ALL matched files

## Testing Configuration

### Dry Run (No Changes)

```bash
# Test specific configuration
sudo logrotate -d /etc/logrotate.d/myapp

# Test all configurations
sudo logrotate -d /etc/logrotate.conf
```

### Force Rotation

```bash
# Force rotation (ignores time checks)
sudo logrotate -f /etc/logrotate.d/myapp

# Force all rotations
sudo logrotate -f /etc/logrotate.conf

# Verbose output
sudo logrotate -v /etc/logrotate.d/myapp
```

### Debug Issues

```bash
# Maximum verbosity
sudo logrotate -dv /etc/logrotate.d/myapp

# Check logrotate status
cat /var/lib/logrotate/status
```

## State File

Logrotate tracks rotation state in `/var/lib/logrotate/status`:

```bash
# View rotation status
cat /var/lib/logrotate/status

# Reset state for fresh start (use carefully)
sudo rm /var/lib/logrotate/status
```

## Cron Integration

Logrotate runs daily via cron:

```bash
# View logrotate cron job
cat /etc/cron.daily/logrotate
```

### Custom Schedule

For more frequent rotation, create a custom cron job:

```bash
# Run logrotate every hour
sudo nano /etc/cron.hourly/logrotate-hourly
```

```bash
#!/bin/bash
# Hourly logrotate for high-volume logs
/usr/sbin/logrotate /etc/logrotate.d/myapp-hourly
```

```bash
chmod +x /etc/cron.hourly/logrotate-hourly
```

## Common Issues and Solutions

### Log Not Rotating

```bash
# Check configuration syntax
sudo logrotate -d /etc/logrotate.d/myapp

# Force rotation
sudo logrotate -f /etc/logrotate.d/myapp

# Check state file for last rotation time
grep myapp /var/lib/logrotate/status
```

### "Skipping - File Not Found"

Add `missingok` to configuration:

```
/var/log/myapp/*.log {
    missingok
    ...
}
```

### Permissions Issues

```bash
# Check file ownership
ls -la /var/log/myapp/

# Ensure create directive matches app requirements
create 0640 www-data www-data
```

### Log Growing Despite Rotation

App still writes to old file handle. Solutions:

1. Use `copytruncate`:
```
copytruncate
```

2. Send reload signal:
```
postrotate
    systemctl reload myapp
endscript
```

### Disk Full Despite Rotation

Check rotation count and compression:

```bash
# Count rotated files
ls -la /var/log/myapp/

# Verify compression is working
file /var/log/myapp/app.log.1
```

Reduce retention:
```
rotate 3  # Keep fewer files
maxsize 50M  # Limit file size
```

## Advanced Patterns

### Email on Rotation

```
/var/log/secure.log {
    weekly
    rotate 4
    compress
    mail admin@example.com
    mailfirst  # Mail the just-rotated file (or maillast)
}
```

### Different Settings Per Environment

```bash
# Production: longer retention
# /etc/logrotate.d/app-prod
/var/log/app-prod/*.log {
    daily
    rotate 30
    compress
}

# Development: shorter retention
# /etc/logrotate.d/app-dev
/var/log/app-dev/*.log {
    daily
    rotate 3
    compress
}
```

### Conditional Scripts

```
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    postrotate
        # Only run if process is running
        if [ -f /var/run/myapp.pid ]; then
            kill -HUP $(cat /var/run/myapp.pid)
        fi
    endscript
}
```

## Monitoring Log Rotation

### Check Disk Usage

```bash
# Monitor log directory size
du -sh /var/log/*

# Find largest files
find /var/log -type f -size +100M -exec ls -lh {} \;
```

### Alert on Rotation Failure

```bash
# Create monitoring script
sudo nano /usr/local/bin/check-logrotate.sh
```

```bash
#!/bin/bash
# Check if logrotate ran successfully today

STATUS_FILE="/var/lib/logrotate/status"
TODAY=$(date +%Y-%m-%d)

if ! grep -q "$TODAY" "$STATUS_FILE"; then
    echo "WARNING: Logrotate may not have run today"
    exit 1
fi

echo "OK: Logrotate ran today"
exit 0
```

---

Proper log rotation prevents disk space issues and maintains system health. Start with conservative settings (daily rotation, 7-14 days retention, compression enabled) and adjust based on your storage capacity and compliance requirements. Always test configurations with `-d` flag before deploying.
