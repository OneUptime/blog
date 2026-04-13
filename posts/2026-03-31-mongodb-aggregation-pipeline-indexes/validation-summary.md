# Validation Summary: How to Use Aggregation Pipeline Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, indexing, query optimization)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: explain() for Aggregation — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB Manual: $lookup — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: ESR (Equality, Sort, Range) Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/

## Issues Found
- **ESR Rule example had incorrect Range predicate**: The original example used `createdAt: { $gte: new Date("2024-01-01") }` as the Range predicate alongside `$sort: { createdAt: -1 }` as the Sort. Since both Sort and Range targeted the same field (`createdAt`), this did not properly demonstrate the ESR rule with three distinct field roles. The index `{ status: 1, createdAt: -1, amount: 1 }` has `amount` as the third field, but `amount` was never used as a filter. Changed the Range predicate to `amount: { $gte: 100 }` so the example correctly demonstrates E(status), S(createdAt), R(amount) mapping to the three index fields in order.

## Review Notes
- The `db.customers.createIndex({ _id: 1 })` line in the $lookup section notes it "usually already exists" — the `_id` index always exists by default and cannot be dropped. The comment is acceptable but could say "always exists by default" for precision.
- The Common Pitfalls section states that `$project` before `$match` loses index benefit. MongoDB's aggregation pipeline optimizer can actually reorder `$match` before `$project` in some cases. However, the advice to put `$match` first is still a valid best practice and makes pipeline intent explicit, so no change was made.
- All code examples use correct MongoDB syntax and current (non-deprecated) APIs.
- The `explain("executionStats")` output structure accurately reflects MongoDB aggregation explain format.
- The `hint` option syntax for aggregation is correct.
