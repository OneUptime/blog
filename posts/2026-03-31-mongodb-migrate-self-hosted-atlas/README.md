# How to Migrate from Self-Hosted MongoDB to MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Migration, Cloud, Operation

Description: Learn how to migrate a self-hosted MongoDB deployment to MongoDB Atlas using mongodump/mongorestore, mongomirror, or Atlas Live Migration with minimal downtime.

---

## Migration Options Overview

Three main approaches exist for migrating self-hosted MongoDB to Atlas:

```mermaid
flowchart LR
    SelfHosted[Self-Hosted MongoDB] --> Option1[mongodump + mongorestore]
    SelfHosted --> Option2[mongomirror - live sync]
    SelfHosted --> Option3[Atlas Live Migration service]
    Option1 --> Downtime[Requires downtime window]
    Option2 --> MinimalDowntime[Minimal downtime - sync then cutover]
    Option3 --> MinimalDowntime
```

| Method | Downtime | Complexity | Best for |
|---|---|---|---|
| mongodump/mongorestore | Yes (hours for large DBs) | Low | Small datasets, dev/staging |
| mongomirror | Minimal | Medium | Medium datasets, production |
| Atlas Live Migration | Minimal | Low (UI-guided) | All sizes, easiest option |

## Method 1: mongodump and mongorestore

This method requires a downtime window while data transfers.

### Step 1: Stop writes to the source

For zero data loss, stop the application from writing to MongoDB before dumping.

### Step 2: Create an Atlas cluster

Create a cluster in Atlas with the same or higher MongoDB version as your self-hosted instance.

### Step 3: Dump the source database

```bash
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin&replicaSet=rs0" \
  --out /backup/migration-dump \
  --oplog \
  --gzip

echo "Dump size:"
du -sh /backup/migration-dump/
```

### Step 4: Restore to Atlas

```bash
# Get Atlas connection string from the Atlas UI or CLI
ATLAS_URI="mongodb+srv://atlasuser:password@mycluster.abcde.mongodb.net/?retryWrites=true&w=majority"

mongorestore \
  --uri "$ATLAS_URI" \
  --dir /backup/migration-dump \
  --oplogReplay \
  --gzip \
  --drop \
  --numParallelCollections 4

echo "Restore complete"
```

### Step 5: Verify document counts

```javascript
// On source (self-hosted)
use myapp;
db.getCollectionNames().forEach(c => {
  print(c + ": " + db[c].countDocuments());
});
```

```javascript
// On Atlas
use myapp;
db.getCollectionNames().forEach(c => {
  print(c + ": " + db[c].countDocuments());
});
```

## Method 2: mongomirror

`mongomirror` is a tool that continuously syncs data from a self-hosted replica set to Atlas, then you cut over with minimal downtime.

### Install mongomirror

Download `mongomirror` from the [MongoDB Download Center](https://www.mongodb.com/try/download/mongomirror) for your platform, then install it:

```bash
tar -xzf mongomirror-linux-x86_64-enterprise-*.tgz
sudo mv mongomirror /usr/local/bin/
```

### Step 1: Create Atlas cluster and user

Create the Atlas cluster (same or higher version). Create a database user with `atlasAdmin` or `readWriteAnyDatabase` and `clusterMonitor` roles.

Add your server's IP to the Atlas access list.

### Step 2: Start mongomirror

```bash
mongomirror \
  --host rs0/source-host1:27017,source-host2:27017,source-host3:27017 \
  --username admin \
  --password "source-password" \
  --authenticationDatabase admin \
  --destination "mycluster.abcde.mongodb.net" \
  --destinationUsername atlasadmin \
  --destinationPassword "atlaspassword" \
  --ssl \
  --sslCAFile /etc/ssl/certs/ca-certificates.crt
```

mongomirror performs an initial sync (copying all data), then enters continuous sync mode, replaying the oplog.

### Step 3: Monitor sync progress

mongomirror logs progress to stdout. Look for:

```text
[2026-03-31T10:00:00] Initial sync progress: 85% (850000/1000000 docs)
[2026-03-31T10:05:00] Initial sync complete. Entering continuous replication mode.
[2026-03-31T10:05:01] Oplog lag: 2s
```

### Step 4: Cutover

When oplog lag is near zero (1-3 seconds):

1. Stop application writes to the source.
2. Wait for mongomirror to report 0 oplog lag.
3. Update the application connection string to the Atlas URI.
4. Restart the application.
5. Stop mongomirror.

## Method 3: Atlas Live Migration

Atlas Live Migration is the easiest option, guided entirely through the Atlas UI.

### Step 1: Prepare the source

Ensure the source is a replica set (Atlas Live Migration requires a replica set, not a standalone).

```javascript
// Convert standalone to single-member replica set if needed
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})
```

### Step 2: Open Live Migration in Atlas

1. In the Atlas UI, click **Migrate Data to Atlas** in the left sidebar.
2. Click **Migrate from Self-Managed Deployment**.
3. Follow the guided wizard.

### Step 3: Provide source connection details

The wizard asks for:
- Source hostname and port (or replica set connection string)
- Source admin username and password
- Whether to use SSL

### Step 4: Run validation

Atlas validates connectivity and checks for compatibility. Review any warnings before proceeding.

### Step 5: Start migration and cut over

Atlas syncs the data. The wizard shows sync progress and estimated lag. When lag is near zero:

1. Click **Prepare to Cutover** in the Atlas wizard.
2. The wizard prompts you to stop writes to the source.
3. Click **Cutover** to finalize.
4. Update your application's connection string.

## Post-Migration Steps

### Update connection strings

Replace self-hosted connection strings with the Atlas SRV format:

```javascript
// Old self-hosted
const uri = "mongodb://admin:password@host1:27017,host2:27017/?replicaSet=rs0&authSource=admin";

// New Atlas
const uri = "mongodb+srv://appuser:password@mycluster.abcde.mongodb.net/myapp?retryWrites=true&w=majority";
```

### Verify indexes

```javascript
// Check that all expected indexes are present on Atlas
db.orders.getIndexes()
```

### Set up monitoring

Configure Atlas alerts for CPU, memory, connections, and oplog window. In the Atlas UI, go to **Alerts > Add Alert** and configure thresholds.

### Decommission the self-hosted deployment

Keep the self-hosted instance running for at least one week after cutover in case rollback is needed. Then decommission it.

## Summary

Migrating from self-hosted MongoDB to Atlas has three approaches: mongodump/mongorestore for simple cases with a downtime window; mongomirror for continuous sync with minimal downtime; and Atlas Live Migration for a wizard-guided experience. For production workloads, use mongomirror or Atlas Live Migration to minimize downtime. After migration, update connection strings to the Atlas SRV format, verify indexes and document counts, configure Atlas monitoring, and keep the source running for a rollback window before decommissioning.
