# Validation Summary: How to Use $and, $or, $not, $nor in MongoDB Queries

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB query language (MQL)
- MongoDB logical operators: `$and`, `$or`, `$not`, `$nor`
- MongoDB shell (`mongosh`)

## Sources Consulted
- MongoDB official documentation: Query and Projection Operators — Logical Query Operators (https://www.mongodb.com/docs/manual/reference/operator/query-logical/)
- MongoDB official documentation: `$and` (https://www.mongodb.com/docs/manual/reference/operator/query/and/)
- MongoDB official documentation: `$or` (https://www.mongodb.com/docs/manual/reference/operator/query/or/)
- MongoDB official documentation: `$not` (https://www.mongodb.com/docs/manual/reference/operator/query/not/)
- MongoDB official documentation: `$nor` (https://www.mongodb.com/docs/manual/reference/operator/query/nor/)
- MongoDB official documentation: `$exists` (https://www.mongodb.com/docs/manual/reference/operator/query/exists/)

## Issues Found
1. **Incorrect comment in `$nor` example (line 128):** The comment stated "Matches docs where deletedAt doesn't exist OR deletedAt is not a real date." This is incorrect. The query `$nor: [{ deletedAt: { $exists: true } }]` only matches documents where the `deletedAt` field does not exist. If `deletedAt` exists with any value (including `null` or a non-date type), `$exists: true` is satisfied, and `$nor` excludes that document. Fixed the comment to: "Matches docs where deletedAt does not exist."

## Review Notes
- The first `$and` example (price range) works correctly but is not the best illustration of when explicit `$and` is strictly *required*. That specific example could also be written as `{ price: { $gte: 10, $lte: 100 } }` without `$and`. Explicit `$and` is truly required when the same field key must appear multiple times at the same level in the query document (which JSON doesn't allow), or when multiple instances of the same top-level operator (like `$or`) are needed. The post does show the latter case correctly in its third `$and` example. This is a pedagogical nuance, not a technical error, so no change was made.
- All code examples use correct MongoDB query syntax and would execute successfully in `mongosh`.
- The explanations of operator behavior (short-circuiting for `$and`, field-not-existing behavior for `$not` and `$nor`) are accurate.
