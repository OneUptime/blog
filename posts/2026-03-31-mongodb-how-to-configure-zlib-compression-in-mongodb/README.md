# How to Configure Zlib Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, Zlib, WiredTiger, Storage

Description: Learn how to configure Zlib compression in MongoDB to achieve higher data compression ratios at the cost of slightly increased CPU usage.

---

## Why Use Zlib Compression

Zlib provides higher compression ratios than Snappy, reducing disk usage by 20-40% more in many workloads. The tradeoff is slightly higher CPU consumption during reads and writes.

## Configuring Zlib in mongod.conf

Set Zlib as the default block compressor:

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    collectionConfig:
      blockCompressor: zlib
    indexConfig:
      prefixCompression: true
```

## Starting mongod with Zlib

```bash
mongod \
  --storageEngine wiredTiger \
  --wiredTigerCollectionBlockCompressor zlib \
  --dbpath /var/lib/mongodb
```

## Creating a Collection with Zlib

Apply Zlib compression to a specific collection:

```javascript
db.createCollection("audit_logs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zlib"
    }
  }
})
```

## Zlib Compression Levels

While Zlib itself supports compression levels 1-9, WiredTiger does not expose a configuration option to set the Zlib compression level. MongoDB's WiredTiger integration uses Zlib's default compression level (level 6) for all Zlib-compressed collections. To use Zlib compression on a collection, simply specify the block compressor:

```javascript
db.createCollection("archive", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zlib"
    }
  }
})
```

## Verifying Zlib Is Active

```javascript
db.audit_logs.stats().wiredTiger.creationString
// Should contain: block_compressor=zlib
```

Check compression ratio:

```javascript
const stats = db.audit_logs.stats()
const ratio = (stats.size / stats.storageSize).toFixed(2)
print(`Compression ratio: ${ratio}x`)
```

## Migrating Existing Collections to Zlib

MongoDB does not recompress data in place. Use `mongodump` and `mongorestore` or a change-stream copy to migrate:

```bash
mongodump --db=mydb --collection=mylogs --out=/tmp/backup
# Drop and recreate with Zlib
mongorestore --db=mydb --collection=mylogs /tmp/backup/mydb/mylogs.bson
```

## When to Choose Zlib

Use Zlib for:
- Log archives and audit trails with highly repetitive text data
- Cold storage collections where read latency is less critical
- Storage cost reduction when CPU capacity is available
- Environments with I/O bottlenecks rather than CPU bottlenecks

## Summary

Zlib compression is configured in MongoDB via `mongod.conf` or per-collection `storageEngine` options. It achieves better compression ratios than Snappy at the cost of additional CPU time. For text-heavy, write-once read-rarely data, Zlib offers significant storage savings worth the CPU tradeoff.
