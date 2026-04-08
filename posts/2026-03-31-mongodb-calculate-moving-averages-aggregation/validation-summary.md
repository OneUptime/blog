# Validation Summary: How to Calculate Moving Averages in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ aggregation framework
- `$setWindowFields` stage
- Window functions (`$avg`) with `documents` and `range` windows
- `$match`, `$project`, `$round` aggregation operators
- MongoDB time-series collections (mentioned)

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: Window function expressions — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window-specification
- MongoDB official documentation: `$avg` as window operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/#use-in-setwindowfields-stage
- MongoDB official documentation: `$round` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB release notes for 5.0 (confirming `$setWindowFields` introduction)

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax and would execute as expected on MongoDB 5.0+.
- The `documents: [-2, 0]` window correctly defines a 3-document trailing window, and the `range: [-6, 0], unit: "day"` correctly defines a 7-day rolling window.
- The SQL analogy (`OVER (ORDER BY ... ROWS BETWEEN ...)`) is accurate and helpful for readers with SQL background.
- The performance guidance is sound: indexing the sort field, placing `$match` first, and using `allowDiskUse` for large datasets are all best practices.
- The post could mention in the future that `$setWindowFields` also supports `$expMovingAvg` for exponential moving averages, which is a related use case readers may be interested in.
