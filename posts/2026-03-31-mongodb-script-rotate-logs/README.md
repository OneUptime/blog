# How to Write a Script to Rotate MongoDB Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Log Rotation, Operation, Shell

Description: Learn how to write a script to rotate MongoDB server logs using the logRotate admin command, compress old logs, and clean up log files older than a retention period.

---

## Overview

MongoDB writes server logs to a log file that grows continuously. Log rotation prevents disk exhaustion by splitting the log at regular intervals, compressing old files, and deleting files beyond the retention window. This script automates the full rotation lifecycle.

## MongoDB Log Rotation Command

MongoDB supports log rotation via the `logRotate` admin command. With the default `rename` mode, MongoDB renames the current log file by appending a UTC timestamp and opens a new log file at the original path:

```bash
mongosh --quiet --eval "db.adminCommand({ logRotate: 1 })"
```

After running this command with the default `rename` mode, the old log is automatically renamed (for example, `mongod.log.2026-04-12T00-00-00`) and MongoDB starts writing to a new file at the original path. If you use `reopen` mode instead, MongoDB closes and reopens the same file path, expecting an external tool to have already moved the old file.

## Full Log Rotation Shell Script

```bash
#!/bin/bash
# mongodb-log-rotate.sh

LOG_FILE="/var/log/mongodb/mongod.log"
LOG_DIR="/var/log/mongodb"
ARCHIVE_DIR="/var/log/mongodb/archive"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
RETENTION_DAYS=14

mkdir -p "$ARCHIVE_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVED_LOG="$ARCHIVE_DIR/mongod_$TIMESTAMP.log"

echo "[$(date -u)] Starting MongoDB log rotation..."

# Step 1: Copy current log to archive before rotating
cp "$LOG_FILE" "$ARCHIVED_LOG"

# Step 2: Tell MongoDB to rotate its log (closes and reopens the log file)
mongosh "$MONGO_URI" --quiet --eval "db.adminCommand({ logRotate: 1 })"
if [ $? -ne 0 ]; then
  echo "ERROR: logRotate command failed"
  rm -f "$ARCHIVED_LOG"
  exit 1
fi

echo "[$(date -u)] Log rotated successfully"

# Step 3: Compress the archived log
gzip "$ARCHIVED_LOG"
echo "[$(date -u)] Compressed: ${ARCHIVED_LOG}.gz"

# Step 4: Delete logs older than retention period
find "$ARCHIVE_DIR" -name "mongod_*.log.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date -u)] Cleaned up logs older than ${RETENTION_DAYS} days"

# Step 5: Report archive size
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR" | cut -f1)
echo "[$(date -u)] Archive directory size: $ARCHIVE_SIZE"
echo "[$(date -u)] Log rotation complete"
```

## Python Version for Cross-Platform Use

```python
#!/usr/bin/env python3
import os
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from pymongo import MongoClient

LOG_FILE = Path("/var/log/mongodb/mongod.log")
ARCHIVE_DIR = Path("/var/log/mongodb/archive")
RETENTION_DAYS = 14
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

def rotate_logs():
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    archived = ARCHIVE_DIR / f"mongod_{timestamp}.log"

    print(f"[{datetime.utcnow().isoformat()}] Starting log rotation...")

    # Copy current log
    shutil.copy2(LOG_FILE, archived)

    # Send logRotate command
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command({"logRotate": 1})
    print("logRotate command sent successfully")

    # Compress archived log
    gz_path = Path(str(archived) + ".gz")
    with open(archived, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    archived.unlink()
    print(f"Compressed: {gz_path}")

    # Clean up old archives
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    for log_file in ARCHIVE_DIR.glob("mongod_*.log.gz"):
        if datetime.fromtimestamp(log_file.stat().st_mtime) < cutoff:
            log_file.unlink()
            print(f"Deleted old log: {log_file}")

    print(f"[{datetime.utcnow().isoformat()}] Log rotation complete")

if __name__ == "__main__":
    rotate_logs()
```

## Scheduling with Cron

```bash
# Rotate logs daily at midnight
0 0 * * * /usr/local/bin/bash /opt/scripts/mongodb-log-rotate.sh >> /var/log/mongodb-rotation.log 2>&1
```

## Configuring logrotate Integration

Alternatively, use the system `logrotate` utility with a MongoDB-specific config. This approach requires setting `systemLog.logRotate: reopen` in your MongoDB configuration (`mongod.conf`) so that MongoDB reopens the log file after `logrotate` renames it:

```text
/var/log/mongodb/mongod.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    sharedscripts
    postrotate
        /usr/bin/mongosh --quiet --eval "db.adminCommand({ logRotate: 1 })"
    endscript
}
```

Place this in `/etc/logrotate.d/mongodb`.

## Best Practices

- Always copy the log file before sending `logRotate` to ensure you capture everything written before the command.
- Use `gzip` compression on archived logs - MongoDB logs compress to 5-10% of their original size.
- Monitor the archive directory size and alert if it grows faster than expected (can indicate a logging misconfiguration).

## Summary

MongoDB log rotation involves copying the current log, sending the `logRotate` admin command, compressing the archive, and cleaning up files beyond the retention window. Automate this via cron daily and use `logrotate.d` for integration with the system log management daemon.
