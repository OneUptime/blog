# How to Choose Between Snappy, Zlib, and Zstd Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Compression, Performance, Storage

Description: Compare Snappy, Zlib, and Zstd compression algorithms in MongoDB WiredTiger and learn which to choose based on CPU, storage, and performance trade-offs.

---

WiredTiger supports three compression algorithms for collection data: Snappy (default), Zlib, and Zstd. Each makes a different trade-off between compression ratio and CPU overhead. Choosing the right one can significantly reduce storage costs or improve throughput.

## Compression Overview

| Algorithm | Default | Compression Ratio | CPU Cost | Use Case                    |
|-----------|---------|-------------------|----------|-----------------------------|
| Snappy    | Yes     | Moderate (2-3x)   | Very Low | General purpose, low latency |
| Zlib      | No      | High (3-5x)       | Medium   | Storage-constrained systems |
| Zstd      | No      | High (3-5x)       | Low-Med  | Best ratio with low CPU cost |

## Setting Compression in mongod.conf

Configure the default compressor for all new collections:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
```

Restart MongoDB for this to take effect on new collections. Existing collections retain their original compression.

## Setting Compression Per Collection

```javascript
db.createCollection("logs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
});
```

## Checking Current Compression

```javascript
db.getCollectionInfos({ name: "logs" })[0].options.storageEngine
// { wiredTiger: { configString: 'block_compressor=zstd' } }
```

## Recompressing an Existing Collection

To change compression on an existing collection, update the `blockCompressor` in `mongod.conf`, restart MongoDB, then compact the collection to rewrite its data with the new compressor:

```javascript
// After updating blockCompressor in mongod.conf and restarting mongod
db.runCommand({ compact: "logs" });
```

Or use `mongodump` / `mongorestore` to a new collection with the desired compressor.

## Algorithm Deep Dive

### Snappy

Snappy prioritizes speed over ratio. It compresses and decompresses very fast (300-500 MB/s), making it ideal for workloads where CPU is scarce or latency is critical - such as OLTP systems with high read/write throughput.

### Zlib

Zlib (gzip-compatible) achieves better compression than Snappy but at 3-4x the CPU cost. It is suitable for archival collections or analytics workloads where you query infrequently but want to minimize storage.

### Zstd

Zstd (Zstandard) provides compression ratios close to Zlib at speeds close to Snappy. It is generally the best choice for new deployments. MongoDB added Zstd support in version 4.2.

```javascript
// Benchmark storage usage per algorithm
const stats = db.runCommand({ collStats: "events" });
print("Storage size (bytes):", stats.storageSize);
print("Avg object size:", stats.avgObjSize);
```

## Index Compression

Indexes use prefix compression by default, which is separate from block compression. Prefix compression reduces index size by deduplicating common key prefixes and is always recommended:

```yaml
storage:
  wiredTiger:
    indexConfig:
      prefixCompression: true
```

## Recommendations by Workload

```text
OLTP (high frequency reads/writes): Snappy or Zstd
Logging / append-only collections:  Zstd
Archival / cold storage:            Zlib or Zstd
Time series collections:            Zstd (excellent on repetitive numeric data)
```

## Summary

Zstd is the best default choice for most MongoDB deployments as it achieves high compression ratios with relatively low CPU overhead. Use Snappy when write latency is critical and CPU is at a premium. Reserve Zlib for archival workloads where maximum compression is needed and query frequency is low. Configure compression per collection to match the access pattern of each dataset.
