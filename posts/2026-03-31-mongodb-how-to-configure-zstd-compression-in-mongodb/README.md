# How to Configure Zstd Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, ZSTD, WiredTiger, Performance

Description: Learn how to configure Zstd compression in MongoDB 4.2+ for best-in-class compression ratios with fast decompression speeds.

---

## Why Use Zstd Compression

Zstd (Zstandard) was introduced in MongoDB 4.2 and offers the best compression ratio among MongoDB's built-in algorithms while maintaining fast decompression. It typically outperforms both Snappy and Zlib on modern hardware.

## Requirements

Zstd requires:
- MongoDB 4.2 or later
- WiredTiger storage engine (default since MongoDB 3.2)

## Configuring Zstd in mongod.conf

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
```

## Starting mongod with Zstd

```bash
mongod \
  --storageEngine wiredTiger \
  --wiredTigerCollectionBlockCompressor zstd \
  --dbpath /var/lib/mongodb
```

## Creating a Collection with Zstd

```javascript
db.createCollection("metrics", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
})
```

## Zstd Compression Levels

MongoDB exposes `storage.wiredTiger.engineConfig.zstdCompressionLevel` for tuning Zstd. Higher values compress more but are slower to compress; decompression remains fast:

```yaml
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      zstdCompressionLevel: 15
```

For real-time data, use lower levels:

```yaml
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      zstdCompressionLevel: 3
```

## Comparing Zstd to Other Algorithms

```bash
# Typical compression ratios on log data:
# Snappy:  ~2.5x compression
# Zlib:    ~3.5x compression
# Zstd:    ~4.0x compression

# Typical decompression speeds (MB/s):
# Snappy:  ~1500 MB/s
# Zlib:    ~400 MB/s
# Zstd:    ~1200 MB/s
```

## Verifying Zstd Is Active

```javascript
db.metrics.stats().wiredTiger.creationString
// Should contain: block_compressor=zstd

// Check storage savings
const s = db.metrics.stats()
print("Data size:", s.size, "bytes")
print("Storage size:", s.storageSize, "bytes")
print("Ratio:", (s.size / s.storageSize).toFixed(2) + "x")
```

## Wire Protocol Compression with Zstd

You can also compress network traffic between clients and MongoDB using Zstd:

```yaml
# In mongod.conf
net:
  compression:
    compressors: zstd
```

```javascript
// In Node.js driver
const client = new MongoClient(uri, {
  compressors: ["zstd"]
})
```

## Summary

Zstd is MongoDB's most efficient compression algorithm available in 4.2+, providing higher compression ratios than Snappy and Zlib with fast decompression. Configure it in `mongod.conf` or per collection, and tune the compression level to balance CPU time against storage savings for your workload.
