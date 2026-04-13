# Validation Summary: How to Implement Document Soft Delete and Recovery in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands, indexes, TTL indexes, partial indexes)
- Mongoose ODM (Node.js schema plugin pattern)

## Sources Consulted
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: $unset operator — https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- MongoDB Manual: $exists operator — https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- Mongoose documentation: Plugins — https://mongoosejs.com/docs/plugins.html
- Mongoose documentation: Middleware — https://mongoosejs.com/docs/middleware.html

## Issues Found
1. **Invalid `$exists: false` in `partialFilterExpression`**: The partial index example used `partialFilterExpression: { deletedAt: { $exists: false } }`. MongoDB's partial indexes only support `$exists: true`, not `$exists: false`. Attempting to create this index would throw an error. Changed to `partialFilterExpression: { deletedAt: null }`, which is a valid equality expression matching documents where `deletedAt` is `null` or the field does not exist. Updated the description text to clarify the matching behavior.

## Review Notes
- The post uses two different conventions for representing active (non-deleted) documents: the raw MongoDB examples remove `deletedAt` entirely via `$unset`, while the Mongoose plugin sets `deletedAt` to `null`. Both approaches are valid, and the corrected partial index (`{ deletedAt: null }`) works with either convention since MongoDB's `{ field: null }` matches both null values and missing fields. However, authors may want to pick one convention and use it consistently in a future revision.
- The TTL index on `deletedAt` correctly coexists with the partial index on `email` since they are separate indexes. The TTL monitor only expires documents where the indexed field contains a Date value, so active documents (with `deletedAt` as `null` or missing) are unaffected.
- The `expireAfterSeconds: 2592000` value correctly equals 30 days (30 × 24 × 60 × 60 = 2,592,000).
- All MongoDB shell commands (`updateOne`, `updateMany`, `find`, `createIndex`) use correct syntax. The `$unset` values of `""` are valid — MongoDB ignores the value and only uses the field names.
- The Mongoose plugin correctly uses `schema.pre("find")` and `schema.pre("findOne")` query middleware with `this.where()` to automatically filter soft-deleted documents.
