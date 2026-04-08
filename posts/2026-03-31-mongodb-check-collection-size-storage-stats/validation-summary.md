# Validation Summary: How to Check Collection Size and Storage Stats in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell helpers, collStats command, db.stats())
- WiredTiger storage engine (compression)

## Sources Consulted
- https://www.mongodb.com/docs/manual/reference/command/collStats/ — collStats command reference (notes deprecation in 6.2)
- https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/ — db.collection.stats() shell method
- https://www.mongodb.com/docs/manual/reference/method/db.collection.dataSize/ — dataSize() method
- https://www.mongodb.com/docs/manual/reference/method/db.collection.storageSize/ — storageSize() method
- https://www.mongodb.com/docs/manual/reference/method/db.collection.totalSize/ — totalSize() method
- https://www.mongodb.com/docs/manual/reference/method/db.stats/ — db.stats() method
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/ — $collStats aggregation stage (recommended replacement)

## Issues Found
1. **Snappy compression ratio overstated**: The post claimed "A ratio of 3-5x is typical for snappy compression on JSON-like data." Snappy is designed for speed over compression ratio, and typical ratios are 1.5-2.5x. A 3-5x ratio is more characteristic of zlib or zstd compression. Fixed the claim to state 1.5-2.5x for Snappy and noted that higher ratios are possible with zlib/zstd.
2. **Missing collStats deprecation notice**: The `collStats` command has been deprecated since MongoDB 6.2. Added a note recommending the `$collStats` aggregation stage as the modern alternative for users on MongoDB 6.2+.

## Review Notes
- All shell helper methods (`dataSize()`, `storageSize()`, `totalSize()`, `countDocuments()`, `stats()`) are confirmed valid and not deprecated.
- The `db.stats()` output fields are accurate.
- The `db.collection.stats(scale)` usage with a numeric scale factor is correct.
- Code examples are syntactically correct and use valid mongosh JavaScript syntax.
- The description mentions "aggregation pipeline" but the post does not actually demonstrate the `$collStats` aggregation stage — this is a minor mismatch but not a technical error in the content itself.
