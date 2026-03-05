# How to Backup and Restore MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Restore, Disaster Recovery, mongodump, mongorestore, Database Administration

Description: A comprehensive guide to MongoDB backup and restore strategies, covering mongodump/mongorestore, filesystem snapshots, continuous backup, and disaster recovery best practices.

---

Regular backups are essential for any production MongoDB deployment. Whether you're protecting against hardware failure, human error, or disasters, having reliable backup and restore procedures is critical. This guide covers all the methods and best practices for MongoDB backup and recovery.

## Backup Methods Overview

```mermaid
graph TD
    A[MongoDB Backup Methods] --> B[mongodump/mongorestore]
    A --> C[Filesystem Snapshots]
    A --> D[Cloud Provider Backups]
    A --> E[Replica Set Oplog Backup]

    B --> B1[Logical Backup]
    B --> B2[Portable Format]

    C --> C1[Point-in-Time]
    C --> C2[Fast Recovery]

    D --> D1[Atlas Continuous]
    D --> D2[AWS/GCP Snapshots]

    E --> E1[Continuous Backup]
    E --> E2[Point-in-Time Recovery]
```

## Method 1: mongodump and mongorestore

### Basic Backup

```bash
# Backup entire database
mongodump --out /backup/$(date +%Y%m%d_%H%M%S)

# Backup specific database
mongodump --db mydb --out /backup/mydb_backup

# Backup specific collection
mongodump --db mydb --collection users --out /backup/users_backup

# Backup with authentication
mongodump --uri "mongodb://user:password@localhost:27017/mydb?authSource=admin" \
  --out /backup/mydb_backup

# Backup with compression
mongodump --gzip --out /backup/compressed_backup

# Backup to archive file
mongodump --archive=/backup/mydb.archive --db mydb

# Backup with compression to archive
mongodump --archive=/backup/mydb.archive.gz --gzip --db mydb
```

### Advanced mongodump Options

```bash
# Backup with query filter
mongodump --db mydb --collection orders \
  --query '{"createdAt": {"$gte": {"$date": "2024-01-01T00:00:00Z"}}}'

# Parallel backup for large databases
mongodump --db mydb --numParallelCollections 4 --out /backup/parallel_backup

# Backup oplog for point-in-time recovery
mongodump --oplog --out /backup/with_oplog

# Exclude specific collections
mongodump --db mydb --excludeCollection logs --excludeCollection temp
```

### Basic Restore

```bash
# Restore entire backup
mongorestore /backup/20241215_120000

# Restore specific database
mongorestore --db mydb /backup/mydb_backup/mydb

# Restore specific collection
mongorestore --db mydb --collection users /backup/users_backup/mydb/users.bson

# Restore with authentication
mongorestore --uri "mongodb://user:password@localhost:27017/?authSource=admin" \
  /backup/mydb_backup

# Restore from archive
mongorestore --archive=/backup/mydb.archive

# Restore from compressed archive
mongorestore --archive=/backup/mydb.archive.gz --gzip
```

### Advanced mongorestore Options

```bash
# Drop existing data before restore
mongorestore --drop /backup/mydb_backup

# Restore to different database
mongorestore --db newdb /backup/mydb_backup/mydb

# Restore with oplog replay
mongorestore --oplogReplay /backup/with_oplog

# Parallel restore
mongorestore --numParallelCollections 4 /backup/parallel_backup

# Restore with write concern
mongorestore --writeConcern '{"w": "majority"}' /backup/mydb_backup

# Dry run - validate without actually restoring
mongorestore --dryRun /backup/mydb_backup
```

## Method 2: Filesystem Snapshots

For large databases, filesystem snapshots are faster than mongodump.

### LVM Snapshot Backup

```bash
#!/bin/bash
# LVM snapshot backup script

# Lock the database for consistent snapshot
mongosh --eval "db.fsyncLock()"

# Create LVM snapshot
lvcreate --size 10G --snapshot --name mongodb_snap /dev/vg0/mongodb_data

# Unlock the database
mongosh --eval "db.fsyncUnlock()"

# Mount and copy snapshot
mkdir -p /mnt/mongodb_snap
mount /dev/vg0/mongodb_snap /mnt/mongodb_snap

# Create backup archive
tar -czvf /backup/mongodb_$(date +%Y%m%d).tar.gz -C /mnt/mongodb_snap .

# Cleanup
umount /mnt/mongodb_snap
lvremove -f /dev/vg0/mongodb_snap
```

### Cloud Provider Snapshots

```bash
# AWS EBS Snapshot
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "MongoDB backup $(date +%Y%m%d)"

# GCP Disk Snapshot
gcloud compute disks snapshot mongodb-data \
  --snapshot-names mongodb-backup-$(date +%Y%m%d) \
  --zone us-central1-a

# Azure Managed Disk Snapshot
az snapshot create \
  --resource-group myResourceGroup \
  --source mongodb-datadisk \
  --name mongodb-snapshot-$(date +%Y%m%d)
```

## Method 3: Continuous Backup with Oplog

```bash
#!/bin/bash
# Continuous oplog backup script

BACKUP_DIR="/backup/oplog"
LAST_TS_FILE="/backup/last_timestamp"

# Get last timestamp
if [ -f "$LAST_TS_FILE" ]; then
  LAST_TS=$(cat $LAST_TS_FILE)
  QUERY="{ \"ts\": { \"\$gt\": { \"\$timestamp\": { \"t\": $LAST_TS } } } }"
else
  QUERY="{}"
fi

# Backup oplog entries
mongodump --db local --collection oplog.rs \
  --query "$QUERY" \
  --out "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"

# Update last timestamp
mongosh --quiet --eval "db.getSiblingDB('local').oplog.rs.find().sort({ts:-1}).limit(1).forEach(function(doc){ print(doc.ts.getTime()); })" > $LAST_TS_FILE
```

## Automated Backup Script

```bash
#!/bin/bash
# Production MongoDB backup script

set -e

# Configuration
BACKUP_DIR="/backup/mongodb"
RETENTION_DAYS=7
MONGODB_URI="mongodb://backup_user:password@localhost:27017/?authSource=admin"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# Logging
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory
mkdir -p $BACKUP_PATH

# Perform backup
log "Starting MongoDB backup"
mongodump --uri "$MONGODB_URI" \
  --gzip \
  --oplog \
  --out "$BACKUP_PATH"

# Verify backup
log "Verifying backup"
if [ -d "$BACKUP_PATH" ] && [ "$(ls -A $BACKUP_PATH)" ]; then
  BACKUP_SIZE=$(du -sh $BACKUP_PATH | cut -f1)
  log "Backup completed successfully. Size: $BACKUP_SIZE"
else
  log "ERROR: Backup directory is empty"
  exit 1
fi

# Calculate checksum
log "Calculating checksum"
find $BACKUP_PATH -type f -exec md5sum {} \; > "$BACKUP_PATH/checksums.md5"

# Compress entire backup directory
log "Creating backup archive"
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_PATH"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/$DATE.tar.gz" s3://my-backup-bucket/mongodb/

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days"
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup process completed"
```

## Restore Procedures

### Full Database Restore

```bash
#!/bin/bash
# Full restore script

BACKUP_ARCHIVE="/backup/mongodb/20241215_120000.tar.gz"
RESTORE_DIR="/tmp/mongodb_restore"

# Extract backup
mkdir -p $RESTORE_DIR
tar -xzf $BACKUP_ARCHIVE -C $RESTORE_DIR

# Stop application (prevent writes during restore)
# systemctl stop myapp

# Restore with drop
mongorestore --drop \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  --gzip \
  --oplogReplay \
  "$RESTORE_DIR/$(basename $BACKUP_ARCHIVE .tar.gz)"

# Cleanup
rm -rf $RESTORE_DIR

# Restart application
# systemctl start myapp

echo "Restore completed"
```

### Point-in-Time Recovery

```bash
# Restore base backup
mongorestore --drop --oplogReplay /backup/base_backup

# Apply oplog entries up to specific timestamp
mongorestore --oplogReplay \
  --oplogLimit "1702656000:1" \
  /backup/oplog_backup
```

### Selective Collection Restore

```bash
# Restore single collection without affecting others
mongorestore --db mydb --collection users \
  --drop \
  /backup/mydb_backup/mydb/users.bson

# Restore with different collection name
mongorestore --db mydb --collection users_restored \
  /backup/mydb_backup/mydb/users.bson
```

## Backup Verification

```javascript
// Verify backup integrity
const verifyBackup = async (backupPath) => {
  // Restore to temporary database
  const tempDb = 'backup_verify_' + Date.now();

  exec(`mongorestore --db ${tempDb} ${backupPath}`, (error) => {
    if (error) {
      console.error('Restore failed:', error);
      return;
    }

    // Compare document counts
    const sourceCount = db.collection.countDocuments();
    const backupCount = db.getSiblingDB(tempDb).collection.countDocuments();

    console.log(`Source: ${sourceCount}, Backup: ${backupCount}`);

    // Cleanup
    db.getSiblingDB(tempDb).dropDatabase();
  });
};
```

## Backup Monitoring

```javascript
// Monitor backup jobs
const backupStatus = {
  lastBackup: null,
  lastSize: null,
  errors: []
};

// Check backup health
app.get('/health/backup', (req, res) => {
  const hoursSinceBackup = (Date.now() - backupStatus.lastBackup) / 3600000;

  if (hoursSinceBackup > 24) {
    res.status(503).json({
      status: 'unhealthy',
      message: `Last backup was ${hoursSinceBackup.toFixed(1)} hours ago`
    });
  } else {
    res.json({
      status: 'healthy',
      lastBackup: backupStatus.lastBackup,
      size: backupStatus.lastSize
    });
  }
});
```

## Backup Strategy Best Practices

### 3-2-1 Rule

```mermaid
graph TD
    A[3-2-1 Backup Rule] --> B[3 Copies of Data]
    A --> C[2 Different Media Types]
    A --> D[1 Offsite Copy]

    B --> B1[Production]
    B --> B2[Local Backup]
    B --> B3[Remote Backup]

    C --> C1[Disk]
    C --> C2[Cloud Storage]

    D --> D1[Different Region]
    D --> D2[Different Provider]
```

### Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full Backup | Daily | 7 days |
| Incremental | Hourly | 24 hours |
| Weekly Full | Weekly | 4 weeks |
| Monthly Archive | Monthly | 12 months |

## Disaster Recovery Checklist

1. **Document recovery procedures** - Written runbooks for all scenarios
2. **Test restores regularly** - Monthly restore tests to verify backups work
3. **Monitor backup jobs** - Alert on failures or missed backups
4. **Secure backup storage** - Encrypt backups, restrict access
5. **Geographic redundancy** - Store backups in different regions
6. **Calculate RTO/RPO** - Know your recovery time and data loss tolerance
7. **Automate everything** - Manual processes fail under pressure

## Summary

MongoDB backup and restore is straightforward with the right tools and procedures. Use mongodump/mongorestore for portability and flexibility, filesystem snapshots for speed with large databases, and continuous oplog backup for minimal data loss. The key is automation, verification, and regular testing. Your backup is only as good as your last successful restore test.
