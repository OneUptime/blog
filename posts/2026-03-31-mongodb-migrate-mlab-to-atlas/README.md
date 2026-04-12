# How to Migrate from mLab to MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, mLab, Migration, Cloud Database

Description: Step-by-step guide for migrating your MongoDB database from mLab (now discontinued) to MongoDB Atlas using mongodump, mongorestore, and live migration tools.

---

## Overview

mLab was a popular MongoDB-as-a-service provider that was acquired by MongoDB in 2018 and shut down in November 2020. Teams still holding mLab backups or using mLab-style database URLs need to migrate to MongoDB Atlas, the official managed MongoDB service.

## Assess Your Current Setup

Before migrating, document your mLab configuration:

```text
mLab migration checklist:
- [ ] Record your mLab database URI (format: mongodb://user:pass@dsXXXXX.mlab.com:PORT/dbname)
- [ ] Note the MongoDB version (mLab used older versions)
- [ ] List all databases and collections
- [ ] Document application connection strings
- [ ] List all database users and their roles
```

Connect to your mLab instance to take inventory:

```javascript
// List all collections and their sizes
db.getCollectionNames().forEach(name => {
  const stats = db.getCollection(name).stats();
  print(`${name}: ${stats.count} docs, ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
});
```

## Create a MongoDB Atlas Cluster

Set up your target cluster on Atlas before starting the migration:

```bash
# Create Atlas cluster via Atlas CLI
atlas clusters create myNewCluster \
  --provider AWS \
  --region US_EAST_1 \
  --tier M10 \
  --mdbVersion 7.0

# Get connection string
atlas clusters connectionStrings describe myNewCluster
```

Alternatively, use the Atlas web UI to create a free M0 cluster for development or a paid cluster for production.

## Export Data from mLab Using mongodump

```bash
# Export from mLab using mongodump
mongodump \
  --uri="mongodb://mlabuser:mlabpass@ds123456.mlab.com:27017/mydb" \
  --out=/backup/mlab-export \
  --gzip

# Verify export
ls -lh /backup/mlab-export/mydb/
```

## Import Data to MongoDB Atlas Using mongorestore

```bash
# Import to MongoDB Atlas
mongorestore \
  --uri="mongodb+srv://atlasuser:atlaspass@cluster0.example.mongodb.net/mydb" \
  --gzip \
  --drop \
  /backup/mlab-export/mydb

# Expected output:
# finished restoring mydb.orders (5234 documents, 0 failures)
# finished restoring mydb.users (1820 documents, 0 failures)
```

## Recreate Users and Roles

mLab database-level users must be recreated in Atlas. Atlas manages users at the organization or project level.

```bash
# Create equivalent user via Atlas CLI
atlas dbusers create \
  --username appuser \
  --password securepassword \
  --role readWrite@mydb
```

Or configure users via the Atlas UI: Project > Security > Database Access.

## Update Application Connection Strings

Replace the mLab connection string with the Atlas connection string:

```bash
# Before (mLab format)
MONGO_URI=mongodb://user:pass@ds123456.mlab.com:27017/mydb

# After (Atlas SRV format)
MONGO_URI=mongodb+srv://user:pass@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority
```

Ensure your MongoDB driver version supports the `mongodb+srv://` URI scheme:

```javascript
// Node.js - verify driver version supports SRV
// mongodb driver >= 3.0 supports mongodb+srv://
const { MongoClient } = require("mongodb"); // >= 3.0.0
const client = new MongoClient(process.env.MONGO_URI);
```

## Validate the Migration

```javascript
// Compare document counts on Atlas
use mydb;
db.getCollectionNames().forEach(name => {
  print(`${name}: ${db.getCollection(name).countDocuments({})}`);
});
```

Compare with the mLab counts you documented before migration and verify sample records are intact.

## Summary

Migrating from mLab to Atlas is straightforward using `mongodump` and `mongorestore`. The key steps are: export data from mLab with `mongodump`, create an Atlas cluster, import with `mongorestore`, recreate users in Atlas, update application connection strings to use the Atlas SRV URI, and validate document counts. Test your application thoroughly in a staging environment before updating the production connection string.
