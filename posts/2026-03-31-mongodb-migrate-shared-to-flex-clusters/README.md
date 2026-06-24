# How to Migrate from Shared Clusters to Flex Clusters in Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Migration, Flex Cluster, Upgrade

Description: Migrate a MongoDB Atlas shared M2 or M5 cluster to a Flex cluster with live data migration and minimal downtime using Atlas Live Migrate or mongodump.

---

## Overview

MongoDB Atlas deprecated the legacy M2 and M5 shared-tier clusters in favor of Flex clusters. Migrating from a shared cluster to Flex retains the consumption-based billing model while adding higher storage limits, improved Atlas API coverage, and better compatibility with production-grade Atlas features. This guide covers two migration approaches: Atlas's built-in upgrade path and a manual `mongodump`/`mongorestore` approach.

## Option 1: Atlas In-Place Upgrade

Atlas provides a direct upgrade path from M2/M5 to Flex in the UI. The process migrates data automatically with minimal downtime.

1. Open your project in cloud.mongodb.com.
2. Click the three-dot menu on your M2 or M5 cluster.
3. Select "Upgrade Cluster Tier".
4. Choose "Flex" from the tier options.
5. Review the pricing change and click "Upgrade".

Atlas migrates data in the background and converts the cluster in place. Your existing connection string is preserved, so no application changes are needed.

## Option 2: Manual Migration with mongodump

Use `mongodump` and `mongorestore` for a controlled migration with verification steps.

```bash
# Step 1: Dump from the shared cluster
mongodump \
  --uri "mongodb+srv://user:pass@old-shared.abc123.mongodb.net" \
  --out ./backup-$(date +%Y%m%d) \
  --gzip

# Step 2: Create a new Flex cluster (see atlas CLI setup)
atlas clusters create my-new-flex \
  --tier FLEX \
  --provider AWS \
  --region US_EAST_1

# Step 3: Wait for the Flex cluster to be ready
atlas clusters watch my-new-flex

# Step 4: Restore to the Flex cluster
mongorestore \
  --uri "mongodb+srv://user:pass@my-new-flex.xyz789.mongodb.net" \
  --gzip \
  --dir ./backup-$(date +%Y%m%d) \
  --drop
```

## Verifying Data Integrity After Migration

Compare document counts across all collections in both clusters.

```javascript
const { MongoClient } = require("mongodb");

async function compareCollections(sourceUri, targetUri, dbName) {
  const source = new MongoClient(sourceUri);
  const target = new MongoClient(targetUri);

  await Promise.all([source.connect(), target.connect()]);

  const sourceDb = source.db(dbName);
  const targetDb = target.db(dbName);

  const collections = await sourceDb.listCollections().toArray();
  const results = [];

  for (const col of collections) {
    const name = col.name;
    const [srcCount, tgtCount] = await Promise.all([
      sourceDb.collection(name).countDocuments(),
      targetDb.collection(name).countDocuments(),
    ]);
    results.push({ collection: name, source: srcCount, target: tgtCount, match: srcCount === tgtCount });
  }

  await Promise.all([source.close(), target.close()]);
  return results;
}
```

## Updating the Application Connection String

After verifying data integrity, update your application to point to the Flex cluster.

```bash
# Old connection string (M2/M5)
# MONGODB_URI=mongodb+srv://user:pass@old-cluster.abc123.mongodb.net/mydb

# New connection string (Flex)
MONGODB_URI=mongodb+srv://user:pass@my-new-flex.xyz789.mongodb.net/mydb?retryWrites=true&w=majority
```

For zero-downtime cutover, use a rolling deployment:

```bash
# 1. Deploy with new connection string to one instance
# 2. Verify application health
# 3. Roll out to remaining instances
# 4. Decommission old cluster after 24-48 hours of healthy operation
```

## Post-Migration Checklist

```text
- Verify document counts match across all collections
- Check that all indexes were migrated correctly
- Confirm application connection string is updated
- Test that change streams work if used (note: Flex clusters do not support multi-document transactions)
- Monitor error rates and query latency for 24 hours
- Decommission the old shared cluster
```

## Summary

Migrating from Atlas M2/M5 shared clusters to Flex clusters can be done through the Atlas UI for a simple in-place upgrade, or with `mongodump`/`mongorestore` for a controlled manual migration. Always verify document counts after restoration, update the connection string in a rolling deployment to minimize downtime, and monitor the application for at least 24 hours before decommissioning the old cluster.
