# Validation Summary: How to Use $median and $percentile in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0+ aggregation framework
- `$median` accumulator operator
- `$percentile` accumulator operator
- `$setWindowFields` stage
- `$group` stage
- `$arrayElemAt` operator

## Sources Consulted
- MongoDB official documentation: `$median` aggregation accumulator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/)
- MongoDB official documentation: `$percentile` aggregation accumulator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/)
- MongoDB official documentation: `$setWindowFields` stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/)
- MongoDB 7.0 release notes (https://www.mongodb.com/docs/manual/release-notes/7.0/)

## Issues Found
No technical issues found.

## Review Notes
- The `$sort` stage before `$setWindowFields` in the rolling percentile example is redundant since `$setWindowFields` has its own `sortBy` field that handles ordering. This is not incorrect but is unnecessary overhead. Could be noted as an optimization in a future update.
- The `$percentile` operator in `$setWindowFields` returns an array (e.g., `[value]` for `p: [0.99]`), not a scalar. The `p99Latency` field in the window example would contain `[950]` rather than `950`. This is technically correct behavior but readers may expect a scalar. A follow-up `$project` with `$arrayElemAt` (as shown in the later section) would be needed to extract a single value.
- The post correctly notes that `"approximate"` is the only currently supported method. If MongoDB adds an `"exact"` method in the future, this section would need updating.
