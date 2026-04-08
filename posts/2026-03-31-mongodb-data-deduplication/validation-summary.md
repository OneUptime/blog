# Validation Summary: How to Implement Data Deduplication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Node.js `crypto` module (SHA-256 hashing)
- MongoDB Aggregation Framework (`$group`, `$match`, `$sort`, `$replaceRoot`)

## Sources Consulted
- MongoDB documentation on unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on `$group` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB documentation on `$first` accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/
- MongoDB documentation on `findOneAndUpdate` with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on `$setOnInsert`: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- Mongoose documentation on schema indexes and middleware: https://mongoosejs.com/docs/guide.html
- Node.js `crypto` module documentation: https://nodejs.org/api/crypto.html

## Issues Found
1. **Missing `$sort` before `$group` in Bulk Deduplication section**: The code claimed to "keep the first (oldest) document" but `$group` does not guarantee the order of accumulated values from `$push`. Without a preceding `$sort: { _id: 1 }`, the first element in the `ids` array is not reliably the oldest document. Added `{ $sort: { _id: 1 } }` before the `$group` stage.

2. **Missing `$sort` before `$group` in Deduplicating During an Aggregation Pipeline section**: The `$first` accumulator was used to select the earliest document, and `$min` was used for `firstSeen`, but `$first` returns the first document encountered — which is only the earliest if documents are sorted beforehand. Added `{ $sort: { createdAt: 1 } }` before the `$group` stage to ensure `$first` returns the oldest document.

## Review Notes
- The `computeFingerprint` function uses `doc.publishedAt?.toISOString()` which assumes `publishedAt` is a `Date` object. When called from the Mongoose `pre('save')` hook this works correctly, but when called with plain JavaScript objects (e.g., in `bulkInsertDeduped`), callers must ensure `publishedAt` is a `Date` instance. This is a usage assumption rather than a bug.
- The `sparse: true` option on the fingerprint unique index is correctly used — it allows multiple documents with a `null`/missing fingerprint while enforcing uniqueness on non-null values.
- All Mongoose and MongoDB APIs used (`findOneAndUpdate`, `deleteMany`, `insertMany`, `aggregate`, `$setOnInsert`, `$toLower`, `$$ROOT`) are current and non-deprecated.
