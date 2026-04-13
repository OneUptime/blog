# How to Migrate from MongoDB 6.x to 7.x

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Database Upgrade, Atlas, Compatibility

Description: Learn how to upgrade your MongoDB deployment from 6.x to 7.x with zero downtime using a rolling upgrade approach.

---

## Overview

MongoDB 7.0 is a Long-Term Support (LTS) release that brings compound wildcard indexes, Atlas Search index management via drivers, and significant performance improvements. Migrating from 6.x to 7.0 is straightforward but requires careful planning around removed features and driver compatibility.

## Prerequisites

- All replica set members run MongoDB 6.0 (latest 6.0.x patch release)
- FCV is set to 6.0
- A complete backup is available
- MongoDB drivers are updated to 6.0+ compatible versions

```javascript
// Check current state
db.version()
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
rs.status()
```

## Step 1 - Review What Changed in 7.0

Key changes in MongoDB 7.0:

- Compound wildcard indexes are now supported
- `$percentile` and `$median` aggregation operators added
- Atlas Search index management available via the MongoDB drivers
- `directConnection` URI option behavior changed for replica sets
- WiredTiger cache eviction improved

```javascript
// New $percentile operator (7.0+)
db.orders.aggregate([
  {
    $group: {
      _id: "$productId",
      p50Price: {
        $percentile: {
          input: "$price",
          p: [0.5],
          method: "approximate"
        }
      },
      p95Price: {
        $percentile: {
          input: "$price",
          p: [0.95],
          method: "approximate"
        }
      }
    }
  }
])
```

## Step 2 - Backup Before Migration

```bash
# Full backup with oplog for point-in-time recovery
mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
  --oplog \
  --out=/backup/pre-7x-upgrade-$(date +%Y%m%d)
```

## Step 3 - Rolling Upgrade of Replica Set Members

```bash
# Step 3a: Upgrade first secondary
ssh secondary1.db.internal
sudo systemctl stop mongod

# Install MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org=7.0.8
sudo systemctl start mongod
```

Wait for the secondary to fully sync before proceeding to the next member:

```javascript
// From mongosh on the upgraded secondary
rs.printSecondaryReplicationInfo()
```

## Step 4 - Step Down and Upgrade Primary

```javascript
// On the primary
rs.stepDown()
```

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=7.0.8
sudo systemctl start mongod
```

## Step 5 - Upgrade FCV

```javascript
// Connect to the new primary
use admin
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

## Step 6 - Upgrade Drivers

Update your MongoDB drivers to support 7.0 features:

```bash
# Node.js
npm install mongodb@6

# Python
pip install "pymongo[srv]>=4.6"

# Go
go get go.mongodb.org/mongo-driver@v1.14
```

## Step 7 - Use New 7.0 Features

```javascript
// Compound wildcard indexes (new in 7.0)
db.events.createIndex({
  "userId": 1,
  "$**": 1
})

// $median operator (new in 7.0)
db.salaries.aggregate([
  {
    $group: {
      _id: "$department",
      medianSalary: {
        $median: {
          input: "$salary",
          method: "approximate"
        }
      }
    }
  }
])

// Use Atlas Search index management from driver
const client = new MongoClient(uri)
const db = client.db("mydb")
await db.collection("products").createSearchIndex({
  name: "product-search",
  definition: {
    mappings: { dynamic: true }
  }
})
```

## Validation Checklist

```javascript
// Confirm all members on 7.0
rs.status().members.forEach(m => print(m.name, m.stateStr))

// Confirm FCV
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Run explain to verify indexes still valid
db.orders.find({ userId: "u123" }).explain("executionStats")
```

## Summary

Upgrading from MongoDB 6.x to 7.0 follows the standard rolling upgrade process - upgrade secondary members first, then step down the primary and upgrade it, and finally bump the FCV. MongoDB 7.0 as an LTS release offers compound wildcard indexes, new statistical aggregation operators, and improved performance worth planning the upgrade around.
