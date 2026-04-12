# How to Reduce Storage Costs with Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, Storage, Cost Optimization, WiredTiger

Description: Learn how to reduce MongoDB storage costs by enabling zstd or snappy compression on collections, indexes, and backups to cut disk usage by 40-70%.

---

## How Compression Reduces Atlas Storage Bills

MongoDB Atlas charges by provisioned storage. Enabling WiredTiger block compression reduces the physical bytes stored on disk, which lowers your storage tier requirement and backup size. Text-heavy collections typically compress to 30-40% of their uncompressed size with zstd, meaning a 100GB collection may only consume 30-40GB on disk.

## Step 1: Check Current Compression Settings

Check what compression is currently applied:

```javascript
// Check collection compression
db.runCommand({ collStats: "orders" }).wiredTiger.creationString;
// Look for "block_compressor=snappy" or "block_compressor=zstd"

// Check all collections
db.getCollectionNames().forEach(coll => {
  const stats = db[coll].stats();
  const compressed = stats.storageSize;
  const uncompressed = stats.size;
  const ratio = uncompressed > 0 ? (1 - compressed / uncompressed) * 100 : 0;
  print(`${coll}: ${ratio.toFixed(0)}% compressed (${(compressed/1024/1024).toFixed(1)} MB on disk)`);
});
```

## Step 2: Set Default Compression for New Collections

Configure WiredTiger defaults in `mongod.conf` to use zstd for all new collections:

```yaml
# /etc/mongod.conf
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
    engineConfig:
      journalCompressor: snappy
```

After restarting, all new collections use zstd automatically.

## Step 3: Migrate Existing Collections to Better Compression

Existing collections retain their original compression setting. To change it, rebuild the collection:

```javascript
// Method 1: Re-insert via $out (for smaller collections)
db.orders.aggregate([
  { $out: "orders_new" }
]);

// Then drop old and rename new
// Note: $out creates the new collection using the server default compression
// Ensure mongod.conf is updated to zstd before running

// Method 2: Use mongodump and mongorestore (for larger collections)
// mongodump --db=mydb --collection=orders --archive=orders.archive
// mongorestore --db=mydb --collection=orders --archive=orders.archive --drop
// The restored collection uses the current server default compression
```

Note: The `compact` command defragments and reclaims disk space but does **not** change the collection's block compressor. To actually change compression, you must recreate the collection using one of the methods above.

## Step 4: Measure Compression Improvement

Compare storage before and after:

```javascript
function collectionStorageSummary(collName) {
  const stats = db[collName].stats();
  return {
    collection: collName,
    documents: stats.count,
    dataSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    storageSizeMB: (stats.storageSize / 1024 / 1024).toFixed(2),
    indexSizeMB: (stats.totalIndexSize / 1024 / 1024).toFixed(2),
    compressionRatio: stats.size > 0
      ? ((1 - stats.storageSize / stats.size) * 100).toFixed(1) + "%"
      : "N/A"
  };
}

print(JSON.stringify(collectionStorageSummary("orders"), null, 2));
```

## Step 5: Compress Large Text Fields with Application-Level Compression

For very large string fields (e.g., log messages, HTML content), apply application-level compression:

```python
import zlib
import base64
import pymongo

def compress_field(text: str) -> str:
    compressed = zlib.compress(text.encode("utf-8"), level=9)
    return base64.b64encode(compressed).decode("ascii")

def decompress_field(encoded: str) -> str:
    compressed = base64.b64decode(encoded.encode("ascii"))
    return zlib.decompress(compressed).decode("utf-8")

# Insert with compressed field
doc = {
    "userId": "u123",
    "body": compress_field(large_text_content),
    "bodyCompressed": True
}
db.posts.insert_one(doc)
```

Application-level compression can achieve 70-80% reduction for repetitive text content.

## Step 6: Reduce Index Storage

Indexes are often 20-40% of total collection storage. Optimize them:

```javascript
// Find unused indexes consuming storage
db.orders.aggregate([{ $indexStats: {} }])
  .forEach(idx => {
    const totalOps = idx.accesses.ops;
    if (totalOps === 0) {
      print(`Unused index (${(idx.spec.key)}): consider dropping`);
    }
  });

// Drop identified unused indexes
db.orders.dropIndex("unused_field_1");
```

Dropping unused indexes immediately frees storage and reduces write overhead.

## Step 7: Estimate Cost Savings

Calculate the financial impact of compression improvements:

```python
# Atlas storage pricing (approximate, varies by region and tier)
ATLAS_STORAGE_COST_PER_GB_MONTH = 0.25  # $0.25/GB/month for NVMe storage

current_storage_gb = 500
compression_ratio = 0.60  # 60% reduction with zstd
new_storage_gb = current_storage_gb * (1 - compression_ratio)

monthly_savings = (current_storage_gb - new_storage_gb) * ATLAS_STORAGE_COST_PER_GB_MONTH
annual_savings = monthly_savings * 12

print(f"Current storage: {current_storage_gb} GB -> {new_storage_gb:.0f} GB")
print(f"Monthly savings: ${monthly_savings:.2f}")
print(f"Annual savings:  ${annual_savings:.2f}")
```

## Summary

Reducing MongoDB storage costs with compression requires enabling zstd as the default block compressor in `mongod.conf`, migrating existing collections by recreating them via `$out` or `mongodump`/`mongorestore`, measuring compression ratios across all collections, applying application-level compression for very large text fields, and eliminating unused indexes. Together these measures typically reduce on-disk storage by 40-70% for document-heavy workloads, directly reducing Atlas storage billing.
