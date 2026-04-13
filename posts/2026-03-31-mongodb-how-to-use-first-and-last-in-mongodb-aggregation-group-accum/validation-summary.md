# Validation Summary: How to Use $first and $last in MongoDB Aggregation Group Accumulators

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- MongoDB `$first` and `$last` group accumulators
- MongoDB `$group` stage
- MongoDB `$sort` stage
- MongoDB `$setWindowFields` (5.0+)
- MongoDB `$$ROOT` system variable

## Sources Consulted
- MongoDB official documentation: `$first` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/
- MongoDB official documentation: `$last` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/
- MongoDB official documentation: `$group` stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: Date expression operators (`$subtract` on dates) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly and consistently pairs `$first`/`$last` with a preceding `$sort` stage in every example, which is essential for deterministic results.
- The `$subtract` on two Date objects returning milliseconds (divided by 60000 for minutes) is correct MongoDB behavior and is well-demonstrated.
- The `$$ROOT` technique for capturing entire documents is a useful pattern and is correctly shown.
- The `$setWindowFields` example correctly uses `documents: ["unbounded", "current"]` window frame syntax available in MongoDB 5.0+.
- The employee history example assumes the first chronological event is always a hire — this is a reasonable assumption given the sample data, not a technical error.
