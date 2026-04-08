# How to Use db.collection.totalSize() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Storage, Index, Capacity

Description: Learn how db.collection.totalSize() combines document storage and index storage to give a complete picture of a collection's disk footprint.

---

## Overview

`db.collection.totalSize()` returns the total amount of storage used by a collection in bytes, combining both the space used by documents (`storageSize`) and the space used by all indexes (`totalIndexSize`). It gives you the single most comprehensive measure of how much disk space a collection occupies.

```javascript
db.orders.totalSize()
// Returns: 42106880  (bytes)
```

## How totalSize() is Calculated

Internally, `totalSize()` is equivalent to:

```javascript
db.orders.storageSize() + db.orders.totalIndexSize()
```

You can verify this manually:

```javascript
const docStorage   = db.orders.storageSize();
const indexStorage = db.orders.totalIndexSize();
const manual       = docStorage + indexStorage;
const reported     = db.orders.totalSize();

print(`Manual total:   ${manual}`);
print(`Reported total: ${reported}`);
// These should match
```

## Converting to Readable Units

```javascript
function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(2) + ' KB';
}

print(formatBytes(db.orders.totalSize()));
```

## Comparing Collections by Total Size

`totalSize()` is ideal for ranking collections by overall disk usage, since it accounts for both documents and indexes:

```javascript
db.getCollectionNames()
  .map(name => ({
    collection: name,
    totalBytes: db[name].totalSize()
  }))
  .sort((a, b) => b.totalBytes - a.totalBytes)
  .slice(0, 10)
  .forEach(c => {
    print(`${c.collection}: ${formatBytes(c.totalBytes)}`);
  });
```

## Understanding Document vs Index Ratio

Knowing what fraction of total size is indexes helps identify over-indexed collections:

```javascript
const stats = db.orders.stats();
const totalSize = stats.storageSize + stats.totalIndexSize;
const docPct   = ((stats.storageSize / totalSize) * 100).toFixed(1);
const indexPct = ((stats.totalIndexSize / totalSize) * 100).toFixed(1);

print(`Documents: ${docPct}%`);
print(`Indexes:   ${indexPct}%`);
```

If indexes take up more than 50% of total size, consider whether all indexes are being used. Check with `$indexStats` to identify unused indexes.

## Tracking Growth Over Time

Schedule a script to log `totalSize()` values periodically:

```javascript
const entry = {
  timestamp: new Date(),
  collection: 'orders',
  totalBytes: db.orders.totalSize()
};

db.sizeHistory.insertOne(entry);
```

Query the history later to calculate growth rates and project when you will need additional storage.

## Use in Capacity Alerts

```javascript
const LIMIT_GB = 50;
const limitBytes = LIMIT_GB * 1024 * 1024 * 1024;
const current = db.orders.totalSize();

if (current > limitBytes * 0.8) {
  print(`Warning: orders is at ${((current / limitBytes) * 100).toFixed(1)}% of ${LIMIT_GB} GB limit`);
}
```

## Summary

`db.collection.totalSize()` is the quickest way to understand the total disk footprint of a MongoDB collection, combining document and index storage into a single value. Use it for capacity planning dashboards, growth tracking, and automated alerting. Pair it with `storageSize()` and `totalIndexSize()` when you need to break down the components individually.
