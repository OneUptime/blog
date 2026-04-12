# How to Use db.stats() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Statistics, Administration, Storage, Monitoring

Description: Use db.stats() to inspect database-level storage metrics including data size, index size, storage overhead, and object counts across all collections.

---

## What Is db.stats()

`db.stats()` returns storage statistics for the current database. It aggregates data from all collections and provides a single view of the database's total size, index size, storage engine usage, and object count. This is useful for capacity planning, detecting bloat, and monitoring growth.

## Basic Usage

```javascript
use myapp;

db.stats();
```

Sample output:

```json
{
  "db": "myapp",
  "collections": 8,
  "views": 2,
  "objects": 125847,
  "avgObjSize": 512,
  "dataSize": 64433664,
  "storageSize": 36864000,
  "indexes": 18,
  "indexSize": 12288000,
  "totalSize": 49152000,
  "scaleFactor": 1,
  "ok": 1
}
```

## Key Fields Explained

| Field | Meaning |
|---|---|
| `objects` | Total document count across all collections |
| `dataSize` | Logical size of all documents in bytes |
| `storageSize` | Allocated storage on disk (compressed with WiredTiger; includes preallocated and freed but unreused space) |
| `indexSize` | Total size of all indexes in bytes |
| `totalSize` | `storageSize` + `indexSize` |
| `avgObjSize` | Average document size in bytes |

## Display in Megabytes

`db.stats()` returns sizes in bytes by default. Pass a `scale` argument for human-readable output:

```javascript
// Scale by 1024 * 1024 for megabytes
db.stats(1024 * 1024);
```

Output will have `scaleFactor: 1048576` and sizes in MB.

## Compare Data Size vs Storage Size

With WiredTiger compression, `dataSize` (uncompressed) is normally larger than `storageSize` (compressed on disk). When `storageSize` significantly exceeds `dataSize`, it indicates fragmentation or bloat from deleted documents. Reclaim space by running `compact`:

```javascript
const stats = db.stats();
const compressionRatio = stats.dataSize / stats.storageSize;
print(`Compression ratio: ${compressionRatio.toFixed(2)}`);

// If ratio < 0.5, consider compacting collections
db.runCommand({ compact: "orders" });
```

## Monitor Index Overhead

Check if indexes are consuming more space than the data itself:

```javascript
const stats = db.stats();
const indexDataRatio = stats.indexSize / stats.dataSize;
print(`Index to data ratio: ${indexDataRatio.toFixed(2)}`);

if (indexDataRatio > 1.0) {
  print("Warning: indexes are larger than the data itself. Review unused indexes.");
}
```

## Automate Monitoring with a Script

Track database size growth over time by logging stats periodically:

```javascript
// Run this as a scheduled mongosh script
const stats = db.stats(1);
const report = {
  timestamp: new Date(),
  db: stats.db,
  dataSizeMB: (stats.dataSize / 1024 / 1024).toFixed(2),
  indexSizeMB: (stats.indexSize / 1024 / 1024).toFixed(2),
  totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
  objects: stats.objects,
};
db.dbSizeHistory.insertOne(report);
```

## Per-Collection Stats vs db.stats()

`db.stats()` aggregates all collections. For per-collection detail, use `db.collection.stats()`:

```javascript
// Compare collection-level vs database-level
db.getCollectionNames().forEach((name) => {
  const cs = db[name].stats(1024 * 1024);
  print(`${name}: data=${cs.size.toFixed(1)}MB, index=${cs.totalIndexSize.toFixed(1)}MB`);
});
```

## Using the Driver (Node.js)

```javascript
const { MongoClient } = require("mongodb");

async function getDatabaseStats(databaseName) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const db = client.db(databaseName);

  const stats = await db.command({ dbStats: 1, scale: 1024 * 1024 });
  console.log(`Database: ${stats.db}`);
  console.log(`Data size: ${stats.dataSize.toFixed(2)} MB`);
  console.log(`Index size: ${stats.indexSize.toFixed(2)} MB`);
  console.log(`Total objects: ${stats.objects}`);

  await client.close();
}

getDatabaseStats("myapp");
```

## Summary

`db.stats()` provides a database-wide aggregate of document count, data size, storage allocation, and index size. Pass a `scale` parameter (e.g., `1024*1024`) for megabyte-scaled output. Compare `dataSize` vs `storageSize` to detect fragmentation and determine whether `compact` is warranted. Monitor the index-to-data ratio to find over-indexed collections. Use per-collection `stats()` for granular analysis and `db.stats()` for capacity planning and growth monitoring.
