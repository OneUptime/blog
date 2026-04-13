# Validation Summary: How to Use $denseRank for Dense Ranking in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$setWindowFields` stage
- `$denseRank` window function operator
- `$rank` and `$documentNumber` (comparison)
- `$group`, `$addFields`, `$switch`, `$match` aggregation stages

## Sources Consulted
- MongoDB $denseRank documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/denserank/
- MongoDB $setWindowFields documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB $rank documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
- MongoDB $documentNumber documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/
- MongoDB $group documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB $subtract documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/

## Issues Found
- **Example 3 — `$subtract` used as a `$group` accumulator**: The original code placed `salaryRange: { $subtract: [{ $max: "$salary" }, { $min: "$salary" }] }` directly inside the `$group` stage. `$subtract` is an arithmetic expression operator, not a valid accumulator. In a `$group` stage, every field (other than `_id`) must use an accumulator operator (`$sum`, `$max`, `$min`, `$avg`, `$push`, etc.). Fixed by removing `salaryRange` from `$group`, computing `maxSalary` and `minSalary` as separate accumulators, then calculating `salaryRange` in a subsequent `$addFields` stage using `{ $subtract: ["$maxSalary", "$minSalary"] }`.

## Review Notes
- Example 3 also computes `avgSalaryAtRank` using `window: { documents: ["current", "current"] }`, which is a window frame containing only the current document. This means the "average" is just the document's own salary. The field is never referenced downstream in the pipeline, so it has no effect on results, but it is semantically misleading. Not fixed since it is syntactically valid and does not affect output.
- All other examples (1, 2, 4, 5) are technically correct with proper syntax and accurate expected output.
- The comparison table of `$rank` vs `$denseRank` vs `$documentNumber` is accurate.
- The post correctly notes that `$setWindowFields` and `$denseRank` require MongoDB 5.0+.
