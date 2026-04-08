# How to Check Collection Size and Storage Stats in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Administration, Monitoring, Storage, Performance

Description: Learn how to check MongoDB collection size and storage statistics using collStats, db.stats(), and the aggregation pipeline for capacity planning.

---

Understanding collection size and storage statistics is essential for capacity planning, identifying bloated collections, and deciding when to compact or archive data. MongoDB provides several commands that expose detailed storage metrics.

## Quick Size Check with dataSize and storageSize

```javascript
// Total logical data size (uncompressed)
db.myCollection.dataSize()

// Actual storage on disk (WiredTiger compresses data)
db.myCollection.storageSize()

// Total size including indexes
db.myCollection.totalSize()

// Number of documents
db.myCollection.countDocuments()

// Average document size in bytes
db.myCollection.stats().avgObjSize
```

## Full Collection Statistics with collStats

> **Note:** The `collStats` command is deprecated as of MongoDB 6.2. For MongoDB 6.2+, consider using the [`$collStats`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/) aggregation stage instead.

```javascript
db.runCommand({ collStats: "myCollection" })
```

Key fields in the output:

```json
{
  "count": 150000,
  "size": 45678900,
  "avgObjSize": 304,
  "storageSize": 12345678,
  "totalIndexSize": 3456789,
  "indexSizes": {
    "_id_": 1234567,
    "email_1": 2222222
  },
  "wiredTiger": { ... }
}
```

- `size` - logical data size in bytes
- `storageSize` - compressed on-disk size
- `totalIndexSize` - combined size of all indexes
- `avgObjSize` - average document size

## Human-Readable Output with stats()

```javascript
// Scale values: 1 = bytes, 1024 = KB, 1048576 = MB
db.myCollection.stats(1048576)
```

This divides all size values by 1 MB for easier reading.

## Checking All Collections in a Database

```javascript
db.getCollectionNames().forEach(coll => {
  const stats = db[coll].stats();
  const sizeMB = (stats.storageSize / 1048576).toFixed(2);
  const indexMB = (stats.totalIndexSize / 1048576).toFixed(2);
  print(`${coll}: storage=${sizeMB} MB, indexes=${indexMB} MB, docs=${stats.count}`);
});
```

## Database-Level Stats

```javascript
db.stats()
```

Returns:

```json
{
  "db": "myDatabase",
  "collections": 12,
  "objects": 2500000,
  "dataSize": 890000000,
  "storageSize": 234000000,
  "indexes": 28,
  "indexSize": 56000000,
  "totalSize": 290000000
}
```

## Finding the Largest Collections

```javascript
const results = db.getCollectionNames().map(coll => {
  const s = db[coll].stats();
  return { name: coll, sizeMB: s.storageSize / 1048576 };
});

results.sort((a, b) => b.sizeMB - a.sizeMB).slice(0, 5).forEach(r => {
  print(`${r.name}: ${r.sizeMB.toFixed(2)} MB`);
});
```

## Index Size Breakdown

To see which indexes are consuming the most space:

```javascript
const stats = db.myCollection.stats();
const indexSizes = stats.indexSizes;
Object.entries(indexSizes)
  .sort(([, a], [, b]) => b - a)
  .forEach(([name, size]) => {
    print(`${name}: ${(size / 1048576).toFixed(2)} MB`);
  });
```

## Checking Compression Ratio

WiredTiger compresses data. The compression ratio shows efficiency:

```javascript
const s = db.myCollection.stats();
const ratio = s.size / s.storageSize;
print(`Compression ratio: ${ratio.toFixed(2)}x`);
```

A ratio of 1.5-2.5x is typical for snappy compression on JSON-like data. Higher ratios (3-5x) are possible with zlib or zstd compression, which WiredTiger also supports.

## Summary

Use `db.collection.stats()` or `db.runCommand({ collStats: "name" })` to get detailed storage metrics. Check `storageSize` for actual disk usage, `totalIndexSize` for index overhead, and `avgObjSize` for document sizing. Script across all collections to identify the largest consumers for capacity planning decisions.
