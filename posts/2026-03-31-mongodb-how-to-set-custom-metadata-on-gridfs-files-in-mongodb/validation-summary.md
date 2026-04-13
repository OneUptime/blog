# Validation Summary: How to Set Custom Metadata on GridFS Files in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB GridFS
- MongoDB Node.js Driver (`mongodb` npm package)
- mongosh (MongoDB Shell)
- MongoDB Aggregation Framework
- MongoDB TTL Indexes

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/gridfs/
- GridFSBucket API reference: https://mongodb.github.io/node-mongodb-native/
- GridFS specification: https://github.com/mongodb/specifications/blob/master/source/gridfs/gridfs-spec.md
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found
1. **Missing `ObjectId` import in Step 4**: The `updateFileStatus` and `addTag` functions used `new ObjectId(fileId)` without importing `ObjectId` from the `mongodb` package. This would cause a `ReferenceError` at runtime. Fixed by adding `const { MongoClient, ObjectId } = require('mongodb');` at the top of the Step 4 code block.

## Review Notes
- The `contentType` option passed to `openUploadStream` in Step 1 is deprecated in the GridFS specification (since 2015) and in the Node.js driver (since v4.0). It still functions but the recommended approach is to store content type inside the `metadata` object instead. This is not a breaking issue but may warrant updating in a future revision.
- The combined use of a TTL index on `metadata.expiresAt` (Step 2) alongside manual cleanup via `bucket.delete()` (Step 6) has a subtle race condition: if the TTL background task deletes a file document before the manual cleanup runs, the corresponding chunks in `documents.chunks` become orphaned. The post does warn about this, but readers should be aware that relying solely on `bucket.delete()` (without the TTL index) is the safer approach for complete GridFS file cleanup.
- The mongosh dot notation `db.documents.files` used in Step 2 works correctly because mongosh's proxy treats unknown property access on a Collection as a subcollection reference (resolving to `documents.files`). The bracket notation `db['documents.files']` used in Step 5 is an equally valid alternative.
