# How to Configure Collection-Level Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, WiredTiger, Storage, Performance

Description: Learn how to configure WiredTiger collection compression and index prefix compression in MongoDB to reduce disk usage and improve I/O performance.

---

## Compression in MongoDB

MongoDB's WiredTiger storage engine supports compression for collection data. Indexes use prefix compression, and the journal uses its own compressor. Compression reduces disk storage and I/O bandwidth but uses CPU to compress and decompress data.

Available algorithms:

| Algorithm | Speed | Ratio | Best For |
|-----------|-------|-------|----------|
| snappy    | Fast  | ~2:1  | General use (default) |
| zlib      | Slow  | ~3:1  | Maximum compression |
| zstd      | Fast  | ~3:1  | Best balance (MongoDB 4.2+) |
| none      | -     | 1:1   | Already-compressed data |

## Checking Current Compression

```javascript
// Check collection stats to see storage size
db.orders.stats()
// Look for: storageSize (compressed), totalSize, wiredTiger.type

// Detailed WiredTiger stats
db.orders.stats().wiredTiger
// Returns compression algorithm and block details
```

## Setting Compression When Creating a Collection

```javascript
// Create with zstd compression (recommended for new collections)
db.createCollection("orders", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
})

// Create with zlib for maximum compression
db.createCollection("archiveLogs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zlib"
    }
  }
})

// Create with no compression (for JPEG images, already-compressed data)
db.createCollection("rawImages", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=none"
    }
  }
})
```

## Index Compression

Indexes use prefix compression. There is no per-collection block compressor for index data:

```yaml
storage:
  wiredTiger:
    indexConfig:
      prefixCompression: true
```

## Changing Default Compression in mongod.conf

Set the default compression for all new collections:

```yaml
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
```

Restart mongod after changing this:

```bash
sudo systemctl restart mongod
```

Note: existing collections are not affected - this only applies to newly created collections.

## Changing Compression on an Existing Collection

MongoDB does not change a collection's block compressor in place. Create a new collection with the desired compression, copy the data into it, then swap names:

```javascript
db.createCollection("orders_compressed", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
});

db.orders.aggregate([
  { $match: {} },
  {
    $merge: {
      into: "orders_compressed",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
]);

// Recreate indexes on the new collection, verify counts, then rename/swap collections.
```

## Measuring Compression Savings

```javascript
// Compare storage before and after
const stats = db.orders.stats({ scale: 1048576 })
console.log("Storage size (MB):", stats.storageSize)
console.log("Data size uncompressed (MB):", stats.size)
console.log("Compression ratio:", (stats.size / stats.storageSize).toFixed(2) + "x")
```

## Compression for Time Series Collections

Time series collections use columnar storage with their own compression. You can still specify the block compressor:

```javascript
db.createCollection("sensorData", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  },
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
})
```

Time series collections generally achieve very high compression (10:1 or more) due to columnar bucketing.

## Compression and CPU Tradeoff

```javascript
// Check WiredTiger cache and I/O for storage efficiency
db.serverStatus().wiredTiger.cache
db.serverStatus().wiredTiger["block-manager"]

// If CPU is consistently high, consider switching from zlib to zstd or snappy
// Use OS-level tools (top, htop, mongostat) to monitor CPU usage
```

## Summary

MongoDB WiredTiger supports snappy (default), zlib, zstd, and no compression per collection. Configure compression at collection creation time using `storageEngine.wiredTiger.configString`, set `block_compressor=zstd` in mongod.conf for new collection defaults, and use the export-recreate-import pattern to change compression on existing collections. Monitor the compression ratio and CPU cost to find the right balance for your workload.
