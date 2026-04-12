# Validation Summary: How to Use Compression with WiredTiger in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger block compression (snappy, zlib, zstd)
- WiredTiger index prefix compression
- MongoDB network/wire protocol compression
- mongod.conf YAML configuration
- mongoexport / mongoimport CLI tools
- mongosh shell

## Sources Consulted
- MongoDB Manual: compact command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: Configuration File Options (net.compression.compressors) — https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: compact command (v7.0 and v7.3) — https://www.mongodb.com/docs/v7.0/reference/command/compact/ and https://www.mongodb.com/docs/v7.3/reference/command/compact/
- MongoDB Community Forums: "Enable Block Compression on existing data, Possible?" — https://www.mongodb.com/community/forums/t/enable-block-compression-on-existing-data-possible/124932
- MongoDB Community Forums: "Mongo Update compressor for an existing collection" — https://www.mongodb.com/community/forums/t/mongo-update-compressor-for-an-existing-collection/174628
- MongoDB source code: compact.cpp on GitHub

## Issues Found

### 1. Incorrect claim that `compact` changes the block compressor (major)
**What was wrong:** The "Re-Compressing Existing Collections" section stated that you could change compression on an existing collection by updating the `blockCompressor` in `mongod.conf` and then running `db.runCommand({ compact: "orders" })`. This is incorrect — the `compact` command only defragments and reclaims disk space. It does not change the compressor of an existing collection. Changing `blockCompressor` in `mongod.conf` only affects newly created collections; existing collections retain the compressor they were created with.

**What was changed:** Rewrote the section to clarify that `compact` only defragments and does not change the compressor. Added a correct approach for changing compression on an existing collection: create a new collection with the desired compressor, copy the data, drop the old collection, and rename. Kept the existing rolling replica set procedure as an alternative.

### 2. Incorrect summary reference to `compact` for recompression (minor)
**What was wrong:** The Summary section stated "To recompress existing collections, use `compact` or a rolling dump-and-reload procedure." This reinforced the incorrect claim about `compact`.

**What was changed:** Updated to "To recompress existing collections, recreate them with the desired compressor or use a rolling initial sync procedure on replica set members."

## Review Notes
- `db.collection.stats()` was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The method still works in current versions, but future posts may want to use the aggregation approach instead.
- The compression ratio figures in the table (~2:1 for snappy, ~3:1 for zlib, ~3.5:1 for zstd) are reasonable ballpark estimates but actual ratios vary significantly depending on data characteristics.
- The rolling re-compression procedure for replica sets describes an export/import approach. An alternative (and often simpler) approach is to change the compressor in mongod.conf, delete the secondary's data directory, and let it perform an initial sync — which will create all collections using the new default compressor from the local config.
- The `net.compression.compressors` comma-separated string format (`zstd,snappy,zlib`) is confirmed correct per MongoDB documentation (the field type is `string`).
