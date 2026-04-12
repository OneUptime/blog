# Validation Summary: How to Use $min and $max as Window Functions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$setWindowFields` stage
- `$min` and `$max` window function accumulators
- Document-based and range-based (time) window specifications

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: `$min` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/
- MongoDB official documentation: `$max` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/
- MongoDB official documentation: Window function operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window-operators
- Cross-referenced with other validated posts in this blog covering `$setWindowFields` (e.g., compute-cumulative-sums, partition-data-window-functions, what-is-setwindowfields, time-series-analytics)

## Issues Found
No technical issues found.

## Review Notes
- The `documents: ["unbounded", "current"]` syntax for running extremes and `["unbounded", "unbounded"]` for partition-wide extremes are both correct.
- Range-based windows with `unit` (e.g., `range: [-29, 0], unit: "day"`) are correctly specified for time-series use cases.
- The anomaly detection example uses `range: [-60, -1]` which intentionally excludes the current document from the window — this is correct for comparing the current reading against prior data.
- Division-by-zero guards using `$cond` with `$eq` checks (in the positionInRange and normalizedValue calculations) are correctly implemented.
- For the anomaly detection example, the first documents in each partition may have `null` values for `recentMin`/`recentMax` (when no prior documents exist in the range window), but MongoDB comparison operators return `false` when comparing with `null`, so these documents are naturally excluded from anomaly results — this is reasonable behavior.
