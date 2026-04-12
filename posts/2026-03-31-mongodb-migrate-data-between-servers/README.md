# How to Migrate MongoDB Data Between Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Mongodump, mongorestore, Data Transfer

Description: Migrate MongoDB data between servers using mongodump, mongorestore, or live sync methods with minimal downtime for your application.

---

## Migration Strategies Overview

Migrating MongoDB data between servers depends on your tolerance for downtime and the size of the dataset:

- **mongodump/mongorestore** - Simple, works for most cases, requires downtime or catch-up
- **Replica set initial sync** - Add new server as a replica, then promote it
- **MongoDB Atlas Live Migration** - Zero-downtime migration to Atlas
- **rsync of data files** - Fast for large datasets but requires a clean shutdown

## Method 1: mongodump and mongorestore

This is the most common approach for standalone instances.

### Step 1: Dump from source

```bash
mongodump \
  --host source-server:27017 \
  --username admin \
  --password secret \
  --authenticationDatabase admin \
  --out /backup/mongo-dump \
  --gzip
```

### Step 2: Transfer to destination

```bash
rsync -avz --progress /backup/mongo-dump/ user@dest-server:/backup/mongo-dump/
```

### Step 3: Restore on destination

```bash
mongorestore \
  --host dest-server:27017 \
  --username admin \
  --password secret \
  --authenticationDatabase admin \
  --gzip \
  --drop \
  /backup/mongo-dump
```

## Method 2: Replica Set Add-and-Remove

For near-zero downtime, add the new server as a replica member and let it sync:

```javascript
// On the primary, add the new member
rs.add("new-server:27017")

// Monitor sync progress
rs.status()
```

Once caught up, step down the old primary:

```javascript
rs.stepDown()
```

Then remove the old server:

```javascript
rs.remove("old-server:27017")
```

## Method 3: rsync Data Files (Fast for Large Datasets)

For very large datasets, sync the data files directly:

```bash
# Step 1: Stop MongoDB on source
sudo systemctl stop mongod

# Step 2: rsync data directory
rsync -avz --progress /var/lib/mongodb/ user@dest-server:/var/lib/mongodb/

# Step 3: Start MongoDB on destination
sudo systemctl start mongod

# Step 4: Restart MongoDB on source
sudo systemctl start mongod
```

This requires a maintenance window but is much faster for datasets over 100 GB.

## Verifying the Migration

After restore, verify document counts match:

```javascript
// Run on both source and destination
db.adminCommand({ listDatabases: 1 }).databases.forEach(dbInfo => {
  const database = db.getMongo().getDB(dbInfo.name);
  const count = database.getCollectionNames()
    .reduce((acc, col) => acc + database[col].countDocuments(), 0);
  print(dbInfo.name, ":", count, "documents");
});
```

## Summary

For most migrations, `mongodump` and `mongorestore` with `--gzip` compression provide a reliable path. For large datasets or minimal downtime requirements, adding the destination as a replica set member is the preferred approach. Always verify document counts and spot-check data after migration to confirm integrity.
