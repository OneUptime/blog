# How to Implement Backup with mongodump in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, mongodump, Disaster Recovery, Database Administration

Description: A comprehensive guide to backing up MongoDB databases using mongodump, including full and incremental backups, compression, restoration procedures, and automation strategies.

---

Data loss can destroy a business. Whether from hardware failure, software bugs, or human error, you need reliable backups. MongoDB provides mongodump for logical backups, capturing your data in a portable format that you can restore anywhere.

## Understanding Backup Options

MongoDB offers several backup methods:

```mermaid
flowchart TB
    Backup[Backup Strategy]
    Backup --> Logical[Logical Backup]
    Backup --> Physical[Physical Backup]
    Backup --> Cloud[Cloud Backup]

    Logical --> mongodump[mongodump/mongorestore]
    Physical --> Snapshot[Filesystem Snapshots]
    Physical --> Copy[File Copy with fsyncLock]
    Cloud --> Atlas[Atlas Continuous Backup]
    Cloud --> OpsManager[Ops Manager]
```

mongodump is ideal when you need:
- Portable backups across different MongoDB versions
- Selective backup of specific databases or collections
- Human-readable backup format (BSON/JSON)
- Cross-platform compatibility

## Basic mongodump Usage

### Backup Entire Server

```bash
# Backup all databases to ./dump directory
mongodump --uri="mongodb://user:password@localhost:27017"

# Specify output directory
mongodump --uri="mongodb://localhost:27017" --out=/backup/mongo-$(date +%Y%m%d)
```

### Backup Single Database

```bash
# Backup specific database
mongodump --uri="mongodb://localhost:27017" --db=myapp --out=/backup/myapp-backup
```

### Backup Single Collection

```bash
# Backup one collection
mongodump --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --out=/backup/orders-backup
```

## Authentication Options

### Using Connection String

```bash
# Full connection string with authentication
mongodump --uri="mongodb://adminUser:password@mongo1:27017,mongo2:27017/?authSource=admin&replicaSet=rs0"
```

### Using Separate Parameters

```bash
# Separate authentication parameters
mongodump --host=localhost \
  --port=27017 \
  --username=adminUser \
  --password=secretPassword \
  --authenticationDatabase=admin \
  --out=/backup/full-backup
```

### Using Password File

```bash
# Store password in file for scripts
echo "secretPassword" > /etc/mongo-backup-password
chmod 600 /etc/mongo-backup-password

# Reference password file
mongodump --uri="mongodb://adminUser@localhost:27017/admin" \
  --password=$(cat /etc/mongo-backup-password) \
  --out=/backup/full-backup
```

## Compression and Performance

### Enabling Compression

```bash
# Create compressed archive (recommended for large databases)
mongodump --uri="mongodb://localhost:27017" \
  --archive=/backup/full-backup.gz \
  --gzip

# Compress individual collection files
mongodump --uri="mongodb://localhost:27017" \
  --out=/backup/full-backup \
  --gzip
```

### Parallel Dumping

```bash
# Use multiple parallel collections (default is 4)
mongodump --uri="mongodb://localhost:27017" \
  --numParallelCollections=8 \
  --out=/backup/full-backup
```

## Filtering Data

### Query-Based Backup

```bash
# Backup only documents matching a query
mongodump --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --query='{"status": "completed", "createdAt": {"$gte": {"$date": "2026-01-01T00:00:00Z"}}}' \
  --out=/backup/completed-orders
```

### Excluding Collections

```bash
# Exclude specific collections
mongodump --uri="mongodb://localhost:27017" \
  --db=myapp \
  --excludeCollection=logs \
  --excludeCollection=sessions \
  --out=/backup/myapp-no-logs
```

## Backup from Replica Set

### Read from Secondary

To reduce load on the primary:

```bash
# Force read from secondary member
mongodump --uri="mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0&readPreference=secondary" \
  --out=/backup/full-backup
```

### Point-in-Time Backup with Oplog

```bash
# Include oplog for point-in-time recovery
mongodump --uri="mongodb://localhost:27017" \
  --oplog \
  --out=/backup/pit-backup
```

The oplog captures changes during the backup, enabling consistent restore.

## Restoring Backups

### Full Restore

```bash
# Restore everything from backup directory
mongorestore --uri="mongodb://localhost:27017" /backup/full-backup

# Restore from compressed archive
mongorestore --uri="mongodb://localhost:27017" \
  --archive=/backup/full-backup.gz \
  --gzip
```

### Restore Single Database

```bash
# Restore specific database
mongorestore --uri="mongodb://localhost:27017" \
  --db=myapp \
  /backup/full-backup/myapp

# Restore to different database name
mongorestore --uri="mongodb://localhost:27017" \
  --db=myapp_restored \
  /backup/full-backup/myapp
```

### Restore Single Collection

```bash
# Restore one collection
mongorestore --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  /backup/full-backup/myapp/orders.bson
```

### Point-in-Time Restore

```bash
# Restore with oplog replay
mongorestore --uri="mongodb://localhost:27017" \
  --oplogReplay \
  /backup/pit-backup
```

### Handling Existing Data

```bash
# Drop existing collections before restore (careful!)
mongorestore --uri="mongodb://localhost:27017" \
  --drop \
  /backup/full-backup

# Skip documents that cause duplicate key errors
mongorestore --uri="mongodb://localhost:27017" \
  --noIndexRestore \
  --maintainInsertionOrder \
  /backup/full-backup
```

## Automated Backup Script

Create a production-ready backup script:

```bash
#!/bin/bash
# mongodb-backup.sh

set -e

# Configuration
MONGO_URI="mongodb://backupUser:password@mongo1:27017,mongo2:27017,mongo3:27017/?authSource=admin&replicaSet=rs0&readPreference=secondary"
BACKUP_DIR="/backup/mongodb"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Run backup
log "Starting MongoDB backup to ${BACKUP_PATH}"

mongodump \
    --uri="${MONGO_URI}" \
    --out="${BACKUP_PATH}" \
    --oplog \
    --gzip \
    --numParallelCollections=4

# Check backup success
if [ $? -eq 0 ]; then
    log "Backup completed successfully"

    # Calculate backup size
    BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
    log "Backup size: ${BACKUP_SIZE}"

    # Create checksum
    find "${BACKUP_PATH}" -type f -exec md5sum {} \; > "${BACKUP_PATH}/checksums.md5"

    # Compress entire backup directory
    log "Compressing backup..."
    tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${DATE}"
    rm -rf "${BACKUP_PATH}"

    log "Compressed backup: ${BACKUP_PATH}.tar.gz"
else
    log "ERROR: Backup failed!"
    rm -rf "${BACKUP_PATH}"
    exit 1
fi

# Clean up old backups
log "Removing backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Upload to remote storage (example with AWS S3)
if command -v aws &> /dev/null; then
    log "Uploading to S3..."
    aws s3 cp "${BACKUP_PATH}.tar.gz" "s3://my-backup-bucket/mongodb/${DATE}.tar.gz"
    log "S3 upload complete"
fi

log "Backup process finished"
```

### Schedule with Cron

```bash
# Edit crontab
crontab -e

# Run backup daily at 2 AM
0 2 * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1

# Run backup every 6 hours
0 */6 * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

## Monitoring Backups

### Verify Backup Integrity

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1

# Extract and verify
tar -tzf "${BACKUP_FILE}" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Archive integrity: OK"
else
    echo "Archive integrity: FAILED"
    exit 1
fi

# Test restore to temporary database
TEMP_DIR=$(mktemp -d)
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

mongorestore \
    --uri="mongodb://localhost:27017" \
    --db=backup_verification_test \
    --drop \
    --gzip \
    "${TEMP_DIR}"/*/myapp

# Verify document counts
EXPECTED_COUNT=$(cat "${TEMP_DIR}/*/myapp/orders.metadata.json" | jq '.options.count // 0')
ACTUAL_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('backup_verification_test').orders.countDocuments()")

if [ "${EXPECTED_COUNT}" -eq "${ACTUAL_COUNT}" ]; then
    echo "Document count verification: OK"
else
    echo "Document count verification: FAILED (expected ${EXPECTED_COUNT}, got ${ACTUAL_COUNT})"
fi

# Cleanup
mongosh --quiet --eval "db.getSiblingDB('backup_verification_test').dropDatabase()"
rm -rf "${TEMP_DIR}"
```

## Best Practices

### Backup Checklist

- [ ] Backup runs from secondary to reduce primary load
- [ ] Oplog included for point-in-time recovery
- [ ] Compression enabled for storage efficiency
- [ ] Backups verified regularly with test restores
- [ ] Offsite copies stored (S3, GCS, Azure Blob)
- [ ] Retention policy implemented
- [ ] Monitoring alerts for backup failures
- [ ] Documentation for restore procedures

### Restore Testing Schedule

```bash
# Monthly restore test
0 3 1 * * /usr/local/bin/test-restore.sh >> /var/log/restore-test.log 2>&1
```

### Backup Timing Considerations

- Schedule during low-traffic periods
- Allow enough time for completion
- Monitor backup duration trends
- Alert if backups take longer than expected

---

Backups are worthless until you test the restore. Schedule regular backup verification, store copies offsite, and document your recovery procedures. When disaster strikes, you will be glad you invested the time in a proper backup strategy using mongodump.
