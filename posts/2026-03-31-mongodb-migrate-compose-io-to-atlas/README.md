# How to Migrate from Compose.io to MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Compose, Migration, Cloud Database

Description: Guide for migrating your MongoDB deployment from Compose.io (IBM) to MongoDB Atlas using mongodump, Live Migration, and connection string updates.

---

## Overview

Compose.io was a database-as-a-service platform acquired by IBM that offered managed MongoDB deployments. Teams migrating away from Compose.io to MongoDB Atlas benefit from the official managed experience, Atlas Search, and better integration with modern tooling.

## Assess Your Compose.io Deployment

Before migrating, document your current Compose.io setup:

```text
Pre-migration inventory:
- [ ] Compose.io connection string (hostname, port, database name, SSL settings)
- [ ] MongoDB version running on Compose.io
- [ ] Total data size across collections
- [ ] All database users and permissions
- [ ] Active applications using Compose.io credentials
- [ ] Current backup policy
```

Connect to Compose.io and inventory collections:

```javascript
// Inventory collections and sizes
db.getCollectionNames().forEach(function(name) {
  const s = db.getCollection(name).stats();
  printjson({ collection: name, count: s.count, sizeMB: (s.size / 1048576).toFixed(2) });
});
```

## Create MongoDB Atlas Target Cluster

Create your Atlas cluster before starting the migration:

```bash
# Atlas CLI
atlas clusters create myCluster \
  --provider AWS \
  --region US_EAST_1 \
  --tier M10 \
  --mdbVersion 7.0

# Whitelist your IP for migration tools
atlas accessLists create --currentIp --comment "migration-host"
```

## Option 1: Offline Migration with mongodump

For smaller databases or planned downtime windows, use `mongodump` and `mongorestore`:

```bash
# Export from Compose.io (note: Compose uses SSL by default)
mongodump \
  --host "candidate.47.mongolayer.com:10601" \
  --ssl \
  --sslAllowInvalidCertificates \
  --username composeuser \
  --password composepass \
  --db mydb \
  --out /backup/compose-export \
  --gzip

# Restore to Atlas
mongorestore \
  --uri="mongodb+srv://atlasuser:atlaspass@cluster0.example.mongodb.net/mydb" \
  --gzip \
  --drop \
  --dir /backup/compose-export/mydb
```

## Option 2: Live Migration with mongomirror

Note: `mongomirror` reached End of Life on July 31, 2025. MongoDB recommends using the Atlas Live Migration Service in the Atlas UI or `mongosync` for new migrations. The instructions below still apply if you are using `mongomirror`.

For minimal downtime, use `mongomirror` to sync data from Compose.io to Atlas while your application keeps running:

```bash
# Download mongomirror from MongoDB tools
# Run mongomirror to continuously sync
./mongomirror \
  --host "compose-rs/compose-host:10601" \
  --username composeuser \
  --password composepass \
  --ssl \
  --destination "atlas-abc123-shard-0/cluster0-shard-00-00.abc123.mongodb.net:27017,cluster0-shard-00-01.abc123.mongodb.net:27017,cluster0-shard-00-02.abc123.mongodb.net:27017" \
  --destinationUsername atlasuser \
  --destinationPassword atlaspass
```

Monitor sync progress:

```bash
# mongomirror outputs progress:
# 2026-03-31T10:00:00.000 [sync] Progress: 45000/120000 (37.5%)
# 2026-03-31T10:05:00.000 [sync] Caught up to oplog, monitoring for new changes
```

Once `mongomirror` reports it is caught up to the oplog, you can cut over.

## Configure SSL for Compose.io Connection

Compose.io requires SSL with a specific CA certificate:

```bash
# Download Compose CA cert (find in Compose dashboard)
curl -o compose-ca.crt "https://dl.compose.io/ssl/compose-ca-2021.crt"

# Use with mongodump
mongodump \
  --host compose-host:10601 \
  --ssl \
  --sslCAFile compose-ca.crt \
  --username composeuser \
  --password composepass \
  --db mydb \
  --out /backup/compose-export
```

## Update Application Connection Strings

```bash
# Before (Compose.io format)
MONGO_URI=mongodb://user:pass@candidate.47.mongolayer.com:10601/mydb?ssl=true

# After (Atlas SRV)
MONGO_URI=mongodb+srv://user:pass@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority
```

## Recreate Users in Atlas

Compose.io database users must be recreated in Atlas. Atlas does not support `db.createUser()` via mongosh — any user modifications made that way are automatically rolled back. Use the Atlas UI, Atlas CLI, or the Atlas Administration API instead:

```bash
# Create user in Atlas via Atlas CLI
atlas dbusers create \
  --username appuser \
  --password newSecurePassword \
  --role readWrite@mydb
```

## Validate the Migration

```javascript
// Validate counts on Atlas
use mydb
db.getCollectionNames().forEach(name => {
  print(`${name}: ${db.getCollection(name).countDocuments({})}`);
});
```

## Summary

Migrating from Compose.io to MongoDB Atlas follows the same pattern as other MongoDB cloud migrations: inventory collections, create the Atlas target cluster, export using `mongodump` (offline) or `mongomirror` (live), restore to Atlas, recreate users, update connection strings, and validate. For production migrations, use `mongomirror` for near-zero downtime cutover.
