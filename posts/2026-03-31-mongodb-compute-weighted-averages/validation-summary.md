# Validation Summary: How to Compute Weighted Averages in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- JavaScript (Node.js MongoDB Driver)
- MongoDB operators: `$group`, `$project`, `$addFields`, `$sum`, `$multiply`, `$divide`, `$cond`, `$switch`, `$round`, `$subtract`

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$avg` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- MongoDB `$group` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$project` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB `$cond` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB `$switch` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/

## Issues Found
1. **Incorrect `$avg` usage in `$project` stage (Example 1, line 39):** The fallback branch of the `$cond` used `{ $avg: "$rating" }` when `sumWeights` equals 0. This is incorrect for two reasons: (a) after `$group`, the `$rating` field no longer exists on the grouped documents — only `_id`, `sumWeightedRating`, `sumWeights`, and `reviewCount` are available; (b) `$avg` in a `$project` stage operates on arrays, not scalar field references, so `{ $avg: "$rating" }` would evaluate to `null` regardless. Changed the fallback to `null`, which correctly indicates that no weighted average can be computed when total weight is zero.

## Review Notes
- The GPA example (Example 2) does not handle the edge case where `totalCredits` is 0, which would cause a division-by-zero error. This is unlikely in practice (a student with no courses), but the post could add `$cond` protection similar to Example 1 for completeness.
- The time-weighted example (Example 4) uses `new Date()` in the pipeline definition, which evaluates at pipeline construction time in JavaScript. This is a common and acceptable pattern, but readers should be aware it captures the timestamp when the query is built, not when the server executes it.
- All other aggregation patterns, operator usage, and pipeline structures are correct and follow current MongoDB best practices.
