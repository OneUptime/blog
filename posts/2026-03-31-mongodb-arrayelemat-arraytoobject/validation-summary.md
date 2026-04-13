# Validation Summary: How to Use $arrayElemAt and $arrayToObject in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB Aggregation Framework
- `$arrayElemAt` operator
- `$arrayToObject` operator
- `$lookup`, `$project`, `$map`, `$zip`, `$ifNull` (supporting operators)

## Sources Consulted
- MongoDB official documentation: `$arrayElemAt` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/
- MongoDB official documentation: `$arrayToObject` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/
- MongoDB official documentation: `$zip` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/zip/
- MongoDB official documentation: `$lookup` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/

## Issues Found
- **Example 2 heading mismatch**: The heading read "Access the Last Joined Document" but the example uses index `0` to extract the *first* matching document after `$lookup`. The body text correctly stated "extract just the first matching document," contradicting the heading. Fixed heading to "Extract First Match After $lookup."

## Review Notes
- All code examples are syntactically correct and produce the documented outputs.
- `$arrayElemAt` behavior for negative indices and out-of-bounds access is accurately described.
- `$arrayToObject` correctly documents both accepted input formats (`[k, v]` pairs and `{ k, v }` objects).
- The `$map` + `$arrayToObject` and `$zip` + `$arrayToObject` patterns are idiomatic and correct.
- Example 2 uses `$productInfo.name` (dot notation into an array field) which correctly resolves to an array of `name` values from the `$lookup` result — this is valid MongoDB aggregation behavior.
