# How to Configure Storage Limits for Atlas Flex Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Flex Cluster, Storage, Capacity

Description: Understand and manage storage capacity on MongoDB Atlas Flex clusters including monitoring usage, archiving data, and scaling storage as workloads grow.

---

## Overview

Atlas Flex clusters automatically scale storage as data grows, but understanding your current usage and managing growth is essential to controlling costs and ensuring the cluster does not approach provider-imposed limits. This guide covers monitoring storage, setting budget alerts, archiving data to reduce footprint, and knowing when to upgrade to a dedicated cluster.

## Checking Current Storage Usage

Use the Atlas API or `db.stats()` to retrieve current storage consumption.

```bash
# Get cluster storage stats via Atlas API
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/flexClusters/${CLUSTER_NAME}" \
  -H "Accept: application/vnd.atlas.2024-11-13+json" \
  --digest -u "${PUBLIC_KEY}:${PRIVATE_KEY}" | \
  jq '{storageGB: .storageSize, status: .stateName}'
```

```javascript
// From application code
const dbStats = await db.command({ dbStats: 1, scale: 1048576 }); // MB
console.log({
  databaseSizeMB: dbStats.dataSize,
  indexSizeMB: dbStats.indexSize,
  storageSizeMB: dbStats.storageSize,
  totalMB: dbStats.dataSize + dbStats.indexSize,
});
```

## Per-Collection Storage Breakdown

Identify which collections consume the most storage.

```javascript
async function getStorageByCollection(db) {
  const collections = await db.listCollections().toArray();
  const stats = [];

  for (const col of collections) {
    if (col.name.startsWith("system.")) continue;
    const s = await db.command({ collStats: col.name });
    stats.push({
      collection: col.name,
      documentCount: s.count,
      dataMB: +(s.size / 1048576).toFixed(2),
      storageMB: +(s.storageSize / 1048576).toFixed(2),
      indexMB: +(s.totalIndexSize / 1048576).toFixed(2),
      avgDocKB: +((s.avgObjSize || 0) / 1024).toFixed(2),
    });
  }

  return stats.sort((a, b) => b.storageMB - a.storageMB);
}
```

## Setting Atlas Budget Alerts

Create a billing alert via the Atlas API to notify you when spending exceeds a threshold.

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/alerts/settings" \
  -H "Content-Type: application/vnd.atlas.2023-01-01+json" \
  --digest -u "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  -d '{
    "eventTypeName": "CREDIT_CARD_CURRENT_MONTH_USAGE_THRESHOLD_EXCEEDED",
    "threshold": {
      "operator": "GREATER_THAN",
      "unitName": "DOLLARS",
      "threshold": 10
    },
    "notifications": [{
      "typeName": "EMAIL",
      "emailAddress": "admin@example.com",
      "intervalMin": 60
    }]
  }'
```

## Reducing Storage Footprint

**1. Drop unused indexes** - indexes consume storage equal to or greater than the data itself.

```javascript
// List indexes sorted by size
const indexStats = await db.collection("orders").aggregate([
  { $indexStats: {} }
]).toArray();

// Drop indexes with zero accesses
await db.collection("orders").dropIndex("idx_old_unused");
```

**2. Archive old documents** to a separate cold-storage collection. (Note: Atlas Online Archive is only available for dedicated M10+ clusters, not Flex clusters.)

```javascript
async function archiveOldDocuments(db, collectionName, cutoffDays = 180) {
  const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
  const col = db.collection(collectionName);
  const archive = db.collection(`${collectionName}_archive`);

  const old = await col.find({ createdAt: { $lt: cutoff } }, { limit: 1000 }).toArray();
  if (old.length === 0) return;

  await archive.insertMany(old.map((d) => ({ ...d, archivedAt: new Date() })));
  const ids = old.map((d) => d._id);
  await col.deleteMany({ _id: { $in: ids } });

  console.log(`Archived ${old.length} documents from ${collectionName}`);
}
```

**3. Run compaction to reclaim fragmented space.**

```javascript
await db.command({ compact: "orders" });
```

## When to Upgrade to a Dedicated Cluster

Upgrade from Flex to a dedicated M10+ cluster when any of these apply:

```text
- Storage is approaching the Flex tier limit of 120 GB
- Workload requires consistent low-latency reads or writes
- Application requires more than ~500 concurrent connections
- You need cross-region read replicas or global clusters
- Workload requires dedicated RAM for working set caching
```

## Summary

Atlas Flex cluster storage scales automatically but requires active management to control costs. Monitor storage with `collStats` and the Atlas API, identify top consumers with per-collection breakdowns, set billing alerts via the Atlas API, and reduce footprint through index cleanup and document archival. Upgrade to a dedicated M10+ cluster when storage approaches the Flex tier limit or when workload demands guaranteed compute resources.
