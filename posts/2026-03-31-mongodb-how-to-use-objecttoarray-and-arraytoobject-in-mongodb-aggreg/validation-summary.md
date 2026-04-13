# Validation Summary: How to Use $objectToArray and $arrayToObject in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$objectToArray` operator
- `$arrayToObject` operator
- `$map`, `$filter`, `$sum`, `$not`, `$in`, `$toUpper`, `$push`, `$group`, `$project` aggregation operators

## Sources Consulted
- MongoDB official documentation for `$objectToArray`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/
- MongoDB official documentation for `$arrayToObject`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/
- MongoDB official documentation for `$not` (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/
- MongoDB official documentation for `$in` (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/
- MongoDB official documentation for `$filter`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/
- MongoDB official documentation for `$sum` (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/

## Issues Found
- **`$not` operator syntax error (line 114)**: The `$not` aggregation expression operator was used with object syntax `{ $not: { $in: [...] } }` instead of the required single-element array syntax `{ $not: [ { $in: [...] } ] }`. In MongoDB aggregation expressions, `$not` takes exactly one operand in an array: `{ $not: [ <expression> ] }`. Fixed by wrapping the `$in` expression in an array.

## Review Notes
- The `$arrayToObject` literal array examples (lines 50 and 65) work correctly without `$literal` because all values are plain strings/numbers that evaluate to themselves in expression context. However, the MongoDB documentation examples typically use `$literal` for inline literal arrays passed to `$arrayToObject`. This is a style preference, not an error.
- All other code examples (`$objectToArray` basic usage, summing dynamic values with `$map`/`$sum`, key transformation with `$toUpper`, and the pivoting pattern with `$group`/`$push`/`$arrayToObject`) are syntactically correct and follow documented MongoDB aggregation patterns.
