# Validation Summary: How to Replace an Entire Document in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongosh shell API)
- MongoDB Node.js Driver
- `replaceOne`, `findOneAndReplace`, `updateOne` methods

## Sources Consulted
- MongoDB official docs: `db.collection.replaceOne()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/
- MongoDB official docs: `db.collection.findOneAndReplace()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndReplace/
- MongoDB official docs: `db.collection.updateOne()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Node.js Driver API documentation for `replaceOne` and `findOneAndReplace`

## Issues Found
1. **Incorrect claim about `_id` handling in replacement documents** (lines 59-69): The post stated that MongoDB "ignores" a different `_id` in the replacement document. This is incorrect — MongoDB throws an error (error code 16837: "The _id field cannot be changed") if the replacement document contains an `_id` value that differs from the original document. Fixed the explanatory text and code comments to accurately describe the error behavior.

## Review Notes
- The post mixes mongosh shell syntax (`db.users.replaceOne(...)`) and Node.js driver syntax (`db.collection("users").replaceOne(...)`). Both are correct in their respective contexts, and the post implicitly transitions between the two, which is common in MongoDB tutorials.
- The `returnDocument: "after"` option for `findOneAndReplace` is correct for both mongosh and the Node.js driver. The legacy `returnNewDocument: true` option (mongosh-only) is not used, which is good.
- The result object properties `matchedCount` and `modifiedCount` are correct for both mongosh and the Node.js driver.
- The upsert syntax and behavior described are accurate.
