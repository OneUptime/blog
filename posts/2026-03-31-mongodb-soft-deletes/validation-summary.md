# Validation Summary: How to Implement Soft Deletes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document database)
- MongoDB Node.js Driver (v5+/v6+)
- Partial indexes and sparse indexes
- Multi-document transactions (sessions)

## Sources Consulted
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Node.js Driver API: Db, Collection, ClientSession — https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: BSON Comparison Order — https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/

## Issues Found
1. **Sparse index comment was incorrect.** The original code had:
   ```javascript
   db.users.createIndex(
     { deletedAt: 1 },
     { sparse: true }  // only index documents where deletedAt exists and is non-null
   );
   ```
   The comment claimed sparse indexes exclude documents with null values. This is wrong — MongoDB sparse indexes include documents where the indexed field exists **even if its value is null**. They only skip documents where the field is entirely absent. Since this schema explicitly sets `deletedAt: null` on all active documents, every document has the field, so `sparse: true` provides no filtering benefit and indexes all documents identically to a regular index. Removed `sparse: true` and corrected the comment to accurately describe the index purpose.

## Review Notes
- The cascade soft-delete example uses `session.withTransaction()`, which requires a MongoDB replica set. This is standard for production deployments but readers running a standalone `mongod` for local development would need to convert to a replica set first. The blog does not mention this requirement.
- The `partialFilterExpression: { deletedAt: null }` pattern for the unique index on email is a commonly used approach. Readers using older MongoDB versions (pre-5.0) should verify this works in their environment, as support for null equality in partial filter expressions may vary.
- The code uses `new ObjectId(id)` which works but the driver v6+ also offers `ObjectId.createFromHexString(id)` as a more explicit alternative. Both are valid.
- No `await client.connect()` is shown before database operations. MongoDB Node.js driver v4.2+ supports auto-connect, so this is acceptable, though explicit connect is recommended in production code.
