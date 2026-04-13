# How to Migrate from MongoDB 4.x to 5.x

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Database Upgrade, Replica Set, Compatibility

Description: Step-by-step guide to safely migrating your MongoDB deployment from version 4.x to 5.x with minimal downtime.

---

## Overview

Upgrading MongoDB from 4.x to 5.x brings new features like time-series collections, live resharding, and serverless instances (Atlas). However, the migration must be done carefully to avoid data loss or downtime. This guide covers the recommended rolling upgrade approach for replica sets and sharded clusters.

## Prerequisites

Before starting the migration, ensure you meet these requirements:

- All replica set members run MongoDB 4.4 (the latest 4.x release)
- Feature Compatibility Version (FCV) is set to 4.4
- You have a recent full backup
- Your drivers support MongoDB 5.0 (check the MongoDB compatibility matrix)

Check current FCV:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Step 1 - Backup Your Data

Always take a backup before any major upgrade.

```bash
mongodump --uri="mongodb://localhost:27017" --out=/backup/mongo-4x-backup
```

For Atlas clusters, use the Atlas UI to trigger an on-demand snapshot.

## Step 2 - Review Removed and Deprecated Features

MongoDB 5.0 removes several deprecated operators and configuration options. Audit your application code for:

- `$where` and other server-side JavaScript expressions are deprecated - plan to migrate away from them
- `mongo` shell replaced by `mongosh`
- `db.collection.count()` deprecated since 4.0 - use `countDocuments()` or `estimatedDocumentCount()`

```javascript
// Deprecated - avoid
db.orders.count({ status: "active" })

// Preferred
db.orders.countDocuments({ status: "active" })
```

## Step 3 - Upgrade Replica Set Members

Use a rolling upgrade to avoid downtime. Upgrade secondaries first, then the primary.

```bash
# 1. Stop one secondary
sudo systemctl stop mongod

# 2. Install MongoDB 5.x packages
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org=5.0.24

# 3. Restart the secondary
sudo systemctl start mongod
```

Repeat for each secondary. Then step down and upgrade the primary:

```javascript
// Step down the primary
rs.stepDown()
```

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=5.0.24
sudo systemctl start mongod
```

## Step 4 - Verify Replica Set Health

After upgrading all members, verify the replica set is healthy:

```javascript
rs.status()
```

All members should show state `PRIMARY` (1) or `SECONDARY` (2) with `health: 1`.

## Step 5 - Update Feature Compatibility Version

Once all members run 5.0, update the FCV:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "5.0" })
```

To downgrade FCV later, run `db.adminCommand({ setFeatureCompatibilityVersion: "4.4" })` but you must first remove any 5.0-specific features (e.g., drop time-series collections).

## Step 6 - Update Application Drivers

Update your MongoDB drivers to versions compatible with 5.0:

```bash
# Node.js
npm install mongodb@4

# Python
pip install pymongo==4.3.3

# Java (Maven)
# Update pom.xml to mongodb-driver-sync:4.8.2
```

## Step 7 - Test New Features

Take advantage of MongoDB 5.0 features:

```javascript
// Create a time-series collection (new in 5.0)
db.createCollection("temperatures", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  }
})

// Insert time-series data
db.temperatures.insertMany([
  { timestamp: new Date(), sensorId: "sensor-1", temperature: 22.5 },
  { timestamp: new Date(), sensorId: "sensor-2", temperature: 23.1 }
])
```

## Rollback Plan

If issues arise, roll back using your backup:

```bash
mongorestore --uri="mongodb://localhost:27017" --drop /backup/mongo-4x-backup
```

Note: To downgrade from 5.0 to 4.4, you must first set FCV back to "4.4" and remove any 5.0-specific features before downgrading the binaries.

## Summary

Migrating from MongoDB 4.x to 5.x involves upgrading all replica set members one at a time using a rolling upgrade, verifying cluster health, and then bumping the Feature Compatibility Version. Update your application drivers and audit deprecated APIs before and after migration to ensure a smooth transition.
