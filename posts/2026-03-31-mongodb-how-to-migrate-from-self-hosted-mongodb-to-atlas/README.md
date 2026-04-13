# How to Migrate from Self-Hosted MongoDB to Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Migration, Self-Hosted, Live Migration

Description: Migrate your self-hosted MongoDB deployment to MongoDB Atlas using Live Migration for near-zero downtime, or mongodump/mongorestore for smaller datasets.

---

## Migration Options

| Method | Downtime | Data Size | Complexity |
|---|---|---|---|
| Live Migration (Atlas UI) | Near-zero | Any | Low |
| mongodump / mongorestore | Required | Small-medium | Low |
| mongomirror | Near-zero | Any | Medium |
| Custom replication | Near-zero | Any | High |

Live Migration is recommended for most production migrations.

## Prerequisites

- MongoDB Atlas account with a target cluster (M10+)
- Source MongoDB 4.4 or later (for Live Migration)
- Network access from Atlas migration servers to source cluster
- Source cluster user with `backup` role

## Option 1: Live Migration (Recommended)

Live Migration copies data and tails the oplog continuously, then cuts over with a brief write-pause window.

### Step 1: Prepare the Source Cluster

Create a migration user on the source:

```javascript
db.createUser({
  user: "atlasLiveMigration",
  pwd: "MigrationPassword123!",
  roles: [
    { role: "backup", db: "admin" },
    { role: "readAnyDatabase", db: "admin" },
    { role: "clusterMonitor", db: "admin" }
  ]
})
```

Ensure the oplog is large enough to cover migration time:

```javascript
// Check oplog size and window
db.adminCommand({ replSetGetStatus: 1 })
rs.printReplicationInfo()
```

### Step 2: Open Port for Atlas Migration Servers

Atlas migration servers need to connect to your source. Allow inbound TCP on port 27017 from Atlas CIDR ranges for your cloud region. Get the ranges from Atlas UI during migration setup.

Or use a reverse SSH tunnel if your server is behind a firewall:

```bash
# On source server - tunnel port 27017 through your own jump host
ssh -R 27017:localhost:27017 user@your-jumpbox.example.com
```

### Step 3: Start Live Migration in Atlas

1. In Atlas, click your target cluster
2. Go to **Migrate Data to this Cluster**
3. Select **General Live Migration**
4. Enter source connection details:
   - Hostname and port: `source-mongo.example.com:27017`
   - Username/password for the migration user
   - SSL/TLS if enabled on source

### Step 4: Validate and Start

Atlas validates connectivity, then starts the initial sync (full data copy). During this phase the source cluster continues serving traffic normally.

Monitor progress in the Atlas UI.

### Step 5: Cutover

When "lag time" drops to near zero (the oplog tail is nearly caught up), initiate cutover:

1. Stop writes to the source cluster
2. Click **Start Cutover** in Atlas
3. Wait for the final sync to complete (seconds)
4. Update your application's connection string to the Atlas connection string
5. Resume writes on Atlas

## Option 2: mongodump / mongorestore

Best for smaller datasets (under 100GB) or if Live Migration is not available.

### Step 1: Dump the Source Database

```bash
# Full dump with oplog for point-in-time consistency
mongodump \
  --host source-mongo.example.com:27017 \
  --username adminUser \
  --password AdminPass123! \
  --authenticationDatabase admin \
  --oplog \
  --out /backup/mongo-dump-$(date +%Y%m%d)
```

### Step 2: Restore to Atlas

```bash
mongorestore \
  --uri "mongodb+srv://atlasUser:AtlasPass123!@cluster0.abc123.mongodb.net" \
  --oplogReplay \
  --drop \
  /backup/mongo-dump-20240115
```

`--oplogReplay` applies oplog entries to ensure consistency. `--drop` drops existing collections before restoring.

## Option 3: mongomirror

`mongomirror` is a MongoDB tool for zero-downtime migration similar to Live Migration but run locally:

```bash
# Install mongomirror
# Download from MongoDB Download Center

mongomirror \
  --host source-rs/source1:27017,source2:27017,source3:27017 \
  --username migrationUser \
  --password MigrationPass123! \
  --authenticationDatabase admin \
  --destination "cluster0-shard-00-00.abc123.mongodb.net:27017,cluster0-shard-00-01.abc123.mongodb.net:27017,cluster0-shard-00-02.abc123.mongodb.net:27017" \
  --destinationUsername atlasUser \
  --destinationPassword AtlasPass \
  --ssl
```

Wait for the `replication lag` to reach 0, then perform cutover.

## Post-Migration Steps

### Validate Data

```javascript
// Compare document counts
use appdb
db.getCollectionNames().forEach(coll => {
  print(coll + ": " + db[coll].estimatedDocumentCount())
})
```

Run on both source and target and compare.

### Recreate Indexes

`mongodump`/`mongorestore` preserves index definitions. Live Migration also migrates indexes. Verify:

```javascript
db.myCollection.getIndexes()
```

### Update Connection String

Replace self-hosted connection string:
```text
mongodb://user:pass@source-mongo.example.com:27017/appdb
```

With Atlas connection string:
```text
mongodb+srv://user:pass@cluster0.abc123.mongodb.net/appdb?retryWrites=true&w=majority
```

### Enable Atlas Features

Now that you're on Atlas, enable:

```bash
# Enable cloud backup
atlas backups schedule update myCluster --referenceHourOfDay 3

# Enable performance advisor monitoring
# (automatic on M10+)

# Configure auto-scaling
atlas clusters update myCluster --autoScalingComputeEnabled true
```

## Summary

Migrating from self-hosted MongoDB to Atlas is best done using Live Migration for near-zero downtime: create a migration user on source, configure network access for Atlas migration servers, start the migration in the Atlas UI, wait for lag to drop to zero, then cut over by updating your connection string. For smaller datasets, mongodump/mongorestore works reliably with a brief maintenance window. After migration, enable Cloud Backup, auto-scaling, and Performance Advisor to take full advantage of Atlas features.
