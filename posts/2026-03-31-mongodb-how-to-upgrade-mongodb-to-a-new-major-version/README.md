# How to Upgrade MongoDB to a New Major Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Upgrade, DevOps, Database Administration

Description: Learn how to safely upgrade MongoDB to a new major version on replica sets and standalone instances, including compatibility checks and rollback planning.

---

## Overview

Upgrading MongoDB to a new major version requires careful planning to avoid data loss or downtime. MongoDB uses a Feature Compatibility Version (FCV) system that allows gradual upgrades and provides a rollback path. The general process involves upgrading the minor version first, verifying compatibility, then bumping the FCV.

## Pre-Upgrade Checklist

Before upgrading, complete these checks:

```javascript
// 1. Check current version
db.version()

// 2. Check current Feature Compatibility Version
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// 3. Review the driver compatibility matrix
// https://www.mongodb.com/docs/drivers/

// 4. Check for any collection validation warnings
db.runCommand({ validate: "collection_name", full: true })
```

## Upgrade Path

MongoDB requires upgrading one major version at a time. You cannot jump from 5.0 to 7.0 directly:

```text
5.0 -> 6.0 -> 7.0 -> 8.0
```

## Upgrading a Replica Set

The recommended approach is a rolling upgrade that maintains availability:

### Step 1 - Back Up Data

```bash
# Create a full backup before starting
mongodump --uri "mongodb://admin:secret@localhost:27017" --out /backup/pre-upgrade
```

### Step 2 - Upgrade Secondaries First

Connect to each secondary and upgrade the mongod binary:

```bash
# On each secondary host
# 1. Stop the mongod service
sudo systemctl stop mongod

# 2. Install new version (example: Ubuntu/Debian)
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 3. Start mongod
sudo systemctl start mongod

# 4. Verify it joined the replica set
mongosh --eval "rs.status()"
```

### Step 3 - Step Down the Primary

```javascript
// Step down the current primary
rs.stepDown()
```

### Step 4 - Upgrade the Former Primary

```bash
# On the former primary host
sudo systemctl stop mongod
# Install new version (same as above)
sudo systemctl start mongod
```

### Step 5 - Verify All Members are Upgraded

```javascript
// Check all members are running the new version
rs.status().members.forEach(function(m) {
  print(m.name, m.stateStr, "- check version in logs");
});
```

### Step 6 - Update the Feature Compatibility Version

```javascript
// Connect to the primary
db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true })

// Verify
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Upgrading a Standalone Instance

```bash
# 1. Stop mongod
sudo systemctl stop mongod

# 2. Back up data directory
cp -r /var/lib/mongodb /backup/mongodb-pre-upgrade

# 3. Install new version
sudo apt-get install -y mongodb-org

# 4. Start mongod
sudo systemctl start mongod

# 5. Update FCV
mongosh --eval 'db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true })'
```

## Post-Upgrade Verification

```javascript
// Verify version
db.version()

// Verify FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Run collection validation
db.getCollectionNames().forEach(function(name) {
  let result = db.runCommand({ validate: name });
  if (!result.valid) {
    print("Validation failed for:", name);
    printjson(result.errors);
  }
});

// Check replica set health
rs.status()
```

## Rolling Back

If issues arise after upgrading but before changing the FCV, you can downgrade:

```bash
# Downgrade is only possible if FCV has NOT been changed
# Check FCV first
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

# If FCV still shows old version, you can stop mongod
# and reinstall the previous version
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=7.0.12
sudo systemctl start mongod
```

Once the FCV has been updated to the new version, downgrading requires first removing any persisted backwards-incompatible features, lowering the FCV back to the previous version, and then downgrading the binaries. This process is complex and may require MongoDB Support assistance. A full restore from backup is the safest alternative.

## Summary

Upgrading MongoDB major versions requires upgrading one version at a time using a rolling upgrade strategy on replica sets. The Feature Compatibility Version system gives you a controlled upgrade path and a rollback window. Always back up data before starting, upgrade secondaries first, then step down and upgrade the primary, and only update the FCV after verifying all nodes are running correctly on the new version.
