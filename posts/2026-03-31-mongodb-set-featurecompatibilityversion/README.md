# How to Set featureCompatibilityVersion in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Version Management, Upgrade

Description: Learn how to set the featureCompatibilityVersion (FCV) in MongoDB to control on-disk format during upgrades and prepare for safe version downgrades.

---

The `featureCompatibilityVersion` (FCV) in MongoDB controls which version-specific features and on-disk formats are active. It is separate from the binary version and is a critical step in both upgrade and downgrade procedures.

## Why FCV Matters

When you upgrade a MongoDB binary, the FCV does not automatically change. This allows you to:
- Run a new binary while keeping the on-disk format compatible with the previous version.
- Roll back to the previous binary if problems arise.
- Upgrade in a controlled, staged way.

Only after bumping the FCV are new version-specific features fully enabled and the old binary can no longer read the data.

## Checking Current FCV

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

Output:

```text
{ featureCompatibilityVersion: { version: '6.0' }, ok: 1 }
```

## Setting FCV After an Upgrade

After upgrading the MongoDB binary to 7.0, bump the FCV:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

Expected output:

```text
{ ok: 1 }
```

You must run this on the primary. The change replicates to all secondaries automatically.

## FCV During a Downgrade

Before downgrading the binary from 7.0 to 6.0, lower the FCV first:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "6.0", confirm: true })
```

This removes any 7.0-specific on-disk formats and ensures the 6.0 binary can read the data.

## FCV in a Sharded Cluster

In a sharded cluster, set FCV on the `mongos` router - it propagates to all shards and the config server:

```bash
mongosh --host mongos-host:27017
```

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

Verify on each component:

```bash
mongosh --host shard1-host:27017 --eval \
  "db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })"
```

## FCV Constraints

- You can only set FCV to the current binary version or the previous version.
- FCV cannot be set higher than the binary version.
- During an FCV change, the operation can be interrupted. If it is, re-run the command to complete it.

If a previous FCV change was interrupted and left in a transitional state:

```javascript
// Check for transitional state
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// Output might show: { version: '6.0', targetVersion: '7.0' }

// Re-run to complete
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

## Required Privileges

The `setFeatureCompatibilityVersion` command requires the `setFeatureCompatibilityVersion` action privilege, which is part of the `root` built-in role:

```javascript
use admin
db.grantRolesToUser("admin", [{ role: "root", db: "admin" }])
```

## Upgrade Order

For a replica set upgrade:
1. Upgrade all secondary binaries.
2. Step down the primary and upgrade it.
3. Set FCV to the new version on the primary.

```javascript
// Step 3 - after all binaries are upgraded
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

## Summary

`featureCompatibilityVersion` decouples the MongoDB binary version from the on-disk format, enabling safe staged upgrades and rollbacks. Always lower the FCV before downgrading a binary, and raise it after all nodes in a cluster are running the new binary version.
