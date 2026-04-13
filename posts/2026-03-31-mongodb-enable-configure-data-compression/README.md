# How to Enable and Configure Data Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, WiredTiger, Storage, Performance

Description: Learn how to configure WiredTiger collection compression and index prefix compression in MongoDB to reduce disk usage and improve I/O performance.

---

## MongoDB Compression Overview

MongoDB uses WiredTiger collection compression for collection data. Indexes use prefix compression, and the journal uses a separate compressor:

- **snappy** (default) - fast compression with moderate ratio, good for most workloads
- **zlib** - higher compression ratio, more CPU overhead, good for archival data
- **zstd** - best ratio with competitive speed, available from MongoDB 4.2+
- **none** - no compression, fastest writes but highest disk usage

Collection block compression is configured at the collection level or globally for new collections. Index prefix compression and journal compression are configured separately.

## Setting Compression in mongod.conf

Configure the default compression for all new collections:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true
    engineConfig:
      journalCompressor: snappy
```

After changing this setting, restart `mongod`. Existing collections are not automatically recompressed - they retain their original settings.

## Setting Compression Per Collection

Override the global default when creating a collection:

```javascript
db.createCollection("archive_events", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
});
```

Use `zstd` for collections with compressible text data or infrequent access, and `snappy` for hot collections where write latency matters.

## Checking Current Compression Settings

Inspect a collection's storage engine configuration:

```javascript
const info = db.getCollectionInfos({ name: "archive_events" })[0];
printjson(info.options.storageEngine);
```

Or use `collStats` to see actual compression savings:

```javascript
const s = db.archive_events.stats();
const ratio = (s.size / s.storageSize).toFixed(2);
print(`Logical size: ${s.size} bytes`);
print(`On-disk size: ${s.storageSize} bytes`);
print(`Compression ratio: ${ratio}x`);
```

## Recompressing an Existing Collection

MongoDB does not change a collection's block compressor in place. Create a new collection with the desired compression, copy the data into it, then swap names:

```javascript
db.createCollection("new_events", {
  storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } }
});

db.old_events.aggregate([
  { $match: {} },
  {
    $merge: {
      into: "new_events",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
]);

// Recreate indexes on the new collection, verify counts, then rename/swap collections.
```

## Compression for Index Prefix

Index prefix compression reduces index size on disk with no query performance impact:

```yaml
storage:
  wiredTiger:
    indexConfig:
      prefixCompression: true
```

Prefix compression is enabled by default for indexes and should not be disabled unless you have a very specific reason.

## Choosing the Right Compressor

```text
Workload Type          | Recommended Compressor
-----------------------|-----------------------
Hot write-heavy        | snappy
Balanced read/write    | snappy or zstd
Read-heavy / archival  | zstd
Legacy (pre-4.2)       | zlib
Uncompressible data    | none
```

## Summary

Configure WiredTiger compression in `mongod.conf` for global defaults and per-collection using `createCollection` with a `configString`. Use `zstd` for the best compression ratio on MongoDB 4.2+, `snappy` for write-sensitive workloads, and `none` only for data that is already compressed (images, video). Check actual savings with `collStats` and recompress existing collections by recreating them with the new setting.
