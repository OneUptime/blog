# How to Migrate from MongoDB 5.0 to MongoDB 7.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Upgrade, Version, Operation

Description: Step-by-step guide to upgrading a MongoDB replica set from version 5.0 to 7.0 with intermediate stops at 6.0, including FCV management and compatibility checks.

---

## Upgrade Path Overview

MongoDB requires upgrading one major version at a time. The path from 5.0 to 7.0 requires an intermediate stop at 6.0:

```mermaid
flowchart LR
    v50[MongoDB 5.0] --> v60[MongoDB 6.0]
    v60 --> v70[MongoDB 7.0]
    v50 -->|Not supported| v70
```

Each step requires setting the Feature Compatibility Version (FCV) to the current version before proceeding to the next major version.

## Benefits of Upgrading to 7.0

- Queryable Encryption with range queries (production-ready)
- Compound wildcard indexes
- Atlas Search improvements (on Atlas)
- `$percentile` and `$median` aggregation operators
- Improved time-series collection performance
- Slot-Based Query Execution Engine (SBE) expanded to more query types

## Pre-Upgrade Checklist

```javascript
// Check current version
db.serverStatus().version

// Check current FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Check replica set health
rs.status()

// Review slow queries that might behave differently
db.getSiblingDB("myapp").system.profile.find(
  { millis: { $gt: 100 } }
).sort({ millis: -1 }).limit(10)
```

Review the MongoDB 6.0 and 7.0 compatibility notes for deprecated or removed features relevant to your workload.

## Back Up Before Starting

```bash
# Full backup with mongodump
mongodump \
  --uri "mongodb://admin:password@host1:27017,host2:27017,host3:27017/?replicaSet=rs0&authSource=admin" \
  --out /backup/mongodb-pre-upgrade-$(date +%Y%m%d) \
  --oplog

# Verify
mongorestore --dryRun --uri "mongodb://admin:password@localhost:27017/?authSource=admin" \
  /backup/mongodb-pre-upgrade-$(date +%Y%m%d)
```

## Phase 1: Upgrade from 5.0 to 6.0

### Upgrade each secondary

On each secondary node:

```bash
# Stop mongod service
sudo systemctl stop mongod

# Add 6.0 repository (Ubuntu 22.04)
wget -qO- https://www.mongodb.org/static/pgp/server-6.0.asc | \
  sudo tee /etc/apt/trusted.gpg.d/server-6.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org=6.0.* mongodb-org-server=6.0.* \
  mongodb-org-shell=6.0.* mongodb-org-mongos=6.0.* mongodb-org-tools=6.0.*

# Start the upgraded secondary
sudo systemctl start mongod
```

Wait for the secondary to sync:

```javascript
// On the secondary - wait until lag is near zero
rs.printSecondaryReplicationInfo()
```

### Upgrade the primary

Step down the current primary:

```javascript
rs.stepDown(60)
```

After a new primary is elected, upgrade the old primary (now a secondary) using the same package installation steps.

### Set FCV to 6.0

Connect to the new primary and set FCV:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "6.0" })
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// Expected: { version: "6.0" }
```

## Phase 2: Upgrade from 6.0 to 7.0

Verify all members are healthy on 6.0 before proceeding:

```javascript
rs.status().members.forEach(m => {
  print(`${m.name}: state=${m.stateStr}, health=${m.health}`);
});
```

### Upgrade each secondary to 7.0

```bash
sudo systemctl stop mongod

wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org=7.0.* mongodb-org-server=7.0.* \
  mongodb-org-shell=7.0.* mongodb-org-mongos=7.0.* mongodb-org-tools=7.0.*

sudo systemctl start mongod
```

Repeat for each secondary, then step down the primary and upgrade it.

### Set FCV to 7.0

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// Expected: { version: "7.0" }
```

## Key Changes in MongoDB 6.0

- `$lookup` performance improvements
- Clustered collections (no separate `_id` index on collections with range queries on `_id`)
- `$setWindowFields` enhancements
- Time-series collection improvements

## Key Changes in MongoDB 7.0

New aggregation operators:

```javascript
// $percentile - compute percentile values
db.orders.aggregate([
  {
    $group: {
      _id: null,
      p95: { $percentile: { input: "$amount", p: [0.95], method: "approximate" } },
      median: { $median: { input: "$amount", method: "approximate" } }
    }
  }
])
```

Compound wildcard indexes (new in 7.0):

```javascript
// Index any field under attributes + a specific field
db.products.createIndex({ category: 1, "attributes.$**": 1 })
```

## Driver Compatibility

Before upgrading, verify your MongoDB drivers support 7.0:

| Driver | Minimum version for 7.0 |
|---|---|
| Node.js | 5.x |
| Python (PyMongo) | 4.x |
| Java | 4.x |
| Go | 1.x (latest) |
| C# | 2.x |

Update drivers before or immediately after upgrading MongoDB. The driver release notes contain any required API changes.

## Post-Upgrade Validation

```javascript
// Confirm version and FCV
print("Version:", db.serverStatus().version);
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });

// Check replica set is healthy
rs.status().members.forEach(m => {
  if (m.health !== 1) print("UNHEALTHY:", m.name, m.stateStr);
  else print("OK:", m.name, m.stateStr);
});

// Run a test aggregation using a 7.0 feature
db.orders.aggregate([
  {
    $group: {
      _id: null,
      median: { $median: { input: "$amount", method: "approximate" } }
    }
  }
]);
```

## Summary

Upgrading from MongoDB 5.0 to 7.0 requires two phases: 5.0 to 6.0, then 6.0 to 7.0. Each phase uses a rolling upgrade on replica set members to maintain availability. Back up before starting, upgrade secondaries one at a time, step down and upgrade the primary, then set FCV to the new version before proceeding to the next phase. Update application drivers to versions that support MongoDB 7.0 and validate post-upgrade with integration tests.
