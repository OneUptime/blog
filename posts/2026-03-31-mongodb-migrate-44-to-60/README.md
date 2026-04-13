# How to Migrate from MongoDB 4.4 to MongoDB 6.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Upgrade, Version, Operation

Description: Step-by-step guide to upgrading a MongoDB replica set from version 4.4 to 6.0, including intermediate version stops at 5.0 and compatibility checks.

---

## Why You Cannot Jump Directly from 4.4 to 6.0

MongoDB does not support skipping major versions during an upgrade. The upgrade path from 4.4 to 6.0 requires stopping at each intermediate major version:

```mermaid
flowchart LR
    v44[MongoDB 4.4] --> v50[MongoDB 5.0]
    v50 --> v60[MongoDB 6.0]
    v44 -->|Not allowed| v60
```

Each version must have its Feature Compatibility Version (FCV) set to the current version before upgrading to the next.

## Pre-Upgrade Checklist

Before starting:

- Review the release notes for 5.0 and 6.0 for breaking changes
- Ensure all drivers are compatible with MongoDB 6.0 (check [MongoDB compatibility matrix](https://www.mongodb.com/docs/drivers/))
- Take a full backup with `mongodump` or a filesystem snapshot
- Test the upgrade on a non-production replica set first
- Check for deprecated operators that were removed in 5.0 or 6.0

Check current FCV:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

Check for deprecated usage:

```bash
# Review MongoDB log for deprecation warnings
grep -i "deprecat" /var/log/mongodb/mongod.log

# Use mongosh to list databases and check for schema validation issues
mongosh "mongodb://localhost:27017" --eval "db.adminCommand({ listDatabases: 1 })"
```

## Step 1: Back Up Your Data

```bash
# Full backup with mongodump
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin&replicaSet=rs0" \
  --out /backup/mongodb-4.4-pre-upgrade \
  --oplog

# Verify backup
ls -lh /backup/mongodb-4.4-pre-upgrade/
```

## Step 2: Upgrade from 4.4 to 5.0

### Upgrade secondaries first (one at a time)

On each secondary node:

```bash
# Stop mongod
sudo systemctl stop mongod

# On Ubuntu, update the repository to 5.0
wget -qO- https://www.mongodb.org/static/pgp/server-5.0.asc | \
  sudo tee /etc/apt/trusted.gpg.d/server-5.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# Start the upgraded secondary
sudo systemctl start mongod
```

Verify the secondary is running 5.0:

```javascript
db.serverStatus().version
// "5.0.x"
```

Wait for the secondary to catch up with the primary:

```javascript
rs.printSecondaryReplicationInfo()
```

Repeat for each secondary.

### Step down the primary and upgrade it

```javascript
// On the primary
rs.stepDown()
```

Wait for a new primary to be elected, then upgrade the old primary (now a secondary) using the same steps above.

### Set FCV to 5.0

After all members are on 5.0, connect to the new primary and set FCV:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "5.0" })
```

Verify:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// { featureCompatibilityVersion: { version: "5.0" }, ok: 1 }
```

## Step 3: Upgrade from 5.0 to 6.0

Repeat the same rolling upgrade process for 6.0:

```bash
# On each secondary (Ubuntu)
wget -qO- https://www.mongodb.org/static/pgp/server-6.0.asc | \
  sudo tee /etc/apt/trusted.gpg.d/server-6.0.asc
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org
```

After all members are on 6.0, set FCV to 6.0:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "6.0" })
```

Verify:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// { featureCompatibilityVersion: { version: "6.0" }, ok: 1 }
```

## Key Breaking Changes to Review

### Changes in MongoDB 5.0

- `$lookup` pipeline syntax became the preferred form
- Slot-Based Query Execution Engine (SBE) enabled by default for some query shapes
- `map`, `sort` on arrays now handled in aggregation differently

### Changes in MongoDB 6.0

- `$lookup` and `$graphLookup` now support `let` and pipeline stages in more contexts
- Aggregation pipeline stages that require more than 100 megabytes of memory now write temporary files to disk by default
- `$near` and `$nearSphere` no longer supported in aggregation `$match` on time-series collections
- Legacy UUID `BinData` subtype 3 handling improved across drivers (subtype 4 is the standard UUID representation)

Check for usage of removed operators:

```javascript
// Check if any code uses $where with old behavior
db.collection.find({ $where: function() { return this.x > 1; } }).explain()
```

## Verifying the Upgrade

After upgrading to 6.0:

```javascript
// Confirm version
db.serverStatus().version

// Confirm FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Check replica set health
rs.status()

// Verify all members are on 6.0
rs.status().members.forEach(m => print(m.name, m.stateStr, m.health))
```

Run application integration tests against the upgraded cluster before routing production traffic.

## Rollback Procedure

If issues occur after upgrading to 5.0 or 6.0 and FCV has not yet been set to the new version:

```javascript
// Downgrade FCV back to the previous version
db.adminCommand({ setFeatureCompatibilityVersion: "4.4" })
```

Then downgrade binaries using the same rolling procedure in reverse. Once FCV is set to the new version, binary rollback is no longer supported and a restore from backup is required.

## Summary

Upgrading MongoDB from 4.4 to 6.0 requires two hops: 4.4 to 5.0, then 5.0 to 6.0. Use a rolling upgrade to maintain availability on a replica set. Upgrade secondaries one at a time, step down the primary and upgrade it last, then set FCV to the new version before proceeding to the next hop. Always back up first, test on non-production, and review release notes for breaking changes at each version boundary.
