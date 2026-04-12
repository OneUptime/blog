# How to Migrate from MongoDB 7.x to 8.x

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Upgrade, Migration, Version, Operation

Description: Step-by-step guide for upgrading a MongoDB replica set from 7.x to 8.x, including compatibility checks, rolling upgrade procedure, and post-upgrade validation.

---

## Overview

MongoDB 8.0 introduces significant performance improvements, including a new query execution engine (Slot-Based Execution - SBE) enabled for more query shapes, improved aggregation performance, and enhanced time-series collection capabilities. Upgrading from 7.x follows MongoDB's standard rolling upgrade procedure for replica sets.

## Pre-Upgrade Checklist

Before upgrading, verify compatibility and prepare your environment:

```bash
# 1. Check current version and FCV
mongosh --eval "db.version()"
mongosh --eval "db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })"

# 2. Ensure FCV is set to 7.0 before upgrading
mongosh --eval "db.adminCommand({ setFeatureCompatibilityVersion: '7.0', confirm: true })"

# 3. Check for deprecated features or incompatible configuration options
mongosh --eval "db.adminCommand({ buildInfo: 1 })"
```

```text
Pre-upgrade checklist:
- [ ] All nodes running MongoDB 7.x
- [ ] FCV set to 7.0
- [ ] No active index builds in progress
- [ ] Full backup completed
- [ ] Application tested against MongoDB 8.0 driver
- [ ] Reviewed MongoDB 8.0 release notes for breaking changes
```

## Review MongoDB 8.0 Breaking Changes

Key changes in MongoDB 8.0 to review:

```text
MongoDB 8.0 notable changes:
- SBE query engine enabled for more aggregation stages
- Legacy mongo shell was removed in MongoDB 6.0 (ensure you are using mongosh)
- Changes to explain output format for some queries
- Improved $lookup and $group performance (may alter query plans)
- Time-series collection improvements
- Removed deprecated commands (check release notes)
```

Check for deprecated operators in your queries:

```javascript
// Run explain to check query plans before and after upgrade
db.orders.find({ status: "pending" }).explain("executionStats");
```

## Perform the Rolling Upgrade

Upgrade one replica set member at a time, starting with secondaries:

```bash
# Step 1: Stop the SECONDARY mongod
sudo systemctl stop mongod

# Step 2: Install MongoDB 8.0 packages (Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Step 3: Start mongod and verify
sudo systemctl start mongod
mongosh --eval "db.version()"  # should show 8.0.x

# Step 4: Repeat for the other secondary
# Step 5: Step down the primary and upgrade it last
```

Step down the primary to trigger election before upgrading it:

```javascript
// Step down primary (run on primary)
db.adminCommand({ replSetStepDown: 60 });
```

Then upgrade the former primary:

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

## Verify Replica Set Health

After upgrading all nodes, confirm the replica set is healthy:

```javascript
// Check replica set status
rs.status();

// All members should show:
// "health": 1, "state": 1 (PRIMARY) or 2 (SECONDARY)
// "version" (protocol version) consistent
```

## Set Feature Compatibility Version to 8.0

Only set FCV to 8.0 after all nodes are running 8.0 and you have verified stability:

```javascript
// Set FCV to 8.0 to enable new features
db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true });

// Verify
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
// { featureCompatibilityVersion: { version: '8.0' }, ok: 1 }
```

Note: Once FCV is set to 8.0, you cannot downgrade to MongoDB 7.x without restoring from backup.

## Post-Upgrade Validation

```javascript
// Run application smoke tests
// Check slow query log for unexpected plan changes
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);

// Check for any assertion errors in mongod logs
// tail /var/log/mongodb/mongod.log | grep -i "assertion\|error"
```

## Summary

Upgrading from MongoDB 7.x to 8.x follows a rolling upgrade pattern: upgrade secondaries first, step down the primary, then upgrade the primary. Set FCV to 8.0 only after all nodes are upgraded and validated. Back up before starting and review MongoDB 8.0 release notes for any breaking changes that affect your application's query patterns.
