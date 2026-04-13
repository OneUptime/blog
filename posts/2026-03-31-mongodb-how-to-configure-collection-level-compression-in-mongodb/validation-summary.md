# Validation Summary: How to Configure Collection-Level Compression in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB WiredTiger storage engine
- WiredTiger block compressors (snappy, zlib, zstd)
- WiredTiger index prefix compression
- MongoDB time series collections
- mongod.conf configuration

## Sources Consulted
- MongoDB documentation: WiredTiger storage engine compression (https://www.mongodb.com/docs/manual/core/wiredtiger/#compression)
- MongoDB documentation: `db.createCollection()` storageEngine options (https://www.mongodb.com/docs/manual/reference/method/db.createCollection/)
- MongoDB documentation: `storage.wiredTiger` configuration file options (https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.collectionConfig.blockCompressor)
- MongoDB documentation: `db.serverStatus()` output fields (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB documentation: `$merge` aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/)
- MongoDB documentation: Time series collections (https://www.mongodb.com/docs/manual/core/timeseries-collections/)

## Issues Found

1. **`db.serverStatus().cpu` does not exist**: The "Compression and CPU Tradeoff" section referenced `db.serverStatus().cpu` to monitor CPU usage. MongoDB's `serverStatus` command does not include a top-level `cpu` field — this call would return `undefined`. Removed the incorrect line and replaced with a comment recommending OS-level tools (`top`, `htop`, `mongostat`) for CPU monitoring.

2. **`block_manager` should be `block-manager`**: The WiredTiger section of `serverStatus` uses hyphenated keys, not underscored. `db.serverStatus().wiredTiger.block_manager` would return `undefined`. Fixed to use bracket notation: `db.serverStatus().wiredTiger["block-manager"]`.

## Review Notes
- `db.collection.stats()` works but has been superseded by the `$collStats` aggregation stage in MongoDB 5.0+. The method still functions, so this is not an error, but future updates to the post could mention the newer approach.
- The compression ratios in the table (~2:1 for snappy, ~3:1 for zlib/zstd) are reasonable approximations but are highly data-dependent. The post correctly uses the "~" prefix to indicate these are approximate.
- The `$merge`-based approach for changing compression on existing collections is correct but does not preserve the `_id` index settings or other collection options (e.g., validators, collation). The post's comment to "recreate indexes" covers this partially.
