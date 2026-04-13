# Validation Summary: How to Use $lookup with Indexes in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, `$lookup`, `$match`, `$unwind`, `$group`, `$project`)
- MongoDB indexing (`createIndex`, `getIndexes`, `explain()`)
- MongoDB Shell (`mongosh`)

## Sources Consulted
- MongoDB official documentation on `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation on `explain()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB 3.6 release notes (pipeline-based `$lookup` with `let`/`pipeline` introduction): https://www.mongodb.com/docs/manual/release-notes/3.6/
- MongoDB official documentation on indexes: https://www.mongodb.com/docs/manual/indexes/

## Issues Found

### 1. Incorrect MongoDB version for pipeline-based `$lookup` with multiple fields
- **What was wrong:** The section "$lookup with Multiple Foreign Fields" was labeled as "MongoDB 5.0+" but the pipeline-based `$lookup` with `let` and `pipeline` (which enables multi-field joins) was introduced in MongoDB 3.6, not 5.0.
- **What was changed:** Updated section title from "MongoDB 5.0+" to "MongoDB 3.6+".
- **Why:** The code example uses `$expr` inside `$match` with `let` variables, which is the MongoDB 3.6+ syntax. Labeling it as 5.0+ would mislead readers into thinking they need a newer version than required.

### 2. Index Checklist created index on wrong field
- **What was wrong:** The "Index Checklist" section had `db.customers.createIndex({ customerId: 1 })`, but `customerId` is a field on the `orders` collection (the localField), not on the `customers` collection. The `customers` collection in the examples uses `_id` and `email` as foreign fields.
- **What was changed:** Changed to `db.customers.createIndex({ email: 1 })` with an updated comment clarifying this creates an index on the foreignField.
- **Why:** Creating an index on `customers.customerId` would index a non-existent field, providing no benefit and confusing readers about the principle of indexing the foreignField.

## Review Notes
- The compound index `db.customers.createIndex({ _id: 1, tier: 1 })` suggested in the pipeline-based `$lookup` section is technically valid but largely unnecessary. Since `_id` already has a unique index that narrows results to at most one document, checking the `tier` field on that single document is trivial without a compound index.
- The line `db.customers.createIndex({ _id: 1 })` in the Practical Example section is redundant since MongoDB automatically creates a unique index on `_id`. It won't cause errors (MongoDB silently ignores duplicate index creation), but it may confuse beginners into thinking it's a necessary step.
- The Big-O complexity claim that an indexed join is "O(n)" is a simplification — it's more accurately O(n log m) where m is the foreign collection size. This is an acceptable simplification for a blog post audience but worth noting.
- All code examples use correct MongoDB aggregation syntax and would execute successfully.
