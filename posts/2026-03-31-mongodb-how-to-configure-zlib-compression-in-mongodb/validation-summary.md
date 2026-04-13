# Validation Summary: How to Configure Zlib Compression in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Zlib compression
- mongod configuration (YAML and CLI)
- mongodump / mongorestore

## Sources Consulted
- MongoDB Manual: storage.wiredTiger configuration options — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.collectionConfig.blockCompressor
- MongoDB Manual: db.createCollection() storageEngine options — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: mongod CLI options — https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Manual: mongodump and mongorestore — https://www.mongodb.com/docs/database-tools/mongodump/ and https://www.mongodb.com/docs/database-tools/mongorestore/
- WiredTiger documentation: WT_SESSION::create configuration — https://source.wiredtiger.com/develop/struct_w_t___s_e_s_s_i_o_n.html

## Issues Found

1. **Fabricated `block_compressor_level` configuration option**: The "Zlib Compression Levels" section claimed WiredTiger supports a `block_compressor_level` parameter in the configString (e.g., `block_compressor=zlib,block_compressor_level=9`). This parameter does not exist in WiredTiger's configuration API. WiredTiger uses zlib's default compression level (level 6) internally and does not expose a way to change it. Fixed by removing the false parameter and clarifying that the compression level is not configurable through MongoDB/WiredTiger.

2. **Missing `--db` flag in mongodump/mongorestore commands**: The `mongodump --collection=mylogs` and `mongorestore --collection=mylogs` commands were missing the required `--db` flag. When `--collection` is specified, `--db` is mandatory for both tools. Added `--db=mydb` to both commands.

## Review Notes
- `db.collection.stats()` is used in the verification examples. While this still works, MongoDB 6.0+ recommends using `$collStats` aggregation stage instead. This is not an error but worth noting for future updates.
- The post correctly notes that WiredTiger is the storage engine but does not mention that it has been the only supported storage engine since MongoDB 4.2. Specifying `--storageEngine wiredTiger` in the CLI example is not wrong but is redundant for modern MongoDB versions.
- The 20-40% compression improvement claim over Snappy is a reasonable general estimate consistent with MongoDB documentation, though actual results vary significantly by workload.
