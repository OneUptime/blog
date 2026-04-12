# How to Use mongodump and mongorestore in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Mongodump, mongorestore, Data Recovery

Description: Learn how to use mongodump and mongorestore to back up and restore MongoDB databases, collections, and individual documents with practical examples and best practices.

---

## What are mongodump and mongorestore

`mongodump` exports the contents of a MongoDB instance or database to BSON files. `mongorestore` reads those BSON files and imports them back into MongoDB.

Together they provide a simple logical backup and restore mechanism suitable for:
- Periodic database snapshots.
- Migrating data between environments.
- Archiving specific collections.
- Disaster recovery for smaller datasets.

```mermaid
flowchart LR
    A[MongoDB Instance] -->|mongodump| B["dump/ directory\n(BSON + JSON metadata)"]
    B -->|mongorestore| C[MongoDB Instance]
```

## Prerequisites

Install the MongoDB Database Tools package:

```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# macOS with Homebrew
brew install mongodb/brew/mongodb-database-tools

# Verify installation
mongodump --version
mongorestore --version
```

## mongodump Examples

### Dump All Databases

```bash
mongodump --uri="mongodb://localhost:27017" --out=/backup/all-dbs
```

Creates a directory structure like:

```text
/backup/all-dbs/
  myapp/
    users.bson
    users.metadata.json
    orders.bson
    orders.metadata.json
  admin/
    system.users.bson
    ...
```

### Dump a Specific Database

```bash
mongodump \
  --uri="mongodb://localhost:27017/myapp" \
  --out=/backup/myapp-$(date +%Y%m%d)
```

### Dump a Specific Collection

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --out=/backup/orders-backup
```

### Dump with Query Filter

Export only active orders:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --query='{"status":"active"}' \
  --out=/backup/active-orders
```

### Dump with Compression (gzip)

```bash
mongodump \
  --uri="mongodb://user:pass@host:27017" \
  --db=myapp \
  --gzip \
  --archive=/backup/myapp-$(date +%Y%m%d).gz
```

Using `--archive` with `--gzip` produces a single compressed archive file.

### Dump from a Replica Set

Always dump from a secondary to reduce load on the primary:

```bash
mongodump \
  --uri="mongodb://host1:27017,host2:27018,host3:27019/?replicaSet=rs0&readPreference=secondary" \
  --db=myapp \
  --out=/backup/myapp-$(date +%Y%m%d)
```

### Dump with Oplog (Point-in-Time)

The `--oplog` flag captures oplog entries during the dump, enabling a point-in-time restore:

```bash
mongodump \
  --uri="mongodb://localhost:27017/?replicaSet=rs0" \
  --oplog \
  --out=/backup/myapp-pitr
```

## mongorestore Examples

### Restore All Databases

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  /backup/all-dbs/
```

### Restore a Specific Database

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  /backup/myapp-20260331/myapp/
```

### Restore a Specific Collection

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  /backup/myapp-20260331/myapp/orders.bson
```

### Restore with Drop (Overwrite Existing)

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --drop \
  /backup/myapp-20260331/myapp/
```

### Restore from Compressed Archive

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --gzip \
  --archive=/backup/myapp-20260331.gz
```

### Restore to a Different Database Name

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --nsFrom="myapp.*" \
  --nsTo="myapp_restored.*" \
  /backup/myapp-20260331/
```

### Restore with Oplog Replay

```bash
mongorestore \
  --uri="mongodb://localhost:27017/?replicaSet=rs0" \
  --oplogReplay \
  /backup/myapp-pitr/
```

## Automated Backup Script

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
MONGO_URI="mongodb://backupuser:password@localhost:27017/?authSource=admin"

# Create backup
echo "[$(date)] Starting backup..."
mongodump \
  --uri="$MONGO_URI&readPreference=secondary" \
  --gzip \
  --archive="${BACKUP_DIR}/backup_${DATE}.gz"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup successful: backup_${DATE}.gz"
else
  echo "[$(date)] ERROR: Backup failed"
  exit 1
fi

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "backup_*.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Removed backups older than ${RETENTION_DAYS} days"
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /opt/scripts/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

## Node.js: Triggering mongodump Programmatically

```javascript
const { exec } = require("child_process");
const path = require("path");

function backupDatabase(dbName, outputDir) {
  const date = new Date().toISOString().split("T")[0];
  const backupPath = path.join(outputDir, `${dbName}-${date}.gz`);
  const cmd = [
    "mongodump",
    `--uri="mongodb://localhost:27017/${dbName}"`,
    "--gzip",
    `--archive=${backupPath}`
  ].join(" ");

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Backup failed: ${stderr}`));
      } else {
        resolve(backupPath);
      }
    });
  });
}

backupDatabase("myapp", "/var/backups/mongodb")
  .then(path => console.log("Backup created:", path))
  .catch(err => console.error("Backup error:", err.message));
```

## Limitations

- `mongodump`/`mongorestore` are not suitable for live backups of large databases where consistency across collections is required - use filesystem snapshots or MongoDB Atlas Backup for that.
- Restore time is proportional to data size - very large databases may take hours.
- `--oplog` only works on replica sets (not standalone instances).
- Does not capture data from `system.profile` or `local.*` collections by default.

## Best Practices

- **Always dump from a secondary** to avoid adding load to the primary.
- **Use `--gzip --archive` for single-file compressed backups** that are easier to manage and transfer.
- **Test restores regularly** in a staging environment to verify backup integrity.
- **Use `--oplog` on replica sets** to ensure consistency across all collections at a single point in time.
- **Automate and monitor backups** with a cron job and alerting on failure.
- **Store backups offsite** (S3, GCS, Azure Blob) to protect against server loss.
- **Restrict the backup user permissions** - a user with `backup` role is sufficient for `mongodump`.

## Summary

`mongodump` exports MongoDB data to BSON files and `mongorestore` imports them back. Use `--uri` for connection strings, `--db` and `--collection` to scope the backup, `--gzip --archive` for compressed single-file output, and `--oplog` on replica sets for consistent point-in-time backups. Schedule automated backups with cron, store them offsite, and regularly verify restores in a staging environment.
