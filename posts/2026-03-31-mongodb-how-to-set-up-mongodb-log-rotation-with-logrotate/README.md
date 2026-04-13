# How to Set Up MongoDB Log Rotation with logRotate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Linux, Operation

Description: Learn how to configure the Linux logrotate utility to automatically rotate MongoDB log files, including compression, retention policies, and post-rotation actions.

---

## Overview

MongoDB writes continuously to its log file, and without rotation, this file grows indefinitely. The Linux `logrotate` utility is the standard tool for managing log file rotation, compression, and cleanup. Integrating logrotate with MongoDB ensures logs are rotated on schedule, old logs are compressed and eventually deleted, and disk space is managed automatically.

## Prerequisites

First, configure MongoDB to log to a file with `logRotate: reopen` mode, which works best with external rotation tools:

```yaml
# /etc/mongod.conf
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: reopen
```

The `reopen` mode tells MongoDB to close and reopen the log file after rotation, rather than renaming it. This is compatible with how logrotate works.

After changing the config, restart MongoDB:

```bash
sudo systemctl restart mongod
```

## Creating a logrotate Configuration

Create a logrotate configuration file for MongoDB:

```bash
sudo tee /etc/logrotate.d/mongodb << 'EOF'
/var/log/mongodb/mongod.log {
    # Rotate daily
    daily
    
    # Keep 14 days of logs
    rotate 14
    
    # Compress rotated logs
    compress
    
    # Delay compression by one rotation cycle
    delaycompress
    
    # Do not error if log file is missing
    missingok
    
    # Do not rotate if log file is empty
    notifempty
    
    # Run postrotate script only once for all matched logs
    sharedscripts
    
    # After rotation, signal MongoDB to reopen log file
    postrotate
        /bin/kill -SIGUSR1 $(cat /var/run/mongodb/mongod.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF
```

## Testing the logrotate Configuration

Before letting logrotate run automatically, test the configuration:

```bash
# Debug mode - shows what would happen without doing it
sudo logrotate --debug /etc/logrotate.d/mongodb

# Force rotation right now (for testing)
sudo logrotate --force /etc/logrotate.d/mongodb

# Verbose output
sudo logrotate --verbose /etc/logrotate.d/mongodb
```

## Verifying Rotation Worked

After a test rotation, check the log directory:

```bash
ls -lh /var/log/mongodb/
```

Expected output:

```text
-rw-r--r-- 1 mongodb mongodb  2.3K Mar 31 10:00 mongod.log
-rw-r--r-- 1 mongodb mongodb 12.5M Mar 30 23:59 mongod.log.1
-rw-r--r-- 1 mongodb mongodb  8.2M Mar 29 23:59 mongod.log.2.gz
-rw-r--r-- 1 mongodb mongodb  7.8M Mar 28 23:59 mongod.log.3.gz
```

Also verify MongoDB is still writing to the new log file:

```bash
# Confirm mongod is using the new file
lsof -p $(cat /var/run/mongodb/mongod.pid) | grep mongod.log

# Check for recent log entries
tail -n 20 /var/log/mongodb/mongod.log
```

## Alternative - Using copytruncate

If you cannot send signals (e.g., running in a container), use `copytruncate` instead:

```text
/var/log/mongodb/mongod.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

`copytruncate` copies the current log file to the rotated name and then truncates the original. This avoids needing to signal the process but has a small window where log entries could be lost.

## Weekly Rotation with Size Limit

For high-traffic deployments, rotate based on size in addition to time:

```text
/var/log/mongodb/mongod.log {
    # Rotate weekly or when file exceeds 500MB (whichever comes first)
    weekly
    maxsize 500M
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        /bin/kill -SIGUSR1 $(cat /var/run/mongodb/mongod.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

## Automating with Cron (Alternative to logrotate)

If you prefer a direct approach without logrotate, note that this requires `logRotate: rename` (the default) in your MongoDB configuration instead of `reopen`, because MongoDB must handle the file renaming itself:

```bash
# Add to root's crontab
sudo crontab -e
```

```text
# Rotate MongoDB logs daily at 1:00 AM
0 1 * * * /bin/kill -SIGUSR1 $(cat /var/run/mongodb/mongod.pid) 2>/dev/null && find /var/log/mongodb -name "*.log.*" -mtime +14 -delete
```

## logrotate State File

logrotate tracks rotation state in a status file:

```bash
# View logrotate state for MongoDB
grep mongodb /var/lib/logrotate/status

# Output example:
# "/var/log/mongodb/mongod.log" 2026-3-31-1:0:0
```

## Summary

Integrating MongoDB log rotation with the Linux logrotate utility requires setting `logRotate: reopen` in the MongoDB configuration file and creating a logrotate configuration that signals mongod after each rotation. The `postrotate` script sends SIGUSR1 to the mongod process, telling it to reopen the log file at the original path. This setup ensures logs are automatically rotated on schedule, compressed for space efficiency, and cleaned up after the configured retention period.
