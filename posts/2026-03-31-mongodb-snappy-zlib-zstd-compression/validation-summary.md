# Validation Summary: How to Choose Between Snappy, Zlib, and Zstd Compression in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Snappy compression
- Zlib compression
- Zstd (Zstandard) compression
- mongod.conf configuration

## Sources Consulted
- MongoDB Manual: WiredTiger Compression — https://www.mongodb.com/docs/manual/core/wiredtiger/#compression
- MongoDB Manual: Configuration Options (storage.wiredTiger) — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.collectionConfig.blockCompressor
- MongoDB Manual: compact command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB 4.2 Release Notes (Zstd support) — https://www.mongodb.com/docs/manual/release-notes/4.2/

## Issues Found
1. **Zstd compression ratio exaggerated in table**: The table listed Zstd as "Very High (4-8x)" while Zlib was "High (3-5x)". This contradicted the body text which correctly states "Zstd provides compression ratios close to Zlib at speeds close to Snappy." Zstd's advantage over Zlib is primarily speed, not dramatically better compression ratios. Fixed Zstd row to "High (3-5x)" to be consistent with the text and real-world behavior.

2. **Compact recompression section misleading**: The original text implied that simply running `db.runCommand({ compact: "logs", comment: "recompress with zstd" })` would change the compression algorithm. In reality, `compact` rewrites data using the currently configured compressor — you must first update `blockCompressor` in `mongod.conf` and restart MongoDB before running compact. Fixed the text to describe the full process and removed the misleading `comment` field from the command.

## Review Notes
- The post does not mention that time-series collections default to zstd (not snappy) starting in MongoDB 5.2. This is a minor omission given the post's scope.
- Snappy speed claim of "300-500 MB/s" is a reasonable ballpark; actual throughput varies by hardware and data characteristics.
- All mongod.conf YAML paths, `db.createCollection()` syntax, `db.getCollectionInfos()` usage, and `collStats` command syntax are correct.
- The workload recommendations are sound and align with MongoDB best practices.
