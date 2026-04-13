# Validation Summary: How to Use $add, $subtract, $multiply, $divide in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Aggregation Framework
- MongoDB arithmetic expression operators: `$add`, `$subtract`, `$multiply`, `$divide`
- Related operators: `$sum`, `$map`, `$cond`, `$pow`, `$expr`

## Sources Consulted
- MongoDB official documentation: `$add` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/add/)
- MongoDB official documentation: `$subtract` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/)
- MongoDB official documentation: `$multiply` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/)
- MongoDB official documentation: `$divide` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/)
- MongoDB official documentation: `$sum` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/)
- MongoDB official documentation: `$pow` aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/pow/)
- MongoDB official documentation: `$expr` query operator (https://www.mongodb.com/docs/manual/reference/operator/query/expr/)

## Issues Found
No technical issues found.

## Review Notes
- All four arithmetic operators are correctly described with accurate argument counts: `$add` (2+), `$subtract` (exactly 2), `$multiply` (2+), `$divide` (exactly 2).
- The Date arithmetic behavior for `$add` (adding milliseconds to a Date) and `$subtract` (Date difference returning milliseconds) is correctly documented.
- The use of `$sum` as an expression operator (not just an accumulator) in the Invoice example is valid for MongoDB 3.2+. The post does not mention this version requirement, but since 3.2 is very old, this is not a practical concern.
- The division-by-zero guard pattern using `$cond` is a sound best practice recommendation.
- The compound interest example correctly uses `$pow` (available since MongoDB 3.2) and accurately translates the formula P * (1 + r)^n.
