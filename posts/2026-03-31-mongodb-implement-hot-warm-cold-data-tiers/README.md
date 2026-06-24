# How to Implement Hot-Warm-Cold Data Tiers in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Tiering, Performance, Atlas, Storage

Description: Learn how to implement hot-warm-cold data tiering in MongoDB to optimize storage costs and query performance across different data lifecycle stages.

---

## Understanding Data Tiers in MongoDB

Data tiering separates data by access frequency into three tiers:
- **Hot** - recently created data, queried frequently, stored on fast NVMe SSD
- **Warm** - data accessed occasionally, stored on standard SSD
- **Cold** - historical data, rarely accessed, stored on compressed archives or object storage

MongoDB Atlas Online Archive provides native tiering. For self-hosted deployments, you implement tiering manually using separate collections or databases.

## Designing the Data Model

Use a status or date field to track tier assignment:

```javascript
// Document structure with tier metadata
{
  _id: ObjectId(),
  userId: "u123",
  event: "purchase",
  amount: 49.99,
  createdAt: ISODate("2024-01-15"),
  tier: "hot"  // hot | warm | cold
}
```

## Hot Tier - Active Collections

Keep the hot collection lean with only recent data. Create a compound index matching your most common query pattern:

```javascript
// Hot collection: last 30 days
db.events_hot.createIndex({ userId: 1, createdAt: -1 });
db.events_hot.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
```

The TTL index automatically evicts documents from the hot tier after 30 days.

## Warm Tier - Recent Historical Data

The warm collection holds data from 30 days to 1 year old:

```javascript
// Move from hot to warm (run daily via scheduled trigger)
const warmCutoff = new Date();
warmCutoff.setDate(warmCutoff.getDate() - 30);

db.events_hot.aggregate([
  { $match: { createdAt: { $lt: warmCutoff } } },
  { $addFields: { tier: "warm" } },
  { $merge: { into: "events_warm", whenMatched: "replace", whenNotMatched: "insert" } }
]);

db.events_hot.deleteMany({ createdAt: { $lt: warmCutoff } });
```

Index the warm tier for common reporting queries:

```javascript
db.events_warm.createIndex({ createdAt: 1 });
db.events_warm.createIndex({ userId: 1, createdAt: 1 });
```

## Cold Tier - Long-Term Archives

Move data older than 1 year to the cold collection using zstd compression:

```javascript
db.createCollection("events_cold", {
  storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } }
});

// Move to cold tier
const coldCutoff = new Date();
coldCutoff.setFullYear(coldCutoff.getFullYear() - 1);

db.events_warm.aggregate([
  { $match: { createdAt: { $lt: coldCutoff } } },
  { $addFields: { tier: "cold" } },
  { $merge: { into: "events_cold", whenMatched: "replace", whenNotMatched: "insert" } }
]);

db.events_warm.deleteMany({ createdAt: { $lt: coldCutoff } });
```

## Querying Across Tiers

Use `$unionWith` to query across all three tiers when needed:

```javascript
db.events_hot.aggregate([
  { $match: { userId: "u123" } },
  { $unionWith: { coll: "events_warm", pipeline: [{ $match: { userId: "u123" } }] } },
  { $unionWith: { coll: "events_cold", pipeline: [{ $match: { userId: "u123" } }] } },
  { $sort: { createdAt: -1 } }
]);
```

For most queries, only target the hot or warm tier to keep latency low.

## Atlas Online Archive for Automated Tiering

In MongoDB Atlas, use Online Archive to automate cold tiering:

```javascript
// Atlas Admin API - create online archive rule
// POST /api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives
{
  "collName": "events",
  "criteria": {
    "type": "DATE",
    "dateField": "createdAt",
    "dateFormat": "ISODATE",
    "expireAfterDays": 365
  },
  "partitionFields": [
    { "fieldName": "userId", "order": 0 },
    { "fieldName": "createdAt", "order": 1 }
  ]
}
```

## Monitoring Tier Distribution

Track how data is distributed across tiers:

```javascript
["events_hot", "events_warm", "events_cold"].forEach(coll => {
  const stats = db[coll].stats();
  print(`${coll}: ${stats.count} docs, ${(stats.storageSize / 1024 / 1024).toFixed(1)} MB`);
});
```

## Summary

Hot-warm-cold data tiering in MongoDB uses separate collections with TTL indexes on the hot tier, scheduled aggregation pipelines to migrate data between tiers, and zstd compression on cold collections. MongoDB Atlas Online Archive automates this process for managed deployments. Querying across tiers is possible using `$unionWith` but should be minimized for performance.
