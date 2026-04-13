# How to Use mongodump to Back Up a MongoDB Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Mongodump, Database Administration

Description: Learn how to use mongodump to create backups of MongoDB databases, including full backups, collection-specific backups, and options for replica sets and Atlas.

---

## Overview

`mongodump` is the official MongoDB backup tool that creates BSON files representing a snapshot of your database. It reads data from a live MongoDB instance and writes it to disk in a format that can be restored using `mongorestore`. While not suitable for very large datasets (filesystem snapshots are preferred for terabyte-scale databases), mongodump is the standard tool for small to medium-sized MongoDB deployments.

## Installation

`mongodump` is part of MongoDB Database Tools:

```bash
# Check if installed
mongodump --version

# Install on Ubuntu/Debian
sudo apt-get install -y mongodb-database-tools
```

## Basic Usage

```bash
# Dump all databases to ./dump/ directory
mongodump

# Specify output directory
mongodump --out /backup/mongodb

# Connect to a specific host
mongodump --host localhost --port 27017 --out /backup/mongodb

# With authentication
mongodump --uri "mongodb://admin:secret@localhost:27017" --out /backup/mongodb

# Using URI (recommended)
mongodump --uri "mongodb://admin:secret@localhost:27017/?authSource=admin"   --out /backup/mongodb
```

## Backing Up a Specific Database

```bash
# Backup only the 'mydb' database
mongodump --db mydb --out /backup/mongodb

# With authentication and specific database
mongodump --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --out /backup/mongodb
```

## Backing Up a Specific Collection

```bash
# Backup only the orders collection from mydb
mongodump --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --out /backup/mongodb
```

## Backing Up to a Compressed Archive

Instead of separate BSON files, create a single compressed archive:

```bash
# Create a gzip-compressed archive
mongodump --uri "mongodb://admin:secret@localhost:27017"   --archive=/backup/mongodb-backup-$(date +%Y%m%d).gz   --gzip

# Dump to stdout for piping
mongodump --uri "mongodb://admin:secret@localhost:27017"   --archive   --gzip > /backup/mongodb-$(date +%Y%m%d).gz
```

## Reading from a Secondary (Replica Set)

Reading from a secondary reduces load on the primary:

```bash
# Read from a specific secondary
mongodump --uri "mongodb://mongo2:27017/?readPreference=secondary"   --out /backup/mongodb

# Read preferring secondaries
mongodump --uri "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/mydb?replicaSet=rs0&readPreference=secondaryPreferred"   --out /backup/mongodb
```

## Filtering Which Documents to Backup

```bash
# Backup only documents matching a query
mongodump --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --query '{"status": "completed"}'   --out /backup/mongodb

# Using a query file
echo '{"createdAt": {"$gte": {"$date": "2026-01-01T00:00:00Z"}}}' > /tmp/query.json
mongodump --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --queryFile /tmp/query.json   --out /backup/mongodb
```

## Excluding Collections

```bash
# Exclude specific collections from backup
mongodump --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --excludeCollection=sessions   --excludeCollection=cache   --out /backup/mongodb
```

## Output Directory Structure

```bash
# After running mongodump, the structure is:
ls /backup/mongodb/mydb/

# Output:
# orders.bson        <- document data
# orders.metadata.json   <- index definitions and options
# users.bson
# users.metadata.json
```

## Automated Backup Script

```bash
#!/bin/bash
# mongodb-backup.sh

BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7
MONGO_URI="mongodb://admin:secret@localhost:27017"

# Create timestamped backup directory
BACKUP_PATH="${BACKUP_DIR}/${DATE}"
mkdir -p "${BACKUP_PATH}"

# Run backup
mongodump --uri "${MONGO_URI}"   --out "${BACKUP_PATH}"   --gzip

# Check if backup succeeded
if [ $? -eq 0 ]; then
  echo "Backup succeeded: ${BACKUP_PATH}"
else
  echo "Backup FAILED"
  exit 1
fi

# Remove backups older than retention period
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
echo "Old backups cleaned up"
```

## Summary

`mongodump` creates portable BSON backups of MongoDB databases and collections, with options for filtering documents, excluding collections, and creating compressed archives. For replica sets, reading from a secondary reduces impact on your primary. The archive mode with `--gzip` produces single compressed files ideal for offsite storage. Always test restores using `mongorestore` to verify backup integrity before relying on them for disaster recovery.
