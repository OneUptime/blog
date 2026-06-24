# How to Set Storage Engine Options Per Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Storage Engine, Collection, Configuration

Description: Learn how to set WiredTiger storage engine options per collection in MongoDB including block compression, prefix compression, and cache settings.

---

## Introduction

MongoDB's WiredTiger storage engine supports per-collection configuration options for block compression, prefix compression on indexes, and internal page sizing. Setting these at the collection level lets you tune storage and performance independently for collections with different access patterns.

## Setting Storage Engine Options at Collection Creation

Pass storage engine options via the `storageEngine` parameter in `db.createCollection()`:

```javascript
db.createCollection("media_files", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
})
```

The `configString` field accepts a WiredTiger configuration string with key-value pairs.

## Compression Options

WiredTiger supports several block compression algorithms:

```javascript
// No compression - fastest read/write, largest storage footprint
db.createCollection("hot_cache_data", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=none" }
  }
})

// Snappy compression - default in MongoDB, good balance of speed and size
db.createCollection("application_events", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=snappy" }
  }
})

// zlib compression - better compression ratio, more CPU
db.createCollection("archive_data", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zlib" }
  }
})

// zstd compression - best ratio with better speed than zlib (MongoDB 4.2+)
db.createCollection("large_documents", {
  storageEngine: {
    wiredTiger: { configString: "block_compressor=zstd" }
  }
})
```

## Index Prefix Compression

Prefix compression reduces index size by storing only the difference between adjacent index keys. It is enabled by default for all indexes but can be configured explicitly:

```javascript
db.createCollection("user_profiles", {
  indexOptionDefaults: {
    storageEngine: {
      wiredTiger: {
        configString: "prefix_compression=true"
      }
    }
  }
})
```

`indexOptionDefaults` applies the storage engine settings to all indexes created on this collection unless overridden at index creation time.

## Combining Multiple Options

Multiple WiredTiger options can be combined in a single `configString` separated by commas:

```javascript
db.createCollection("logs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd,leaf_page_max=32KB,internal_page_max=4KB"
    }
  },
  indexOptionDefaults: {
    storageEngine: {
      wiredTiger: {
        configString: "prefix_compression=true,block_compressor=zstd"
      }
    }
  }
})
```

- `leaf_page_max`: maximum size of leaf pages (where document data lives)
- `internal_page_max`: maximum size of internal B-tree pages

Larger `leaf_page_max` values benefit sequential read workloads; smaller values benefit random access.

## Verifying Collection Storage Options

Check the storage engine configuration applied to a collection:

```javascript
db.getCollectionInfos({ name: "logs" })
```

The output includes `options.storageEngine` with the applied configuration.

## When to Customize Per-Collection Storage Options

- Use `block_compressor=none` for collections that are read and rewritten frequently where CPU is the bottleneck.
- Use `block_compressor=zstd` for archive or audit collections where storage cost matters more than write latency.
- Use larger `leaf_page_max` for collections with large documents that are accessed sequentially (e.g., time series data).
- Use `prefix_compression=true` on indexes over long string fields to reduce index storage.

## Summary

MongoDB's WiredTiger storage engine supports per-collection configuration via the `storageEngine.wiredTiger.configString` option in `db.createCollection()`. The most commonly tuned options are `block_compressor` (snappy, zlib, zstd, none) and prefix compression for indexes. Choose compression based on your read/write patterns: no compression for the hottest data, zstd for archives. Use `db.getCollectionInfos()` to verify applied settings.
