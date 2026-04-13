# Validation Summary: How to Use $in (Aggregation Expression) to Check Array Membership in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$in` aggregation expression operator
- `$project`, `$addFields`, `$match`, `$filter` pipeline stages
- `$cond`, `$switch`, `$not`, `$expr` aggregation operators

## Sources Consulted
- MongoDB official documentation: `$in` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/
- MongoDB official documentation: `$not` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/
- MongoDB official documentation: `$filter` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/
- MongoDB official documentation: `$expr` — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation: `$cond` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB official documentation: `$switch` (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/

## Issues Found
1. **Incorrect `$not` syntax (line ~128)**: The aggregation `$not` operator requires its argument wrapped in an array: `{ $not: [ <expression> ] }`. The post had `{ $not: { $in: [...] } }` which is invalid because `$not` expects an array with a single expression element, not a direct document. Fixed to `{ $not: [{ $in: [...] }] }`.

## Review Notes
- The `$$ROOT.activeSaleSkus` usage in the "Practical Example: Tagging Documents" section is technically valid but unusual. `$$ROOT` in an `$addFields` stage refers to the current document, so `$$ROOT.activeSaleSkus` is equivalent to `$activeSaleSkus`. The example assumes each product document has an `activeSaleSkus` array field, which is a somewhat unconventional data model but not technically incorrect for demonstration purposes.
- The post correctly distinguishes between the query `$in` operator and the aggregation `$in` expression, which is a common source of confusion.
- All other code examples use correct syntax and would work as described.
