# Validation Summary: How to Reduce Storage Costs with Compression in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Atlas
- WiredTiger block compression (snappy, zstd)
- Python (zlib, base64, pymongo)
- mongod.conf configuration
- mongodump / mongorestore

## Sources Consulted
- MongoDB `compact` command documentation: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB `$indexStats` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB `collStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/collstats/
- MongoDB `db.collection.stats()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB WiredTiger storage engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Community Forum discussion on changing block compression for existing collections: https://www.mongodb.com/community/forums/t/enable-block-compression-on-existing-data-possible/124932

## Issues Found

### 1. `compact` command incorrectly presented as a method to change compression (Step 3)
**What was wrong:** The post listed `compact` as "Method 2" for migrating existing collections to a new block compressor (e.g., from snappy to zstd). In reality, the `compact` command only defragments and reclaims disk space -- it does NOT change the collection's block compressor. Compression settings are baked into the collection at creation time, and `compact` reuses the original compressor.

**What was changed:** Replaced Method 2 (compact) with `mongodump`/`mongorestore` as the alternative migration approach. Added a clarifying note that `compact` does not change the block compressor. Updated the Summary section to remove the `compact` reference for migration.

### 2. `compact` "requires exclusive access" claim is outdated (Step 3)
**What was wrong:** The post stated the `compact` command "requires exclusive access." Since MongoDB 4.4+, `compact` no longer blocks CRUD operations -- it only blocks metadata operations (dropping collections/indexes, creating indexes). This claim is outdated for any modern MongoDB deployment.

**What was changed:** Removed the "requires exclusive access" claim as part of the rewrite of the compact description.

### 3. Misleading variable name `opsPerDay` in $indexStats code (Step 6)
**What was wrong:** The variable `opsPerDay` was assigned `idx.accesses.ops`, but `$indexStats.accesses.ops` returns the total number of operations since mongod startup or index creation -- not a per-day rate. The variable name would mislead readers about what the field represents.

**What was changed:** Renamed `opsPerDay` to `totalOps` to accurately reflect that the value is a cumulative total since the last counter reset.

## Review Notes
- `db.collection.stats()` and the underlying `collStats` command are deprecated since MongoDB 6.2 in favor of the `$collStats` aggregation stage. The code still works in current versions, but future MongoDB releases may remove it. This is not an error in the post but worth noting for future updates.
- The application-level compression example (Step 5) stores compressed data as base64-encoded strings. Using BSON `Binary` type instead would avoid the ~33% size overhead of base64 encoding, but the approach as written is not incorrect.
- The `pymongo` import in Step 5 is unused in the code snippet (the insert uses `db.posts.insert_one()` without showing the client/database setup). This is common in blog snippets and not a significant issue.
- Atlas storage pricing ($0.25/GB/month) is noted as approximate, which is appropriate since it varies by region and tier.
