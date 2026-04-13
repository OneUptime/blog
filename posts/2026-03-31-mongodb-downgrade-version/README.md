# How to Downgrade MongoDB to Previous Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Downgrade, Version, Operation, Administration

Description: Learn how to safely downgrade MongoDB to a previous version by setting the Feature Compatibility Version and performing a rolling downgrade on a replica set.

---

## Introduction

Downgrading MongoDB is sometimes necessary after a failed upgrade, unexpected behavior in a new version, or application compatibility issues. MongoDB supports downgrading one major version (e.g., 7.0 to 6.0) using the Feature Compatibility Version (FCV) mechanism. You must set the FCV before downgrading the binaries.

## Downgrade Prerequisites

- Read the release notes for breaking changes between versions
- All members of the replica set must be running the higher version before downgrading
- FCV must be set to the lower version before replacing binaries
- Take a full backup before starting

## Downgrade Limitations

| Scenario | Supported |
|---|---|
| 7.0 to 6.0 | Yes (one major version) |
| 7.0 to 5.0 | No (must go via 6.0) |
| After using new 7.0-only features | May require data migration |

## Downgrade Procedure Overview

```mermaid
flowchart LR
    A["1. Back up all data"] --> B["2. Set FCV to lower version"]
    B --> C["3. Rolling downgrade secondaries"]
    C --> D["4. Step down primary"]
    D --> E["5. Downgrade former primary"]
    E --> F["6. Verify cluster health"]
```

## Step 1: Take a Full Backup

```bash
mongodump \
  --uri "mongodb://admin:password@localhost:27017/?authSource=admin&replicaSet=rs0" \
  --oplog \
  --gzip \
  --out /backup/pre-downgrade-$(date +%Y%m%d-%H%M%S)
```

## Step 2: Check and Set Feature Compatibility Version

```javascript
// Check current FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// Output: { featureCompatibilityVersion: { version: "7.0" }, ok: 1 }

// Set FCV to the target version
// Must run on the PRIMARY
db.adminCommand({
  setFeatureCompatibilityVersion: "6.0",
  confirm: true   // Required in MongoDB 7.0+
})

// Verify FCV is now set to the lower version
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// Output: { featureCompatibilityVersion: { version: "6.0" }, ok: 1 }
```

## Step 3: Verify No New-Version-Only Features Are In Use

Before proceeding, check for features that do not exist in the target version:

```javascript
// Check for time-series collections (may have restrictions between versions)
db.getCollectionInfos({ type: "timeseries" })

// Check for use of new aggregation operators in views
db.getCollectionInfos({ type: "view" })

// Check FCV-restricted commands
db.adminCommand({ listCommands: 1 })
```

## Step 4: Rolling Downgrade of Secondaries

Downgrade one secondary at a time. Stop mongod, replace the binary, restart.

```bash
# On each secondary (repeat for all)

# 1. Stop the secondary mongod
sudo systemctl stop mongod

# 2. Remove the current version
# Ubuntu/Debian:
sudo apt-get remove mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools

# RHEL/CentOS:
sudo yum remove mongodb-org

# 3. Install the target version
# Ubuntu/Debian (example: downgrade to 6.0):
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org=6.0.15 mongodb-org-server=6.0.15

# RHEL/CentOS:
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo << EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-6.0.asc
EOF
sudo yum install -y mongodb-org-6.0.15

# 4. Restart mongod
sudo systemctl start mongod
```

Wait for the secondary to rejoin and catch up:

```javascript
// On the primary
rs.status().members.find(m => m.name === "secondary1.example.com:27017").stateStr
// Wait for: "SECONDARY"
```

## Step 5: Step Down the Primary

After all secondaries are downgraded:

```javascript
// On the primary
rs.stepDown(120)
```

Verify a new primary was elected from the downgraded secondaries:

```javascript
db.hello().primary
```

## Step 6: Downgrade the Former Primary (Now Secondary)

Repeat Step 4 on the former primary node:

```bash
sudo systemctl stop mongod
# Install target version (same as Step 4)
sudo systemctl start mongod
```

## Step 7: Verify Cluster Health

```javascript
// All members should be up and healthy
rs.status().members.forEach(m => {
  print(m.name, m.stateStr)
})

// Verify all members are running the old version
db.adminCommand({ serverStatus: 1 }).version

// Confirm FCV is correct
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Run a quick sanity check
db.adminCommand({ buildInfo: 1 }).version
```

## Rolling Back FCV After Unsuccessful Downgrade

If you change your mind and want to stay on the new version:

```javascript
// Reset FCV back to the higher version
db.adminCommand({
  setFeatureCompatibilityVersion: "7.0",
  confirm: true
})
```

Then reinstall the newer version binaries using the same rolling procedure.

## Preventing Downgrade Issues

```javascript
// Before upgrading, document all FCV-gated features in use
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// After upgrading but before using new features, verify you can still downgrade
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 }).featureCompatibilityVersion.version
// Should still be the old version until you explicitly upgrade FCV
```

## Summary

Downgrading MongoDB requires setting the Feature Compatibility Version (FCV) to the target version first, then performing a rolling binary replacement starting with secondaries and ending with the primary. Always back up data before starting, verify FCV is set before touching any binary, and wait for each member to rejoin and reach SECONDARY state before proceeding to the next. Downgrades are only supported one major version at a time, so plan multi-step downgrades (7.0 to 5.0 requires going through 6.0) accordingly.
