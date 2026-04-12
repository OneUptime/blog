# Validation Summary: How to Use $objectToArray in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$objectToArray` operator
- `$arrayToObject` operator
- `$filter`, `$map`, `$unwind`, `$group` pipeline/expression operators
- `$$ROOT` system variable

## Sources Consulted
- MongoDB official documentation: `$objectToArray` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/)
- MongoDB official documentation: `$arrayToObject` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/)
- MongoDB official documentation: `$sum` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/)
- MongoDB official documentation: `$filter` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/)
- MongoDB official documentation: `$$ROOT` system variable (https://www.mongodb.com/docs/manual/reference/aggregation-variables/)

## Issues Found
- **Example 1 description said "(minus `_id`)" but output included `_id`**: The description for Example 1 stated "Convert the entire document (minus `_id`) to a key-value array" while the output correctly showed `_id` as part of the `fieldsArray`. When `$objectToArray` is applied to `$$ROOT`, all fields including `_id` are converted to `{k, v}` pairs. Fixed by removing the "(minus `_id`)" parenthetical from the description.

## Review Notes
- All code examples use correct MongoDB aggregation syntax and would produce the expected outputs.
- The `$sum` operator used as an expression (not as a `$group` accumulator) correctly accepts an array argument, as shown in Example 4.
- Example 6 output values (count: 10, avgValue: 250, etc.) are illustrative and depend on collection data — this is fine for a tutorial.
- Example 7 arithmetic is correct: 90 * 1.1 = 99, 85 * 1.1 = 93.5.
- The null/missing behavior described in the Syntax section is accurate per MongoDB docs.
- The claim that `$objectToArray` is the inverse of `$arrayToObject` is correct.
