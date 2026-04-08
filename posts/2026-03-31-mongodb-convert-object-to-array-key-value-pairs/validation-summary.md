# Validation Summary: How to Convert an Object to an Array of Key-Value Pairs in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$objectToArray` operator
- `$arrayToObject` operator
- `$filter`, `$map`, `$unwind`, `$group` aggregation stages/operators

## Sources Consulted
- MongoDB official documentation: `$objectToArray` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/
- MongoDB official documentation: `$arrayToObject` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/
- MongoDB official documentation: `$$ROOT` system variable — https://www.mongodb.com/docs/manual/reference/aggregation-variables/

## Issues Found
1. **Incorrect claim about `$$ROOT` excluding `_id`**: The post stated "To convert the entire document (excluding `_id`) to key-value pairs, use `$$ROOT`". This is incorrect — `$$ROOT` references the entire document including `_id`. The resulting array from `$objectToArray: "$$ROOT"` will contain a `{ "k": "_id", "v": <id_value> }` entry. Changed "excluding" to "including".

## Review Notes
- All code examples use correct MongoDB aggregation syntax and would work as described.
- The `$filter` example with `$gt` on `"$$field.v"` works correctly for numeric values but would behave unexpectedly if mixed types are present in the `values` subdocument (MongoDB type comparison order). This is an edge case not worth covering in a tutorial.
- The round-trip example using `$toUpper` on keys is correct and demonstrates the pattern well.
