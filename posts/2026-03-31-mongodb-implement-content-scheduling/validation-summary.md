# Validation Summary: How to Implement Content Scheduling with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose ODM
- Node.js
- JavaScript (ES6+ async/await)

## Sources Consulted
- Mongoose documentation for schema definitions, `findByIdAndUpdate`, `updateMany`, and index options: https://mongoosejs.com/docs/guide.html
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `updateMany` documentation (atomicity behavior): https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB `$unset` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/unset/

## Issues Found

1. **Missing TTL index on `expiresAt` field**: The introduction mentions "TTL indexes for automatic expiry" and the schema defines an `expiresAt` field, but no TTL index was created. Without `expireAfterSeconds` on the index, MongoDB will not automatically delete expired documents. Fixed by changing the `expiresAt` field definition to include `index: { expireAfterSeconds: 0 }`, which tells MongoDB to delete documents when the date in `expiresAt` has passed.

2. **Incorrect atomicity claim in summary**: The summary stated that `updateMany` handles "multiple content items in a single atomic update." This is incorrect — MongoDB's `updateMany` updates each matched document atomically, but the overall operation across all matched documents is not atomic. If the process crashes mid-operation, some documents may be updated while others are not. Fixed the wording to accurately describe the per-document atomicity behavior.

## Review Notes
- The `expiresAt` field with the TTL index is defined in the schema but never set in any of the code examples. A future improvement could show how to set `expiresAt` when creating temporary/promotional content so readers see the full TTL lifecycle in action.
- The scheduler uses `setInterval` which is simple but not robust for production — if the Node.js process restarts, scheduled jobs may be missed until the next interval. The post could mention production-grade alternatives like `node-cron` or a dedicated job queue, but this is a style/scope choice rather than a technical error.
- The `getPublishedContent` query includes an `$or` clause checking `unpublishAt` even though the scheduler `$unset`s `unpublishAt` after unpublishing. This is actually correct defensive coding since `{ unpublishAt: null }` in MongoDB also matches documents where the field does not exist.
