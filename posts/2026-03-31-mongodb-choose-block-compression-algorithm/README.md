# How to Choose Block Compression Algorithm in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, WiredTiger, Storage, Performance

Description: Learn how to choose between Snappy, Zlib, and Zstd block compression algorithms in MongoDB WiredTiger for optimal storage and CPU trade-offs.

---

## Why Block Compression Matters

MongoDB's WiredTiger storage engine compresses collection data blocks on disk. Compression reduces storage costs and I/O bandwidth - which is often the bottleneck for read-heavy workloads - but it adds CPU overhead for encoding and decoding. Choosing the right algorithm for your workload is a balance between compression ratio, CPU cost, and read/write latency.

MongoDB supports four collection compression settings: Snappy (default), Zlib, Zstd, and none. Indexes use separate prefix compression, which is enabled by default.

## Comparison of Algorithms

```text
Algorithm   Compression Ratio   CPU Cost    Best For
---------   -----------------   --------    --------
Snappy      Low-Medium          Very Low    General workloads, low-latency reads/writes
Zlib        High                Medium      Storage-constrained, batch analytics
Zstd        High                Low-Medium  Best ratio-per-CPU, MongoDB 4.2+
```

- **Snappy** (default): Fast compression and decompression with modest ratio. Best for OLTP workloads where latency matters.
- **Zlib**: Higher compression ratios but slower. Suitable for archival or infrequently accessed collections.
- **Zstd**: Best compression ratio with CPU cost between Snappy and Zlib. Recommended for most new deployments on MongoDB 4.2+.

## Configuring Compression at the Database Level

Set the default compression for all new collections in `mongod.conf`:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
```

Restart `mongod` after changing this setting. Existing collections are not retroactively recompressed, and existing indexes keep their current prefix-compression setting.

## Configuring Compression per Collection

Override the default for a specific collection at creation time:

```javascript
db.createCollection("archive_logs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zlib"
    }
  }
});

db.createCollection("hot_orders", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=snappy"
    }
  }
});
```

This lets you apply different strategies: fast compression for hot data and high compression for cold archives.

## Measuring Compression Ratio

Compare compressed vs. uncompressed sizes using `db.collection.stats()`:

```javascript
const stats = db.archive_logs.stats({ scale: 1024 * 1024 });
const ratio = stats.size / stats.storageSize;
console.log(`Compression ratio: ${ratio.toFixed(2)}x`);
console.log(`Logical size: ${stats.size.toFixed(2)} MB`);
console.log(`On-disk size: ${stats.storageSize.toFixed(2)} MB`);
```

A higher `ratio` means more compression. Typical values:
- Snappy: 1.5-2.5x on JSON-like documents
- Zlib: 3-6x
- Zstd: 3-7x

## Benchmarking on Your Data

No benchmark is universal - your actual data characteristics (entropy, repetition, field sizes) determine the real ratio. Run a quick test by loading sample data into collections with different compressors:

```bash
# Insert 100,000 sample documents into each collection
mongosh --eval "
for (let i = 0; i < 100000; i++) {
  db.test_snappy.insertOne({ name: 'user' + i, email: 'user' + i + '@example.com', ts: new Date() });
  db.test_zstd.insertOne({ name: 'user' + i, email: 'user' + i + '@example.com', ts: new Date() });
}
"

# Compare storage sizes
mongosh --eval "
['test_snappy','test_zstd'].forEach(c => {
  const s = db[c].stats({ scale: 1048576 });
  print(c, 'storageSize:', s.storageSize.toFixed(2), 'MB');
});
"
```

## Recommendation

For most new MongoDB deployments on version 4.2 or later, use **Zstd**. It provides significantly better compression than Snappy with comparable CPU overhead in most workloads. Reserve Zlib for archival collections where CPU budget is less constrained and maximum compression matters.

## Summary

MongoDB's WiredTiger engine supports Snappy, Zlib, and Zstd block compression. Snappy is the default and best for low-latency OLTP. Zstd offers the best compression-to-CPU trade-off for MongoDB 4.2+ and is the recommended choice for new deployments. Zlib suits archival data where high compression ratios outweigh CPU cost. Configure compression globally in `mongod.conf` or per-collection using `storageEngine.wiredTiger.configString`.
