# Validation Summary: How to Concatenate Arrays in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$concatArrays` operator
- `$setUnion` operator
- `$reduce` operator
- `$ifNull` operator
- `$size` operator
- `$group` and `$project` stages

## Sources Consulted
- MongoDB official documentation: `$concatArrays` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/
- MongoDB official documentation: `$setUnion` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setUnion/
- MongoDB official documentation: `$reduce` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/
- MongoDB official documentation: `$ifNull` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/

## Issues Found
1. **Incorrect `$setUnion` syntax in "Deduplicating After Concatenation" section**: The original code used `{ $setUnion: { $concatArrays: ["$systemTags", "$userTags"] } }`, which passes a single object expression directly to `$setUnion`. The `$setUnion` operator expects an array of expressions, each resolving to an array (syntax: `{ $setUnion: [ <expr1>, <expr2>, ... ] }`). Additionally, using `$concatArrays` inside `$setUnion` is redundant since `$setUnion` already merges and deduplicates multiple arrays. Fixed to `{ $setUnion: ["$systemTags", "$userTags"] }`, which correctly combines and deduplicates both arrays in a single operation.

## Review Notes
- All other code examples (`$concatArrays` basic usage, literal array mixing, `$ifNull` null handling, `$reduce` for flattening after `$group`, and `$size` for counting) are syntactically correct and follow current MongoDB best practices.
- The `$reduce` + `$concatArrays` pattern for flattening nested arrays after `$group` is idiomatic and correct.
- The post does not specify a minimum MongoDB version. `$concatArrays` has been available since MongoDB 3.4, so this applies to all currently supported versions.
