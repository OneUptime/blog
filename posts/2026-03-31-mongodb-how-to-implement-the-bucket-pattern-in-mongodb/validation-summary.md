# Validation Summary: How to Implement the Bucket Pattern in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands, CRUD operations, aggregation framework)
- MongoDB Bucket Pattern (schema design pattern for time-series data)
- MongoDB Time Series Collections (native feature introduced in 5.0)
- JavaScript / Node.js (application-level date manipulation)

## Sources Consulted
- MongoDB Manual: db.collection.findOneAndUpdate() — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Manual: Update Operators ($push, $inc, $min, $max, $set, $setOnInsert) — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB Manual: Upsert Behavior — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/#upsert
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Blog: Building with Patterns - The Bucket Pattern — https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern

## Issues Found

### 1. `bucketEnd` inconsistency between example document and insert code
- **What was wrong:** The example bucket document showed `bucketEnd: ISODate("2026-03-31T01:00:00Z")` (the fixed end of the hour window), but the insert code set `bucketEnd: now` (the timestamp of the latest reading). These are different semantics — one is a fixed window boundary, the other is a dynamic value that changes with each insert.
- **What was changed:** Added a `bucketEnd` calculation (`bucketStart + 1 hour`) to the insert code and changed `$set` to `$setOnInsert` for `bucketEnd`, since the fixed window end only needs to be set once when the bucket is created.
- **Why:** Consistency between the example document and the insert code. The fixed window end is the standard bucket pattern approach and is more predictable for queries.

### 2. Redundant fields in `$set` during upsert
- **What was wrong:** The insert code included `sensorId` and `bucketStart` in the `$set` operator, but these are already equality conditions in the filter. MongoDB automatically includes equality filter conditions in upserted documents, making these `$set` assignments redundant.
- **What was changed:** Removed `sensorId` and `bucketStart` from the update operators (they are already guaranteed by the filter on upsert).
- **Why:** Cleaner code that correctly reflects how MongoDB upserts work. The redundant `$set` could mislead readers into thinking these fields wouldn't be set without it.

### 3. Range query could miss partially overlapping buckets
- **What was wrong:** The query `bucketStart: { $gte: startTime }, bucketEnd: { $lte: endTime }` finds only buckets fully contained within the time range. For non-hour-aligned query boundaries, this misses buckets that partially overlap (e.g., a bucket from 05:00-06:00 would be missed with `startTime` of 05:30).
- **What was changed:** Simplified the query to `bucketStart: { $gte: startTime, $lt: endTime }`, which finds all buckets whose window starts within the query range. This is the standard approach for the bucket pattern since `bucketStart` is deterministic.
- **Why:** The simplified query is more reliable, works for both aligned and non-aligned boundaries, and only depends on the deterministic `bucketStart` field.

## Review Notes
- The "Choosing Bucket Size" table suggests "1 hour (3600 docs)" for per-second data, but the guideline below recommends limiting arrays to 200-1000 entries. 3600 entries per bucket may be too large. Authors may want to suggest a smaller window (e.g., 5-10 minutes) for per-second data in a future update.
- The post correctly notes that MongoDB 5.0+ native time series collections are preferred for new projects. This is good guidance.
- The pre-aggregated fields pattern (`sum`, `min`, `max`, `count`) is well explained and is a key benefit of the manual bucket approach.
- The `count: { $lt: 60 }` filter condition in the upsert correctly handles bucket overflow — when a bucket is full, a new document is created for the same time window. This is a subtle but important detail that works correctly with the non-unique compound index.
