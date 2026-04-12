# Validation Summary: How to Query Documents Where an Array Contains a Value in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query language, array operators, indexing)
- JavaScript (MongoDB Shell syntax)

## Sources Consulted
- MongoDB Manual — Query an Array: https://www.mongodb.com/docs/manual/tutorial/query-arrays/
- MongoDB Manual — $in Operator: https://www.mongodb.com/docs/manual/reference/operator/query/in/
- MongoDB Manual — $elemMatch (query): https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB Manual — $all Operator: https://www.mongodb.com/docs/manual/reference/operator/query/all/
- MongoDB Manual — $ne Operator: https://www.mongodb.com/docs/manual/reference/operator/query/ne/
- MongoDB Manual — $nin Operator: https://www.mongodb.com/docs/manual/reference/operator/query/nin/
- MongoDB Manual — Multikey Indexes: https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Manual — explain(): https://www.mongodb.com/docs/manual/reference/method/cursor.explain/

## Issues Found
- **Misleading claim about `$and` vs `$all`**: The post stated that combining array checks with `$and` (e.g., `{ $and: [{ tags: "sale" }, { tags: "electronics" }] }`) "is different from `$all`". For simple scalar value matching, this `$and` pattern is functionally equivalent to `{ tags: { $all: ["sale", "electronics"] } }` — both require the array to contain all specified values. Updated the text to correctly note the equivalence and mention `$all` as the more idiomatic form.

## Review Notes
- All code examples use correct MongoDB shell syntax and would execute as expected.
- The explanation of `$elemMatch` vs dot-notation with multiple conditions is accurate and is a common source of bugs — good to highlight.
- The `explain("executionStats")` usage and guidance to look for `IXSCAN` with `isMultiKey: true` is correct.
- The `$ne` and `$nin` negation examples are correct but worth noting that these operators cannot efficiently use indexes on array fields (they typically result in collection scans or index scans that are not selective), which could be mentioned in a future revision.
