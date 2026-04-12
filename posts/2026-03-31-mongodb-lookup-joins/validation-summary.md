# Validation Summary: How to Use $lookup for Joins in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$lookup` stage (equality join and pipeline join forms)
- `$unwind` stage
- `$project` stage
- `$match` with `$expr`
- MongoDB indexing

## Sources Consulted
- MongoDB official documentation: `$lookup` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation: `$unwind` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB official documentation: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB official documentation: The `_id` index — https://www.mongodb.com/docs/manual/core/index-single/#std-label-index-type-id

## Issues Found

### Issue 1: Example 2 output missing `customerId` field
- **What was wrong:** The output for Example 2 (Unwinding the Joined Array) omitted the `customerId` field from each result document. The `$unwind` stage only unwraps the target array field — it does not remove other fields from the document. The `customerId` field should still be present in the output.
- **What was changed:** Added `customerId: "C1"`, `customerId: "C2"`, and `customerId: "C1"` to the three output documents respectively.
- **Why:** Showing output without `customerId` could mislead readers into thinking `$unwind` strips other fields from the document.

### Issue 2: Redundant `_id` index in performance tips
- **What was wrong:** The performance tips code example showed `db.customers.createIndex({ _id: 1 })`. MongoDB automatically creates a unique index on the `_id` field for every collection, so this command is redundant and misleading.
- **What was changed:** Replaced the example with a comment noting that `_id` is indexed automatically, and used a more realistic example (`db.products.createIndex({ sku: 1 })`) to demonstrate indexing a non-`_id` foreign field.
- **Why:** Readers following this advice would either get a no-op or incorrectly believe that `_id` indexing is something they need to manage manually.

## Review Notes
- The pipeline join form is correctly noted as available from MongoDB 3.6+. This is accurate.
- The post correctly describes `$lookup` as performing a left outer join. This matches the official MongoDB documentation.
- Example 3 (Pipeline Join with Filtering) does not show output. This is fine as a style choice but readers may benefit from seeing expected results. Not a technical error.
- The description says `$lookup` joins collections "in the same database." Starting with MongoDB 5.1, `$lookup` supports cross-database joins on Atlas clusters, but the statement remains correct for self-managed deployments and is not misleading.
