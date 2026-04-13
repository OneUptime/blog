# Validation Summary: How to Fix MongoError: Cannot Create Index on a Capped Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (capped collections, indexing)
- Node.js MongoDB driver
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Capped Collections (https://www.mongodb.com/docs/manual/core/capped-collections/)
- MongoDB Manual: createIndex (https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)
- MongoDB Manual: TTL Indexes (https://www.mongodb.com/docs/manual/core/index-ttl/)
- MongoDB Manual: $out Aggregation Stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/)

## Issues Found
1. **Incorrect claim: unique indexes not allowed on capped collections.** The post stated "Unique indexes are not allowed (except `_id`) - the circular overwrite mechanism makes unique enforcement unreliable." This is incorrect — MongoDB allows unique indexes on capped collections. Removed this restriction from the list.

2. **Incorrect claim: text indexes not allowed on capped collections.** The post stated "Text indexes are not allowed on capped collections." This is incorrect — text indexes are supported on capped collections. Removed this restriction from the list.

3. **Incorrect claim: geospatial indexes not allowed on capped collections.** The post stated "Geospatial indexes are not allowed on capped collections." This is incorrect — geospatial indexes (2dsphere, 2d) are supported on capped collections. Removed this restriction from the list.

4. **Summary section repeated the incorrect claims.** Updated the summary to accurately reflect that only TTL indexes are prohibited, while other index types are allowed.

## Review Notes
- Fix 3 ("Convert Capped to Regular Collection") mixes mongo shell syntax (steps 1 and 3) with Node.js driver syntax (step 2). This is a stylistic inconsistency rather than a technical error, but could be confusing to readers.
- Fix 3 does not mention dropping the original capped collection before renaming, or using the `dropTarget` option on `renameCollection`. If a collection named 'logs' already exists, the rename would fail. This is a completeness gap, not a technical error.
- The only index type explicitly prohibited on capped collections by MongoDB is TTL indexes. All other standard index types (single-field, compound, unique, text, geospatial, hashed, wildcard) are supported.
