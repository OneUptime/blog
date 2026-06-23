# Validation Summary: How to Fix 'E11000 duplicate key error' in MongoDB

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- MongoDB
- MongoDB indexes, including unique, compound, partial, and sparse indexes
- MongoDB update and upsert operations
- MongoDB Node.js driver
- Mongoose
- JavaScript

## Sources Consulted
- MongoDB Manual: Unique Indexes - https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Sparse Indexes - https://www.mongodb.com/docs/manual/core/index-sparse/
- MongoDB Manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: $setOnInsert - https://www.mongodb.com/docs/manual/reference/operator/update/setoninsert/
- MongoDB Node.js Driver Docs: Compound Operations and findOneAndUpdate metadata - https://www.mongodb.com/docs/drivers/node/current/crud/compound-operations/
- MongoDB Blog: Changes to the findOneAnd* APIs in Node.js Driver 6.0.0 - https://www.mongodb.com/company/blog/product-release-announcements/behavioral-changes-find-one-family-apis-node-js-driver-6-0-0
- Mongoose Docs: Middleware and duplicate key error handling middleware - https://mongoosejs.com/docs/middleware.html

## Issues Found
- The partial index example used `partialFilterExpression: { username: { $exists: true, $ne: null } }`. MongoDB's documented partial index filter operators do not include `$ne`, so this was changed to `partialFilterExpression: { username: { $type: "string" } }`, which correctly indexes present string usernames and excludes missing or null values.
- The upsert guidance said upsert prevents duplicates naturally. Upserts only prevent this pattern reliably when the lookup filter is backed by the same unique key, so the wording was updated to make that requirement explicit.
- The race-condition section recommended `findOneAndUpdate` with upsert without stating the unique-index requirement. The text was updated to specify using a unique index on the lookup field.
- The sparse index section described sparse indexes as a legacy approach for older MongoDB versions. Sparse indexes are still supported, and the important technical caveat is that they skip missing fields but still index explicit `null` values. The heading and explanation were updated accordingly.

## Review Notes
The remaining MongoDB shell examples, Node.js driver `includeResultMetadata` usage, `$setOnInsert` usage, unique index behavior for missing fields, and Mongoose post-save duplicate key error middleware were consistent with current official documentation. Sparse unique indexes remain useful for missing optional fields, but partial unique indexes are generally more precise when filtering by type or other conditions.
