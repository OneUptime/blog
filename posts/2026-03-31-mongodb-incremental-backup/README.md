# How to Implement Incremental Backup for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Recovery, Storage, Database

Description: Learn how to implement incremental MongoDB backups using oplog-based strategies and Percona Backup for MongoDB to minimize storage and backup windows.

---

## Incremental vs Full Backup

Full backups capture the entire dataset each time, which is reliable but storage-intensive and slow for large databases. Incremental backups capture only the data changed since the last backup, dramatically reducing storage costs and backup duration.

MongoDB supports two incremental backup approaches: oplog-based incremental backups (where each increment is a set of oplog entries) and block-level incremental backups via Percona Backup for MongoDB (PBM) or filesystem snapshots with change tracking.

## Oplog-Based Incremental Backup Strategy

The MongoDB oplog records every write operation as a BSON document. By capturing oplog entries since the last backup timestamp, you have an incremental record of all changes:

```bash
#!/bin/bash
# incremental-backup.sh

MONGO_URI="mongodb://user:pass@localhost:27017"
BACKUP_DIR="/backups/incremental"
LAST_TS_FILE="/var/lib/mongodb-backup/last_ts"
DATE=$(date +%Y%m%d-%H%M%S)

# Read last backup timestamp
if [ -f "$LAST_TS_FILE" ]; then
  LAST_TS=$(cat "$LAST_TS_FILE")
else
  # First run - use current time as baseline
  LAST_TS=$(mongosh "$MONGO_URI" --quiet --eval \
    "db.getSiblingDB('local').oplog.rs.find().sort({'\$natural':-1}).limit(1).next().ts.getHighBits()")
  echo "$LAST_TS" > "$LAST_TS_FILE"
  echo "Initialized incremental backup baseline at ts=$LAST_TS"
  exit 0
fi

# Export oplog entries since last backup
mongodump \
  --uri "$MONGO_URI" \
  --db local \
  --collection "oplog.rs" \
  --query "{\"ts\": {\"\$gt\": {\"\$timestamp\": {\"t\": $LAST_TS, \"i\": 0}}}}" \
  --out "$BACKUP_DIR/$DATE"

# Update last timestamp
NEW_TS=$(mongosh "$MONGO_URI" --quiet --eval \
  "db.getSiblingDB('local').oplog.rs.find().sort({'\$natural':-1}).limit(1).next().ts.getHighBits()")
echo "$NEW_TS" > "$LAST_TS_FILE"

echo "Incremental backup complete: $BACKUP_DIR/$DATE (ts: $LAST_TS -> $NEW_TS)"
```

## Using Percona Backup for MongoDB (PBM)

PBM provides a production-grade incremental backup system for self-hosted replica sets and sharded clusters. Install PBM:

```bash
# Install pbm on RHEL/CentOS
sudo yum install percona-backup-mongodb

# Configure PBM storage (S3 example)
cat > /tmp/pbm-storage-config.yaml << 'EOF'
storage:
  type: s3
  s3:
    region: us-east-1
    bucket: my-mongodb-backups
    credentials:
      access-key-id: AKIAIOSFODNN7EXAMPLE
      secret-access-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

pbm config --file /tmp/pbm-storage-config.yaml
```

Start an incremental base backup:

```bash
pbm backup --type=incremental --base
```

Then run incremental backups on a schedule:

```bash
# Take incremental backup (captures changes since last base backup)
pbm backup --type=incremental

# Check backup status
pbm status

# List all backups
pbm list
```

## Scheduling Incremental Backups with Cron

Set up a weekly full backup with daily incrementals:

```bash
# /etc/cron.d/mongodb-backup
# Weekly incremental base backup on Sunday at 01:00
0 1 * * 0 mongodb /usr/local/bin/pbm backup --type=incremental --base >> /var/log/mongodb-backup.log 2>&1

# Daily incremental backup Mon-Sat at 01:00
0 1 * * 1-6 mongodb /usr/local/bin/pbm backup --type=incremental >> /var/log/mongodb-backup.log 2>&1
```

## Restoring from Incremental Backups

To restore from a PBM incremental chain:

```bash
# List available restore points
pbm list

# Restore to a specific point in time
pbm restore --time="2024-01-15T10:30:00"

# Or restore to a specific point using a particular base snapshot
pbm restore --base-snapshot=2024-01-14T01:00:00Z --time="2024-01-15T10:30:00"
```

PBM automatically applies all incremental layers on top of the base snapshot during restore.

## Verifying Incremental Backup Integrity

After each backup, verify the chain is intact:

```bash
pbm status -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
backups = data.get('backups', {}).get('snapshot', [])
for b in backups:
    print(f\"Backup: {b['name']} Status: {b['status']} Type: {b.get('type','full')}\")
"
```

Monitor backup job success with OneUptime by wrapping your backup scripts with status reporting to a heartbeat monitor - if the incremental job does not check in within the expected window, an alert fires.

## Summary

MongoDB incremental backups reduce storage overhead and backup windows by capturing only changed data since the last backup run. Oplog-based incremental exports work for smaller datasets, while Percona Backup for MongoDB provides a robust, production-ready solution for replica sets and sharded clusters. Combine weekly full backups with daily incrementals and test your restoration chain regularly to validate integrity.
