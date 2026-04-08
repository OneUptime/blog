# How to Use db.collection.storageSize() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Storage, Disk, Performance

Description: Learn how db.collection.storageSize() returns the on-disk storage space allocated for a MongoDB collection and how to use it for capacity planning.

---

## Overview

`db.collection.storageSize()` returns the total amount of storage space, in bytes, that MongoDB has allocated on disk for the collection's documents. Unlike the logical document size returned by other methods, this value reflects actual disk allocation including any preallocated space and internal storage engine overhead.

```javascript
db.orders.storageSize()
// Returns: 36864000  (bytes)
```

## storageSize vs size

Understanding the difference between these two values is important:

- `size` - Total uncompressed size of all documents
- `storageSize` - Actual bytes allocated on disk for documents (compressed in WiredTiger)

```javascript
const stats = db.orders.stats();
print(`Logical size:  ${stats.size} bytes`);
print(`Storage size:  ${stats.storageSize} bytes`);
print(`Compression ratio: ${(stats.size / stats.storageSize).toFixed(2)}x`);
```

WiredTiger compression typically achieves 2x-5x compression, so `storageSize` is often significantly smaller than `size`.

## Converting to Human-Readable Units

The raw byte value can be difficult to read for large collections. Convert it yourself:

```javascript
function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function bytesToGB(bytes) {
  return (bytes / (1024 * 1024 * 1024)).toFixed(3) + ' GB';
}

const storageBytes = db.orders.storageSize();
print(`Storage size: ${bytesToMB(storageBytes)}`);
print(`Storage size: ${bytesToGB(storageBytes)}`);
```

## Monitoring Storage Across Collections

Use `storageSize()` in a loop to build a storage report for all collections in a database:

```javascript
db.getCollectionNames()
  .map(name => ({
    collection: name,
    storageMB: (db[name].storageSize() / (1024 * 1024)).toFixed(2)
  }))
  .sort((a, b) => b.storageMB - a.storageMB)
  .forEach(entry => {
    print(`${entry.collection}: ${entry.storageMB} MB`);
  });
```

This gives you a sorted view of your largest collections by disk footprint.

## Automation with Alerting

You can script an alert if a collection exceeds a storage threshold:

```javascript
const limitBytes = 10 * 1024 * 1024 * 1024; // 10 GB
const storageBytes = db.orders.storageSize();

if (storageBytes > limitBytes) {
  print(`ALERT: orders collection exceeds 10 GB (${storageBytes} bytes)`);
}
```

## Relationship to totalSize()

`storageSize()` covers only document storage. Index storage is separate. To get the combined total:

```javascript
const docStorage = db.orders.storageSize();
const indexStorage = db.orders.totalIndexSize();
const total = docStorage + indexStorage;

print(`Documents: ${docStorage} bytes`);
print(`Indexes:   ${indexStorage} bytes`);
print(`Total:     ${total} bytes`);
```

Alternatively, `db.orders.totalSize()` computes this sum directly.

## Practical Use Cases

- **Capacity planning** - Estimate how quickly storage grows over time by polling `storageSize()` on a schedule.
- **Compression auditing** - Compare logical vs physical sizes to validate that WiredTiger compression is working as expected.
- **Cost optimization** - Identify collections that consume disproportionate disk space and could benefit from TTL indexes or archival.

## Summary

`db.collection.storageSize()` gives you the raw disk footprint of a MongoDB collection's documents, separate from index storage. Use it alongside `dataSize()` and `totalIndexSize()` to build a complete picture of collection storage. Automating these checks helps you get ahead of capacity issues before they affect application performance.
