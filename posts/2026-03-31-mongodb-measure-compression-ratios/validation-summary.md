# Validation Summary: How to Measure Compression Ratios in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- WiredTiger compression algorithms: Snappy, Zlib, Zstd
- `collStats` / `db.collection.stats()` API
- `serverStatus` admin command

## Sources Consulted
- MongoDB official documentation: `db.collection.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation: `collStats` command — https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB official documentation: `db.createCollection()` storage engine options — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: WiredTiger block compressor options — https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--wiredTigerCollectionBlockCompressor
- MongoDB official documentation: `serverStatus` wiredTiger cache stats — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger
- MongoDB official documentation: Zstd compression support (added in 4.2) — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.collectionConfig.blockCompressor

## Issues Found
No technical issues found.

## Review Notes
- `db.collection.stats()` wraps the `collStats` command, which is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage (`db.collection.aggregate([{$collStats: {storageStats: {}}}])`). The method still works but readers using MongoDB 6.2+ should be aware of the deprecation.
- `storageSize` reflects WiredTiger's allocated disk space for the collection, which may include some pre-allocated but unused blocks. For small collections, this can make the compression ratio appear worse than the actual data compression. For the 50,000-document test described in the post, this effect is negligible.
- The typical compression ratio figures (Snappy ~1.8x, Zlib ~4.2x, Zstd ~4.6x) are illustrative and will vary based on document structure, field repetition, and data entropy. The post correctly frames these as "typical" rather than guaranteed.
