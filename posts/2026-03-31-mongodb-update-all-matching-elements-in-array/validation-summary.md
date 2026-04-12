# Validation Summary: How to Update All Matching Elements in an Array in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (update operations, array update operators)
- MongoDB Shell (`mongosh`) syntax
- MongoDB Node.js Driver (async/await syntax in Verify Results section)

## Sources Consulted
- MongoDB Manual: `$[<identifier>]` filtered positional operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
- MongoDB Manual: `$[]` all positional operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional-all/
- MongoDB Manual: `$` positional operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional/
- MongoDB Manual: `arrayFilters` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/#std-label-update-one-arrayfilters
- MongoDB Manual: `$mul` update operator — https://www.mongodb.com/docs/manual/reference/operator/update/mul/
- MongoDB Manual: Update with aggregation pipeline — https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

## Issues Found
1. **Numeric Condition in arrayFilters example was invalid** — The original example wrapped the update in an array `[...]`, making it an aggregation pipeline-style update, and then used `$[item]` positional syntax with `arrayFilters`. This is incorrect because `arrayFilters` and filtered positional operators (`$[identifier]`) are only supported with regular update operator documents, not with aggregation pipeline updates. Additionally, `$$item` was claimed to reference the "array element variable in an aggregation pipeline update," but `$$item` would not be defined in that context (it requires `$map` or similar to define the variable). Replaced the example with a correct approach using the `$mul` update operator to multiply the price by 0.9 for matching elements, and removed the incorrect `$$item` note.

## Review Notes
- The `$mul` operator has been available since MongoDB 2.6, so it is well-established and non-deprecated.
- The post mixes `mongosh` shell syntax (most examples) with Node.js driver syntax (Verify Results section). This is a common pattern in MongoDB tutorials and is not an error, but readers should be aware of the two different contexts.
- All other examples (`$[identifier]` with `arrayFilters`, `$[]` all positional operator, multiple `arrayFilters`, `$inc` with filtered positional) are correct and follow current MongoDB documentation.
