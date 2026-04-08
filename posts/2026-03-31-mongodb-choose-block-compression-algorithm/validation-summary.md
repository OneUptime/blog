# Validation Summary: How to Choose Block Compression Algorithm in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Snappy, Zlib, Zstd compression algorithms
- mongod.conf configuration
- mongosh shell

## Sources Consulted
- MongoDB documentation: storage.wiredTiger.collectionConfig.blockCompressor (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.collectionConfig.blockCompressor)
- MongoDB documentation: db.createCollection() storageEngine options (https://www.mongodb.com/docs/manual/reference/method/db.createCollection/)
- MongoDB documentation: db.collection.stats() (https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/)
- MongoDB documentation: WiredTiger compression (https://www.mongodb.com/docs/manual/core/wiredtiger/#compression)

## Issues Found
1. **Benchmarking script missing collection creation with compressor settings**: The benchmark script inserted documents into `test_snappy` and `test_zstd` collections without first creating them with the appropriate `block_compressor` setting. Both collections would have been created implicitly using the server default (snappy), making the benchmark comparison meaningless. Fixed by adding explicit `db.createCollection()` calls with the correct `configString` for each compressor before inserting data.

## Review Notes
- `db.collection.stats()` is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The method still works but may be removed in a future release. The post does not target a specific newer version, so this is acceptable but worth noting for future updates.
- The compression ratio ranges cited (Snappy 1.5-2.5x, Zlib 3-6x, Zstd 3-7x) are reasonable ballpark figures but will vary significantly depending on data characteristics. The post correctly notes this.
- The Zstd availability claim (MongoDB 4.2+) is correct.
- All `mongod.conf` YAML field names and structure are accurate.
- The per-collection `configString` syntax (`block_compressor=snappy`, `block_compressor=zlib`) is correct WiredTiger configuration.
