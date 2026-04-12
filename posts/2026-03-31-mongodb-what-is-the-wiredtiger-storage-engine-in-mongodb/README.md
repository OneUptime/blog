# What Is the WiredTiger Storage Engine in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Storage Engine, Performance, Concurrency

Description: Learn what the WiredTiger storage engine is, how it manages data in MongoDB, and the key features that make it the default choice for production deployments.

---

## What Is WiredTiger

WiredTiger is MongoDB's default storage engine since version 3.2. It replaced the older MMAPv1 engine and brought document-level concurrency, compression, and significantly improved write throughput.

## Key WiredTiger Features

### Document-Level Concurrency Control

WiredTiger uses optimistic concurrency with document-level locking. Multiple writers can modify different documents simultaneously without blocking each other.

```javascript
// These two updates can run in parallel - different documents
db.orders.updateOne({ _id: "order1" }, { $set: { status: "shipped" } })
db.orders.updateOne({ _id: "order2" }, { $set: { status: "delivered" } })
```

### Data Compression

WiredTiger compresses data by default using Snappy:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: snappy    # snappy, zlib, zstd, or none
    indexConfig:
      prefixCompression: true
```

### Checkpoint-Based Durability

WiredTiger writes data to disk every 60 seconds (checkpoint). Between checkpoints, data is in the journal. On crash recovery, MongoDB replays the journal from the last checkpoint.

```yaml
storage:
  journal:
    enabled: true
    commitIntervalMs: 100  # sync journal every 100ms
```

## Cache Configuration

WiredTiger uses a dedicated cache (default: 50% of RAM minus 1GB, min 256MB):

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4  # set explicitly for predictability
```

## Checking Cache Usage

```javascript
db.adminCommand({ serverStatus: 1 }).wiredTiger.cache
// Key metrics:
// "bytes currently in the cache"
// "maximum bytes configured"
// "pages read into cache"
// "pages written from cache"
```

A healthy cache hit ratio is above 95%:

```javascript
const wt = db.adminCommand({ serverStatus: 1 }).wiredTiger
const pagesRequested = wt.cache["pages requested from the cache"]
const cacheMisses = wt.cache["pages read into cache"]
print("Cache hit ratio:", ((1 - cacheMisses/pagesRequested) * 100).toFixed(2) + "%")
```

## Compression Statistics

```javascript
const stats = db.myCollection.stats()
const ratio = stats.size / stats.storageSize
print(`Compression ratio: ${ratio.toFixed(2)}x`)
```

## WiredTiger Configuration Tuning

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
      journalCompressor: snappy
      directoryForIndexes: false
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
```

## Comparing WiredTiger to MMAPv1

| Feature | WiredTiger | MMAPv1 (legacy) |
|---------|-----------|-----------------|
| Concurrency | Document-level | Collection-level |
| Compression | Yes (default) | No |
| Default since | MongoDB 3.2 | Pre-3.2 |
| Memory efficiency | High | Low |

## Summary

WiredTiger is MongoDB's default storage engine providing document-level concurrency, configurable compression, and checkpoint-based durability. Its in-memory cache dramatically reduces disk I/O. Tune the cache size explicitly for predictable behavior, and choose the right compression algorithm (Zstd for best ratio, Snappy for best speed) based on your workload.
