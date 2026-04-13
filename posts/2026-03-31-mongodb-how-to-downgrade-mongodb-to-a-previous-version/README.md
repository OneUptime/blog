# How to Downgrade MongoDB to a Previous Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Downgrade, Operation, Database Administration

Description: Learn how to safely downgrade MongoDB to a previous minor or major version using Feature Compatibility Version settings and proper backup procedures.

---

## Overview

Downgrading MongoDB is sometimes necessary after discovering compatibility issues with a new version. MongoDB's Feature Compatibility Version (FCV) system controls which features are enabled. Before downgrading to a previous major version, you must set the FCV back to the target version and remove any incompatible features. If incompatible data or features cannot be reversed, the only way to roll back is to restore from a backup.

## Downgrade Windows

MongoDB supports two downgrade scenarios:

1. **Same major version downgrade** - e.g., 7.0.5 to 7.0.3. Always safe as long as you are within the same major version.
2. **Major version downgrade** - e.g., 8.0 to 7.0. Requires setting the FCV back to "7.0" and removing any features incompatible with the target version before downgrading binaries.

## Check Current FCV Before Downgrading

```javascript
// Check current FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Expected output if safe to downgrade from 8.0 to 7.0:
// { featureCompatibilityVersion: { version: "7.0" }, ok: 1 }
```

If FCV shows the new version (e.g., "8.0"), you must set it back to the target version and remove any incompatible features before downgrading binaries.

## Step 1 - Set FCV to the Lower Version

If FCV was already set to the new version, set it back to the previous version first:

```javascript
// Connect to primary
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

Wait for the change to replicate to all members:

```javascript
// On each member, verify FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Step 2 - Back Up Data

Always create a backup before downgrading:

```bash
mongodump --uri "mongodb://admin:secret@localhost:27017"   --out /backup/pre-downgrade-$(date +%Y%m%d)
```

## Step 3 - Rolling Downgrade on a Replica Set

Downgrade secondaries first, then the primary:

```bash
# On each secondary
sudo systemctl stop mongod

# Remove current version and install previous version
sudo apt-get remove -y mongodb-org
sudo apt-get install -y mongodb-org=7.0.12

# Verify correct version in config file
# /etc/mongod.conf should not have settings exclusive to 8.0

sudo systemctl start mongod

# Wait for member to rejoin the set
mongosh --eval "rs.status()"
```

### Step Down the Primary

```javascript
// From primary
rs.stepDown()
```

### Downgrade the Former Primary

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=7.0.12
sudo systemctl start mongod
```

## Step 4 - Verify Downgrade

```javascript
// Check all members are on the previous version
rs.status().members.forEach(function(m) {
  print(m.name, "-", m.stateStr);
});

// Check FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Verify collections are accessible
db.getCollectionNames().forEach(function(name) {
  print(name, "-", db[name].countDocuments());
});
```

## Pinning a Version with Package Managers

To prevent accidental upgrades on Debian/Ubuntu:

```bash
# Pin the MongoDB packages to a specific version
sudo apt-mark hold mongodb-org mongodb-org-server mongodb-org-tools mongodb-org-shell
```

On RHEL/CentOS, add to `/etc/yum.conf`:

```text
exclude=mongodb-org,mongodb-org-server,mongodb-org-tools,mongodb-org-shell
```

## Downgrade via Full Restore (When FCV is Already Updated)

If FCV was already upgraded and you need to roll back:

```bash
# 1. Stop all mongod processes
sudo systemctl stop mongod

# 2. Remove data directory contents (DESTRUCTIVE)
sudo rm -rf /var/lib/mongodb/*

# 3. Install previous version
sudo apt-get install -y mongodb-org=7.0.12

# 4. Restore from backup
mongod --dbpath /var/lib/mongodb --fork --logpath /tmp/mongod.log
mongorestore --uri "mongodb://localhost:27017" /backup/pre-upgrade
```

## Configuration File Considerations

When downgrading, review your `mongod.conf` for any settings introduced in the newer version:

```yaml
# Check for version-specific settings that must be removed
# For example, settings added in 8.0 must be removed when going back to 7.0
net:
  port: 27017
  bindIp: 127.0.0.1

storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
```

## Summary

MongoDB downgrades are safe within the same major version at any time. For major version downgrades, you must set the FCV back to the target version and remove any incompatible features before downgrading binaries. If incompatible changes cannot be reversed, a full backup restore is required. Always back up data before downgrading, perform a rolling downgrade on replica sets (secondaries first, then primary), and verify all members are healthy after the process completes.
