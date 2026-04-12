# Validation Summary: How to Use Correlated Subqueries with $lookup in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- `$lookup` aggregation stage (pipeline form with `let` variables)
- `$expr`, `$match`, `$group`, `$addFields`, `$project`, `$arrayElemAt`, `$ifNull` operators
- MongoDB indexing

## Sources Consulted
- MongoDB official documentation: `$lookup` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB official documentation: `$expr` — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation: Aggregation pipeline stages — https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- MongoDB release notes for 3.6 (confirming pipeline form of `$lookup` introduction) — https://www.mongodb.com/docs/manual/release-notes/3.6/

## Issues Found
No technical issues found.

## Review Notes
- The `let: { now: new Date() }` pattern in the subscriptions example works because `new Date()` is evaluated in the JavaScript shell (mongosh) before the pipeline is sent to the server. An alternative would be the `$$NOW` aggregation system variable (available since MongoDB 4.2), which is evaluated server-side and would be more portable across drivers. This is not an error, just an alternative approach.
- Since MongoDB 5.1, you can combine `localField`/`foreignField` with a `pipeline` in the same `$lookup`, which was not possible in earlier versions. The post's comparison table is accurate for the traditional distinction and remains useful for clarity, but readers on newer MongoDB versions have this additional option.
