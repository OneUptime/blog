# How to Troubleshoot MongoDB Not Starting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Troubleshooting, Startup, Configuration, Linux

Description: Diagnose and fix MongoDB startup failures by inspecting log files, checking configuration, resolving port conflicts, and fixing file permission issues.

---

## Overview

MongoDB fails to start for a handful of predictable reasons: configuration errors, port conflicts, corrupted data files, permission problems, or insufficient system resources. A systematic approach using logs and diagnostic commands resolves most issues quickly.

## Step 1: Check the MongoDB Log

The log file is the first place to look.

```bash
# Default log location on Linux
tail -100 /var/log/mongodb/mongod.log

# Or follow the log in real time
journalctl -u mongod -f

# Check the systemd status
systemctl status mongod
```

Common log messages and their meanings:

```text
"addr already in use" - Port 27017 is in use by another process
"Permission denied" - mongod cannot write to the data directory
"Unclean shutdown detected" - Data files need recovery
"WiredTiger error" - Storage engine initialization failure
```

## Step 2: Check for Port Conflicts

```bash
# Check if port 27017 is in use
ss -tlnp | grep 27017

# Or using lsof
lsof -i :27017

# Kill the conflicting process if it is a stale mongod
kill -9 <PID>
```

If another application needs port 27017, change the MongoDB port in `mongod.conf`.

```yaml
net:
  port: 27018
  bindIp: 127.0.0.1
```

## Step 3: Fix File Permission Issues

```bash
# Check ownership of the data directory
ls -la /var/lib/mongodb

# MongoDB must own the data and log directories
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb

# Fix the mongod.pid file if it exists from a previous crash
sudo rm -f /var/run/mongodb/mongod.pid
```

## Step 4: Validate the Configuration File

```bash
# Validate the configuration file without starting mongod (available since MongoDB 4.2)
mongod --config /etc/mongod.conf --validate

# Common configuration errors:
# - Tab characters (YAML requires spaces)
# - Incorrect indentation
# - Invalid option names
```

```yaml
# Minimal valid mongod.conf
storage:
  dbPath: /var/lib/mongodb

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
```

## Step 5: Handle Unclean Shutdown

If MongoDB crashed or was killed abruptly, WiredTiger may need to recover.

```bash
# Look for this in the log
grep -i "unclean shutdown" /var/log/mongodb/mongod.log

# WiredTiger recovers automatically on next start.
# If it cannot, remove the WiredTiger lock file and try again:
sudo rm -f /var/lib/mongodb/WiredTiger.lock
sudo systemctl start mongod
```

## Step 6: Check System Resources

```bash
# Check available disk space
df -h /var/lib/mongodb

# Check available memory
free -h

# Check file descriptor limits
ulimit -n

# MongoDB recommends at least 64000 file descriptors
# Set in /etc/security/limits.conf:
# mongodb soft nofile 64000
# mongodb hard nofile 64000
```

## Step 7: Start Manually for Detailed Output

```bash
# Start in foreground with verbose logging to see startup errors directly
sudo -u mongodb mongod \
  --config /etc/mongod.conf \
  --verbose
```

## Summary

MongoDB startup failures are almost always caused by port conflicts, permission issues, configuration syntax errors, or WiredTiger recovery needs. Start with the log file and `systemctl status mongod`, check for port conflicts with `ss -tlnp`, fix data directory ownership, validate the configuration file with `--validate`, and start MongoDB manually in the foreground with `--verbose` for the most detailed startup error output.
