# How to Check MongoDB Feature Compatibility Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Feature Compatibility Version, FCV, Upgrade, Administration

Description: Learn how to check and manage MongoDB's Feature Compatibility Version (FCV) to control which features are active during and after version upgrades.

---

## What Is Feature Compatibility Version?

The Feature Compatibility Version (FCV) in MongoDB is a setting that controls which features are enabled on a running cluster. It is separate from the binary version of MongoDB. This allows you to upgrade the MongoDB binary while keeping the FCV at the previous version until you are confident the upgrade is stable.

For example:
- Binary version: 7.0
- FCV: 6.0 (still using 6.0-compatible features)

This gives you a rollback window: if issues arise, you can downgrade the binaries back to 6.0 without data incompatibilities.

## Checking the Current FCV

```javascript
// Connect with mongosh and run:
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

Output:

```json
{
  "featureCompatibilityVersion": {
    "version": "7.0"
  },
  "ok": 1
}
```

## Checking FCV on All Replica Set Members

```javascript
// On each replica set member
const members = rs.status().members

members.forEach(member => {
  print(`Member: ${member.name}, State: ${member.stateStr}`)
})

// Connect to each member and check FCV
// On primary:
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// On secondary (use directConnection):
// mongosh --directConnection mongodb://secondary:27017
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Checking FCV in a Sharded Cluster

In a sharded cluster, check FCV on the config server primary and all shard primaries:

```javascript
// On mongos (routing node):
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// For a complete view, connect directly to each shard's primary
// and run the same command
```

## Valid FCV Values

```text
MongoDB Binary Version | Valid FCV Settings
----------------------|-------------------
8.0                   | "8.0", "7.0"
7.0                   | "7.0", "6.0"
6.0                   | "6.0", "5.0"
5.0                   | "5.0", "4.4"
4.4                   | "4.4", "4.2"
```

You can only go one major version back. You cannot set FCV to "5.0" on a 7.0 binary.

## Setting the FCV

To upgrade FCV after confirming your new binary version is stable:

```javascript
// Upgrade FCV to match binary version
db.adminCommand({
  setFeatureCompatibilityVersion: "7.0",
  confirm: true  // required in MongoDB 7.0+ to prevent accidental changes
})
```

To downgrade FCV before rolling back binaries:

```javascript
// Downgrade FCV before binary downgrade
db.adminCommand({
  setFeatureCompatibilityVersion: "6.0",
  confirm: true
})
```

## FCV During Upgrades - Step by Step

```bash
# Step 1: Verify current FCV
mongosh --eval "db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })"

# Step 2: Ensure FCV matches current binary before upgrading
# If binary is 6.0 and FCV is 5.0, set FCV to 6.0 first
# Note: confirm parameter is only required on MongoDB 7.0+
mongosh --eval "db.adminCommand({ setFeatureCompatibilityVersion: '6.0' })"

# Step 3: Upgrade binary (rolling upgrade for replica sets)
# Stop mongod, replace binary, start mongod - one node at a time

# Step 4: Verify upgrade succeeded
mongosh --eval "db.adminCommand({ buildInfo: 1 }).version"

# Step 5: After testing, set FCV to new version
mongosh --eval "db.adminCommand({ setFeatureCompatibilityVersion: '7.0', confirm: true })"
```

## Monitoring FCV Changes

FCV changes are logged in the MongoDB logs:

```bash
# Search for FCV-related log entries
grep "featureCompatibilityVersion" /var/log/mongodb/mongod.log
```

## FCV and Downgrade Restrictions

Once you set a higher FCV, you cannot downgrade the binary without first lowering the FCV:

```javascript
// WRONG: Downgrade binary without lowering FCV
// mongod 6.0 binary cannot start if FCV is set to 7.0 - will fail

// CORRECT: Lower FCV first
db.adminCommand({ setFeatureCompatibilityVersion: "6.0", confirm: true })
// Then stop mongod and swap to 6.0 binary
```

## Scripting FCV Checks

Automate FCV verification in deployment scripts:

```bash
#!/bin/bash
EXPECTED_FCV="7.0"
ACTUAL_FCV=$(mongosh --quiet --eval "
  const result = db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
  print(result.featureCompatibilityVersion.version);
")

if [ "$ACTUAL_FCV" != "$EXPECTED_FCV" ]; then
  echo "ERROR: FCV is $ACTUAL_FCV, expected $EXPECTED_FCV"
  exit 1
fi
echo "FCV check passed: $ACTUAL_FCV"
```

## Summary

MongoDB's Feature Compatibility Version (FCV) decouples binary upgrades from feature activation, giving you a rollback window after upgrading binaries. Check FCV with `db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })`, set it with `setFeatureCompatibilityVersion`, and always lower the FCV before downgrading binaries. During rolling upgrades, upgrade all nodes to the new binary before bumping the FCV.
