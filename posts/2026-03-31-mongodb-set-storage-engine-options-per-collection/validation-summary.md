# Validation Summary: How to Set Storage Engine Options Per Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- WiredTiger storage engine
- `db.createCollection()` API
- WiredTiger block compression (snappy, zlib, zstd, none)
- WiredTiger prefix compression for indexes
- WiredTiger page sizing options (leaf_page_max, internal_page_max)

## Sources Consulted
- MongoDB documentation on `db.createCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB documentation on WiredTiger storage engine options: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/#std-label-create-collection-storage-engine-options
- MongoDB documentation on WiredTiger compression: https://www.mongodb.com/docs/manual/reference/glossary/#std-term-WiredTiger
- MongoDB documentation on `indexOptionDefaults`: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/#mongodb-option-db.createCollection.indexOptionDefaults
- MongoDB documentation on `db.getCollectionInfos()`: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/
- WiredTiger documentation on WT_SESSION::create configuration strings

## Issues Found
1. **Description mentioned "cache settings" — replaced with "page sizing"**: The post description claimed it covered "cache settings," but the post does not cover WiredTiger cache configuration (which is a server-level setting via `cacheSizeGB`, not a per-collection option). The post actually covers page sizing options (`leaf_page_max`, `internal_page_max`), so the description was updated to say "page sizing" instead.

2. **Prefix compression default scope was inaccurate**: The post stated prefix compression "is enabled by default for most string indexes." In WiredTiger, prefix compression is enabled by default for **all** indexes, not just string indexes. Changed "most string indexes" to "all indexes."

## Review Notes
- All code examples use correct syntax for `db.createCollection()` with `storageEngine.wiredTiger.configString`.
- The four block compressor values (none, snappy, zlib, zstd) are all valid WiredTiger options, and the note that zstd requires MongoDB 4.2+ is accurate.
- The `indexOptionDefaults` usage is correct per the MongoDB API.
- The comma-separated WiredTiger config string syntax is correct.
- `db.getCollectionInfos()` is the correct method to verify applied storage engine options.
- The guidance in "When to Customize" is reasonable and aligns with general best practices.
