# Validation Summary: How to Create a Gauge Chart in MongoDB Atlas Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Charts
- MongoDB Aggregation Framework
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Atlas Charts documentation: https://www.mongodb.com/docs/charts/
- MongoDB Aggregation Pipeline `$match` stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB `$expr` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB `$subtract` aggregation operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/
- Net Promoter Score (NPS) definition and range: standard industry definition (-100 to +100)

## Issues Found

### Issue 1: Invalid use of `$subtract` in `$match` stage (Step 6)
- **What was wrong:** The custom aggregation pipeline used `$subtract` (an aggregation expression operator) directly inside the `$match` stage's query filter: `timestamp: { $gte: { $subtract: [new Date(), 3600000] } }`. The `$match` stage uses standard MongoDB query operators by default, not aggregation expressions. `$subtract` would be interpreted as an unknown query operator and cause an error.
- **What was changed:** Wrapped the timestamp comparison in `$expr` to enable the use of aggregation expression operators within `$match`: `$expr: { $gte: ["$timestamp", { $subtract: [new Date(), 3600000] }] }`.
- **Why:** `$expr` allows the use of aggregation expressions within the `$match` stage, which is required when using operators like `$subtract` to compute values at query time.

### Issue 2: Incorrect NPS score range
- **What was wrong:** The post listed "NPS score (0 to 100)" as a gauge chart use case.
- **What was changed:** Corrected to "NPS score (-100 to 100)".
- **Why:** Net Promoter Score ranges from -100 to +100 (percentage of promoters minus percentage of detractors), not 0 to 100.

## Review Notes
- The "Last" aggregation option mentioned in Step 3 may not be available as a built-in aggregation in all versions of Atlas Charts. Standard aggregations typically include count, sum, mean, median, min, max, and standard deviation. Users may need to use a custom aggregation pipeline to achieve "last value" behavior.
- The auto-refresh intervals listed (1 min, 5 min, 30 min, 1 hour) are a subset of what Atlas Charts offers — additional intervals like 10 seconds, 30 seconds, and 15 minutes may also be available depending on the Atlas Charts version.
- The post describes "Filter" as an encoding channel for the Gauge chart. In Atlas Charts, filtering is available for all chart types via the Filter bar rather than as a dedicated encoding channel specific to gauge charts. This is a minor terminology nuance that does not affect the practical guidance.
