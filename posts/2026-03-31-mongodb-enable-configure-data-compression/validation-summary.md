# Validation Summary: How to Enable and Configure Data Compression in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger block compression (snappy, zlib, zstd, none)
- WiredTiger index prefix compression
- WiredTiger journal compression
- mongod.conf configuration
- MongoDB Shell (mongosh) commands

## Sources Consulted
- MongoDB Manual: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: storage.wiredTiger configuration options — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger-options
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: collStats — https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB Manual: $merge aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB Manual: db.getCollectionInfos() — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/

## Issues Found
- **Misleading compressor recommendation in table**: The "Choosing the Right Compressor" table listed "Legacy / low CPU" as the workload type for zlib. This is misleading because zlib is actually more CPU-intensive than both snappy and zstd. The label "low CPU" incorrectly suggests zlib is suitable for CPU-constrained environments. Changed to "Legacy (pre-4.2)" to clarify that zlib is the recommended choice only when zstd is unavailable (MongoDB versions before 4.2).

## Review Notes
- `db.collection.stats()` wraps the `collStats` command, which was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The method still works in current versions but may be worth updating in the future.
- The `$match: {}` stage in the recompression aggregation pipeline is unnecessary (it matches all documents), but it is harmless and does not affect correctness.
- The claim that index prefix compression has "no query performance impact" is a slight simplification — there is negligible decompression overhead — but it is accurate enough for a practical guide.
