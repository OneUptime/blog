# Validation Summary: How to Migrate from CSFLE to Queryable Encryption in MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- MongoDB Queryable Encryption (QE)
- MongoDB Node.js Driver (`ClientEncryption`, `createDataKey`, `createCollection`)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB CSFLE Overview: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB CSFLE Encryption Algorithms: https://www.mongodb.com/docs/manual/core/csfle/fundamentals/encryption-algorithms/
- MongoDB Queryable Encryption docs (v7.0): https://www.mongodb.com/docs/v7.0/core/queryable-encryption/
- MongoDB Queryable Encryption Compatibility: https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/compatibility/
- MongoDB Queryable Encryption Features: https://www.mongodb.com/docs/manual/core/queryable-encryption/features/
- MongoDB Encrypted Fields and Enabled Queries: https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- MongoDB Create an Encrypted Collection: https://www.mongodb.com/docs/manual/core/queryable-encryption/qe-create-encrypted-collection/
- MongoDB Node.js Driver ClientEncryption API: https://mongodb.github.io/node-mongodb-native/6.7/classes/ClientEncryption.html
- MongoDB 8.0 Announcement (range query GA): https://www.mongodb.com/press/mongo-db-announces-general-availability-of-mongo-db-8-0
- MongoDB legacy mongo shell deprecation: https://www.mongodb.com/docs/v7.0/reference/mongo/

## Issues Found

1. **Algorithm description "Structured (AEAD-based)" was misleading.** Both CSFLE and QE use AEAD (AES-256-CBC) as the underlying cryptographic primitive, so labeling QE as "AEAD-based" does not distinguish it from CSFLE. MongoDB's official documentation calls it "Structured Encryption." Changed to "Structured Encryption" in the comparison table.

2. **Range query support not qualified by version.** The table listed QE query support as "Equality + Range" while stating a minimum version of 7.0+. However, range queries only became GA in MongoDB 8.0. Equality queries were GA in 7.0. Changed to "Equality (7.0+) + Range (8.0+)" to avoid implying range queries work on 7.0.

3. **`queries` field format was incorrect.** The `encryptedFields` specification used `queries: [{ queryType: "equality" }]` (an array), but MongoDB documentation shows `queries` as a plain object: `queries: { queryType: "equality" }`. Fixed to match the official API.

4. **Used deprecated `mongo` shell instead of `mongosh`.** The legacy `mongo` shell was deprecated in MongoDB 5.0 and removed in MongoDB 6.0. Since this post targets MongoDB 7.0+, the correct shell is `mongosh`. Changed `mongo` to `mongosh` in the monitoring command.

## Review Notes
- Renaming a QE-enabled collection with `rename()` does not automatically rename the associated internal metadata collections (`enxcol_.<collectionName>.esc`, `.ecc`, `.ecoc`). In production, this could cause the QE collection to lose its encrypted metadata. Users should be aware of this limitation, though the post's simplified example is acceptable for a tutorial context.
- The backfill script uses a simple `for await` loop. For large production collections, cursor-based pagination with batch processing and resumability would be more robust, but the approach shown is correct as a conceptual demonstration.
- QE requires a replica set or sharded cluster (not a standalone instance), which is not mentioned in the post but is an important deployment prerequisite.
