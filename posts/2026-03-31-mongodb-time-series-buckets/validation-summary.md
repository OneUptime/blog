# Validation Summary: How to Query Time Series Buckets in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Time Series Collections
- MongoDB Aggregation Framework (`$dateTrunc`, `$densify`, `$group`)
- MongoDB Internal Bucket Storage (`system.buckets.*`)
- MongoDB Shell and Node.js Driver APIs

## Sources Consulted
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: Time Series Collection Internals (Buckets) — https://www.mongodb.com/docs/manual/reference/internals/time-series-collections/
- MongoDB Manual: `$dateTrunc` Aggregation Operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
- MongoDB Manual: `$densify` Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/
- MongoDB Manual: `collStats` Command — https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB Manual: `dbStats` Command — https://www.mongodb.com/docs/manual/reference/command/dbStats/

## Issues Found

1. **Inconsistent timeField naming in bucket example and text**: The internal bucket document example used `ts` as the key in `control.min` and `control.max` (e.g., `control.min.ts`), but all queries throughout the post use `timestamp` as the timeField. In MongoDB's internal bucket representation, the control document uses the same field name as the collection's configured `timeField`. Fixed `ts` to `timestamp` in the bucket example comment (lines 39-40), the explanatory text (line 59), and the inline code comment (line 60).

2. **`dbStats` used instead of `collStats` for collection storage size**: The "Bucket Statistics and Storage Analysis" section used `db.command({ dbStats: 1 })` to retrieve `storageSize`, but `dbStats` returns database-wide statistics, not collection-specific stats. In the context of analyzing a specific time series collection's bucket storage, `collStats` is the correct command. Changed to `db.runCommand({ collStats: "sensor_readings" })`.

## Review Notes
- The section "Querying the Last N Buckets" is titled about buckets but actually retrieves the last N measurements/readings. The code is correct for what it does, but the title is slightly imprecise. Not changed since the intent is clear from context.
- The code blocks mix mongo shell style (`db.runCommand`, `db.getCollection`) and Node.js driver style (`await db.collection(...).find(...).toArray()`). This is common in MongoDB tutorials but could be confusing for readers unfamiliar with both interfaces.
- The `$dateTrunc` `unit` parameter uses ES6 shorthand property syntax (`{ date: "$timestamp", unit }`) which is correct JavaScript but may confuse readers less familiar with ES6+.
- MongoDB 7.0+ introduced `bucketMaxSpanSeconds` and `bucketRoundingSeconds` as alternatives to `granularity` for finer-grained bucket control. The post only covers `granularity`, which is still fully supported and appropriate for a general tutorial.
