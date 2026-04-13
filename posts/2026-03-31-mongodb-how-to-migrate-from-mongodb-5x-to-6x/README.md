# How to Migrate from MongoDB 5.x to 6.x

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Database Upgrade, Aggregation, Compatibility

Description: A comprehensive guide to upgrading your MongoDB deployment from version 5.x to 6.x safely using a rolling upgrade strategy.

---

## Overview

MongoDB 6.0 introduces encrypted fields with Queryable Encryption, new aggregation operators, and improved cluster-to-cluster sync capabilities. Upgrading from 5.x to 6.x follows the same rolling upgrade pattern as other major versions, but requires attention to new behavioral changes.

## Prerequisites

Before starting, verify:

- All members run the latest MongoDB 5.0 patch release
- FCV is set to 5.0 or higher
- A full backup exists
- Application drivers are compatible with MongoDB 6.0

Check current version and FCV:

```javascript
db.version()
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Step 1 - Review Breaking Changes in 6.0

MongoDB 6.0 has several behavioral changes worth reviewing:

- `$lookup` supports pipeline stages with `let` and `pipeline` on sharded collections (introduced in 5.1)
- `$densify` (introduced in 5.1) and `$fill` (introduced in 5.3) aggregation stages are now available if upgrading from 5.0
- `serverStatus` output changed - update monitoring queries
- Legacy `mongo` shell is fully removed; use `mongosh`

```javascript
// $fill operator (introduced in 5.3) - forward-fill missing values
db.stocks.aggregate([
  { $fill: { output: { price: { method: "locf" } } } }
])
```

## Step 2 - Take a Full Backup

```bash
# Using mongodump
mongodump \
  --uri="mongodb://admin:password@localhost:27017/?authSource=admin" \
  --out=/backup/mongo-5x-$(date +%Y%m%d)

# Verify backup
ls -lh /backup/mongo-5x-*/
```

## Step 3 - Rolling Upgrade of Replica Set

Upgrade one secondary at a time, then the primary:

```bash
# On each secondary node
sudo systemctl stop mongod

# Add MongoDB 6.0 repository (Ubuntu 20.04)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Wait for the member to catch up before upgrading the next
```

Monitor replica set lag during upgrade:

```javascript
rs.printSecondaryReplicationInfo()
```

## Step 4 - Upgrade the Primary

After all secondaries are upgraded:

```javascript
// Step down primary
rs.stepDown(60)
```

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

## Step 5 - Update FCV to 6.0

```javascript
// Connect to the new primary
db.adminCommand({ setFeatureCompatibilityVersion: "6.0" })
```

## Step 6 - Upgrade Sharded Clusters

For sharded clusters, the order is critical:

1. Disable the balancer with `sh.stopBalancer()`
2. Upgrade the config server replica set
3. Upgrade each shard replica set
4. Upgrade the `mongos` routers
5. Re-enable the balancer with `sh.startBalancer()`
6. Update FCV last

```javascript
// Disable the balancer before starting
sh.stopBalancer()
```

```bash
# Upgrade config server secondaries first
# Then config server primary
# Then each shard in sequence
```

```javascript
// Re-enable the balancer after all binaries are upgraded
sh.startBalancer()
```

## Step 7 - Leverage New MongoDB 6.0 Features

```javascript
// Queryable Encryption (preview in 6.0, GA in 7.0)
const encryptedFieldsMap = {
  "mydb.users": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        queries: [{ queryType: "equality" }]
      }
    ]
  }
}

// $densify - fill in missing time-series gaps (introduced in 5.1)
db.sensor_readings.aggregate([
  {
    $densify: {
      field: "timestamp",
      range: {
        step: 1,
        unit: "hour",
        bounds: "full"
      }
    }
  }
])
```

## Verify Upgrade Success

```javascript
// Check server version on each node
db.version()

// Verify FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Summary

Migrating MongoDB 5.x to 6.0 uses a rolling upgrade that starts with secondary replica set members and ends with bumping the FCV. Review breaking changes around aggregation operators and monitoring before upgrading, and take advantage of features like Queryable Encryption (preview) and the `$fill` aggregation stage once the upgrade is complete.
