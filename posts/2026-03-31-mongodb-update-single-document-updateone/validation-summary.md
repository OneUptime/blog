# Validation Summary: How to Update a Single Document in MongoDB with updateOne()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell and Node.js driver)
- `updateOne()` method
- Update operators: `$set`, `$inc`
- Upsert option
- Dot notation for nested fields

## Sources Consulted
- MongoDB official documentation for `db.collection.updateOne()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB official documentation for update operators (`$set`, `$inc`): https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB official documentation for `replaceOne()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.replaceOne/

## Issues Found
1. **Incorrect claim about replacement behavior in Common Mistakes section**: The post stated that passing `{ field: value }` (without an update operator) to `updateOne()` "will replace the entire document." This is incorrect. `updateOne()` requires update operator expressions (or an aggregation pipeline since MongoDB 4.2). Passing a document without update operators throws an error. Only `replaceOne()` accepts replacement documents. Fixed the bullet point to accurately describe the error behavior and point readers to `replaceOne()` as the correct method for full document replacement.

## Review Notes
- The post description mentions `$push` as an example operator, but `$push` is never demonstrated in the post body. This is not technically incorrect but is a minor inconsistency.
- The post mixes MongoDB shell syntax (`db.users.updateOne(...)`) and Node.js driver syntax (`await db.collection("users").updateOne(...)`) across examples. Both are correct, but the mixed usage could be noted for consistency in a future revision.
