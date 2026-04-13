# Validation Summary: How to Implement Optimistic Concurrency Control in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document database, update operators: `$set`, `$inc`, query filters)
- Node.js MongoDB Driver (`db.collection()`, `findOne`, `updateOne`, `findOneAndUpdate`)
- Express.js (REST API with ETags and `If-Match` headers)
- JavaScript (async/await, Fetch API)
- HTTP (ETag/If-Match concurrency headers, status codes 409/428)
- MongoDB multi-document transactions (`startSession`, `withTransaction`)

## Sources Consulted
- MongoDB documentation on update operators (`$set`, `$inc`): https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB documentation on `updateOne`: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB documentation on `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/
- RFC 7232 (HTTP Conditional Requests — ETag / If-Match): https://datatracker.ietf.org/doc/html/rfc7232
- RFC 6585 (428 Precondition Required): https://datatracker.ietf.org/doc/html/rfc6585

## Issues Found
1. **Bug in `updateWithOCC` function — conflicting update operators on `_id` and `__v`**: The `updateFn` callback (e.g., `(doc) => ({ ...doc, balance: doc.balance + 50 })`) returns a full document including `_id` and `__v` fields. When this object is spread into `$set`, it causes two errors:
   - `__v` appears in both `$set` and `$inc`, which makes MongoDB throw: *"Updating the path '__v' would create a conflict at '__v'"*
   - `_id` in `$set` makes MongoDB throw: *"Performing an update on the path '_id' would modify the immutable field '_id'"*
   
   **Fix applied**: Added destructuring `const { _id, __v, ...changes } = updatedDoc` before the update call, and used `...changes` instead of `...updatedDoc` in the `$set` operator. This strips out immutable and conflicting fields before passing to the update.

## Review Notes
- The ETag REST API example spreads `req.body` directly into `$set` without stripping `_id` or `__v`. In a production setting this would need input validation/sanitization, but since the blog focuses on the OCC pattern and not input validation, this is acceptable as-is.
- The `modifiedCount === 0` check in the PUT endpoint returns 409 for both "document not found" and "version mismatch" scenarios. A production implementation might want to distinguish these cases, but this is a design choice rather than a technical error.
- The timestamp-based OCC approach has a known limitation: if two updates happen within the same millisecond, the timestamp comparison could miss a conflict. The post doesn't mention this caveat but it's a minor omission for a tutorial-level article.
- The `findOneAndUpdate` return value behavior (`null` when no match) is correct for MongoDB Node.js Driver v6+. Older driver versions returned `{ value: null }` instead.
