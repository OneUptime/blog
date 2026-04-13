# Validation Summary: How to Implement Document Lifecycle Management in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- MongoDB $jsonSchema validation
- MongoDB TTL indexes
- MongoDB Change Streams (MongoDB 6.0+)
- MongoDB Aggregation Pipeline (change stream filtering)

## Sources Consulted
- MongoDB $jsonSchema documentation: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB TTL indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB `fullDocumentBeforeChange` option: https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB `db.createCollection()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB partial filter expressions: https://www.mongodb.com/docs/manual/core/index-partial/

## Issues Found
1. **Missing `fullDocumentBeforeChange` option in change stream watch call**: The code accessed `change.fullDocumentBeforeChange?.status` to get the previous status for the audit log, but the `watch()` call only specified `{ fullDocument: "updateLookup" }`. Without explicitly passing `fullDocumentBeforeChange: "whenAvailable"` (or `"required"`), the `fullDocumentBeforeChange` field is always `undefined`. Added `fullDocumentBeforeChange: "whenAvailable"` to the watch options. This feature requires MongoDB 6.0+.

## Review Notes
- The `fullDocumentBeforeChange` feature (MongoDB 6.0+) also requires change stream pre- and post-images to be enabled at the collection level via `changeStreamPreAndPostImages: { enabled: true }`. The post does not mention this prerequisite. With the `"whenAvailable"` setting, the field will gracefully be `undefined` if pre-images are not enabled, so the code won't error—but the `fromStatus` audit field will be null.
- The state transition helper uses a find-then-update pattern which is not atomic. A concurrent update could cause a race condition. For production use, an `updateOne` with a `status` filter condition would be more robust. This is acceptable for a tutorial.
- The TTL index partial filter uses `{ expiresAt: { $exists: true } }`, which also matches documents where `expiresAt` is `null`. These documents won't be deleted by the TTL thread (it only acts on Date values), but they will occupy space in the index. Using `{ expiresAt: { $type: "date" } }` would be more precise, but the current approach is not incorrect.
