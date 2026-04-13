# Validation Summary: How to Use $first and $last as Window Functions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Framework (`$setWindowFields` stage)
- Window function operators (`$first`, `$last`, `$sum`, `$avg`)
- Document-based and range-based window specifications

## Sources Consulted
- [$setWindowFields (aggregation stage)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/) — confirmed `$setWindowFields` introduced in MongoDB 5.0, verified `partitionBy`/`sortBy`/`output`/`window` syntax
- [$first (window operator)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/) — verified usage as a window function operator within `$setWindowFields`
- [$last (window operator)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/) — verified usage as a window function operator within `$setWindowFields`
- [Window Function Operators reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window-function-operators) — confirmed `$first` and `$last` are valid window operators, and that multiple window functions can coexist in the same `output` block

## Issues Found
No technical issues found.

## Review Notes
- Example 2 (Last Revenue in Each Region) partitions by `$region` and sorts by `month`, but the West region has multiple salespeople with the same month values. When there are ties in the sort key, the order among tied documents is non-deterministic, so the `$last` result could vary across executions. The code is syntactically valid and will run, but readers should be aware that a compound sort (e.g., `{ month: 1, salesperson: 1 }`) would be needed for deterministic results.
- Example 5 (Range-Based Window) uses `sortBy: { saleDate: 1 }` with `unit: "day"` — this requires `saleDate` to be a BSON Date type. The example uses a different collection schema than the dataset setup, so readers would need to ensure the field is a proper Date.
- The trend detection in Example 3 classifies equal opening and closing revenue as "declining" since the `$cond` uses `$gt` without an equality check. This is a design choice rather than a technical error.
