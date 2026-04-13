# Validation Summary: How to Use $min and $max in MongoDB Aggregation Group Accumulators

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$min` and `$max` accumulator operators
- `$group`, `$project`, `$addFields` pipeline stages
- `$first` / `$last` accumulators with `$sort`

## Sources Consulted
- MongoDB official documentation: $min (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/
- MongoDB official documentation: $max (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/
- MongoDB official documentation: $group stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: $subtract — https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- MongoDB official documentation: BSON comparison order — https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/

## Issues Found
- **Line 32 — incorrect operator name in explanation text**: The text read "`$subtract` with two `$max` calls won't work directly in `$group`" but the code block above uses both `$max` and `$min`, not two `$max` calls. Changed "two `$max` calls" to "`$max` and `$min`" to accurately describe the code.

## Review Notes
- The post deliberately shows an incorrect code pattern first (using `$subtract` inside `$group`) and then corrects it. This pedagogical approach is valid but readers may accidentally copy the first (broken) code block. The correction is technically accurate: `$subtract` is an arithmetic expression operator, not an accumulator, so it cannot be used as a top-level field value in `$group`.
- The `$sort: { userId: 1 }` before `$group` in the "Finding Earliest and Latest Dates" section is unnecessary for `$min`/`$max` (they scan all documents regardless of sort order), but it does not produce incorrect results.
- The `$min`/`$max` on arrays in `$project` section correctly distinguishes the expression-operator behavior (operating on an array within a single document) from the accumulator behavior (operating across documents in a group). The use of `$subtract` wrapping `$max`/`$min` inside `$project` is valid because in that context they are expression operators, not accumulators.
- All code examples use correct MongoDB aggregation syntax and would execute successfully against the described collections.
