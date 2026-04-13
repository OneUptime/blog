# Validation Summary: How to Build a Log Analytics Platform with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (5.0+ time series collections)
- MongoDB Aggregation Pipeline
- MongoDB TTL (expireAfterSeconds)
- JavaScript / Node.js MongoDB driver

## Sources Consulted
- MongoDB Time Series Collections documentation: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB `db.createCollection()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB `$group` accumulator behavior with prior `$sort`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB `$push` accumulator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/
- MongoDB `$dateToString` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB `insertMany` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/

## Issues Found
1. **P95 Latency Analysis — missing `$sort` before `$group`**: The `$push` accumulator collects values in the order documents are processed, which is not guaranteed to be sorted by `duration`. The percentile calculation using `$arrayElemAt` at index `floor(0.95 * size)` only produces a correct P95 value if the array is sorted in ascending order. Added `{ $sort: { duration: 1 } }` before the `$group` stage so that `$push` accumulates durations in ascending order, making the percentile index lookup correct.

## Review Notes
- MongoDB 7.0 introduced the `$percentile` accumulator operator which would be a cleaner way to compute P95 directly within `$group`. The manual approach used here is valid for MongoDB 5.0+ after the sort fix, but future updates could mention `$percentile` as a simpler alternative for newer versions.
- The P95 index formula `floor(0.95 * N)` is an approximation (nearest-rank method). For large datasets this is accurate enough; for very small datasets the result may be slightly off from the textbook definition. This is acceptable for a tutorial context.
- The time series collection creation with `expireAfterSeconds: 2592000` (30 days) is correct and a good practice for log data lifecycle management.
- All other code examples (batch inserts, time-range queries, error rate aggregation) are syntactically correct and use current, non-deprecated APIs.
