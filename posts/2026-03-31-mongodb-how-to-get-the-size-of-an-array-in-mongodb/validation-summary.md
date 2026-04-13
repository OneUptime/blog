# Validation Summary: How to Get the Size of an Array in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, aggregation framework)
- MongoDB `$size` operator (query and aggregation variants)
- MongoDB `$expr` operator
- MongoDB aggregation pipeline (`$project`, `$match`, `$group`, `$map`)
- MongoDB `$ifNull`, `$concatArrays` operators

## Sources Consulted
- MongoDB official documentation: `$size` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/size/
- MongoDB official documentation: `$size` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/
- MongoDB official documentation: `$expr` — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation: `$ifNull` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB official documentation: Update with aggregation pipeline — https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/
- MongoDB official documentation: `$where` — https://www.mongodb.com/docs/manual/reference/operator/query/where/

## Issues Found
- **Introduction mentioned `$where` instead of `$expr`**: The introduction stated "For range queries on array size, you need a workaround using `$where` or a stored size field." However, the post itself demonstrates `$expr` with the aggregation `$size` operator as the solution for range queries — not `$where`. The `$where` operator evaluates JavaScript and is slower, cannot use indexes, and is generally discouraged in favor of `$expr` (available since MongoDB 3.6). Updated the introduction to reference `$expr` instead of `$where` to match the actual content of the post and reflect current best practices.

## Review Notes
- All code examples are syntactically correct and use current, non-deprecated MongoDB APIs.
- The aggregation pipeline update syntax (array as second argument to `updateOne`) requires MongoDB 4.2+. This is not noted in the post but is a reasonable assumption for modern MongoDB usage.
- The `$type: "array"` string alias used in the `$exists`/`$type` filter is valid (BSON type 4). Using `$type: "array"` alone would also imply existence, making the `$exists: true` redundant — but including both is not incorrect.
- The `$group` stage using `{ $size: "$items" }` as `_id` will fail for documents where `items` is null or missing. In a production scenario, wrapping with `$ifNull` would be safer, consistent with the advice in the "Handling Null and Missing Array Fields" section.
