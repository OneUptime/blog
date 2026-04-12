# How to Monitor Document Size in MongoDB Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Document, Monitoring, Storage

Description: Learn how to monitor document size in MongoDB collections to detect bloat, identify outliers approaching the 16MB limit, and optimize storage usage.

---

## Why Monitor Document Size

MongoDB enforces a 16MB document size limit. Documents approaching this limit cause insert errors and often indicate a design problem like unbounded array growth. Monitoring average and maximum document sizes helps you catch these issues before they cause production failures.

## Method 1: Collection Stats

The `collStats` command provides aggregate size metrics:

```javascript
const stats = db.runCommand({ collStats: "orders" });

print(`Count:           ${stats.count}`);
print(`Avg doc size:    ${(stats.avgObjSize / 1024).toFixed(1)} KB`);
print(`Total data size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
print(`Storage size:    ${(stats.storageSize / 1024 / 1024).toFixed(1)} MB`);
print(`Compression:     ${((1 - stats.storageSize / stats.size) * 100).toFixed(1)}%`);
```

The `avgObjSize` field gives you the uncompressed average size in bytes.

## Method 2: Find Large Documents

Use the aggregation pipeline to find documents above a size threshold:

```javascript
db.orders.aggregate([
  {
    $project: {
      _id: 1,
      customerId: 1,
      bsonSize: { $bsonSize: "$$ROOT" }
    }
  },
  {
    $match: {
      bsonSize: { $gt: 1024 * 1024 } // Documents larger than 1MB
    }
  },
  {
    $sort: { bsonSize: -1 }
  },
  {
    $limit: 20
  }
]);
```

The `$bsonSize` operator (available from MongoDB 4.4) returns the serialized BSON size of a document.

## Method 3: Distribution Analysis

Understand the distribution of document sizes across your collection:

```javascript
db.orders.aggregate([
  {
    $project: {
      sizeKB: { $divide: [{ $bsonSize: "$$ROOT" }, 1024] }
    }
  },
  {
    $bucket: {
      groupBy: "$sizeKB",
      boundaries: [0, 1, 10, 100, 512, 1024, 5120, 16384],
      default: "over_16MB",
      output: { count: { $sum: 1 } }
    }
  }
]);
```

Sample output:

```text
{ _id: 0,    count: 45230 }  // 0-1 KB
{ _id: 1,    count: 12890 }  // 1-10 KB
{ _id: 10,   count: 3421  }  // 10-100 KB
{ _id: 100,  count: 234   }  // 100-512 KB
{ _id: 512,  count: 12    }  // 512KB-1MB
{ _id: 1024, count: 2     }  // 1MB-5MB
```

## Method 4: Monitor Growth Over Time

Track average document size over time by sampling periodically:

```javascript
// Run this as a scheduled job and store results
const stats = db.orders.stats();
db.size_metrics.insertOne({
  collection: "orders",
  timestamp: new Date(),
  count: stats.count,
  avgObjSize: stats.avgObjSize,
  totalSize: stats.size
});

// Query trend
db.size_metrics.find(
  { collection: "orders" },
  { timestamp: 1, avgObjSize: 1, count: 1 }
).sort({ timestamp: -1 }).limit(30);
```

## Method 5: Alert on Documents Approaching Limit

Set up a monitoring query to detect documents nearing the 16MB limit:

```javascript
const WARNING_THRESHOLD = 12 * 1024 * 1024; // 12MB (75% of limit)

const largeDocCount = db.events.aggregate([
  {
    $project: {
      bsonSize: { $bsonSize: "$$ROOT" }
    }
  },
  {
    $match: { bsonSize: { $gt: WARNING_THRESHOLD } }
  },
  {
    $count: "total"
  }
]).toArray();

if (largeDocCount.length > 0) {
  print(`WARNING: ${largeDocCount[0].total} documents exceed 12MB`);
}
```

## Method 6: Identify Which Fields Contribute to Size

Find which fields are making documents large:

```javascript
db.orders.aggregate([
  { $sample: { size: 1000 } },
  {
    $project: {
      lineItemsSize: { $bsonSize: "$lineItems" },
      metadataSize: { $bsonSize: "$metadata" },
      totalSize: { $bsonSize: "$$ROOT" }
    }
  },
  {
    $group: {
      _id: null,
      avgLineItemsSize: { $avg: "$lineItemsSize" },
      avgMetadataSize: { $avg: "$metadataSize" },
      avgTotalSize: { $avg: "$totalSize" }
    }
  }
]);
```

This pinpoints which arrays or subdocuments are the primary size contributors.

## Summary

Monitoring MongoDB document size uses `collStats` for collection-level averages, the `$bsonSize` operator for per-document size measurement, bucket aggregations for size distributions, and scheduled sampling to track growth trends. Set up alerts for documents exceeding 12MB (75% of the 16MB limit) to catch unbounded growth before it causes failures.
