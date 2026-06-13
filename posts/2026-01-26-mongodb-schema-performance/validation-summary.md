# Validation Summary: How to Design MongoDB Schemas for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB document modeling
- BSON documents
- MongoDB indexes and compound indexes
- MongoDB aggregation pipelines
- MongoDB database profiler
- JavaScript and mongosh examples

## Sources Consulted
- MongoDB Database Manual: Documents and BSON document size limit: https://www.mongodb.com/docs/manual/core/document/
- MongoDB Database Manual: Limits and Thresholds: https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Database Manual: Query Optimization and covered queries: https://www.mongodb.com/docs/manual/core/query-optimization/
- MongoDB Database Manual: Compound Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Database Manual: ESR guideline for compound indexes: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB Database Manual: Create Indexes to Support Your Queries: https://www.mongodb.com/docs/manual/data-modeling/schema-design-process/create-indexes/
- MongoDB Database Manual: Avoid Unbounded Arrays: https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/
- MongoDB Database Manual: Bucket Pattern: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
- MongoDB Database Manual: Aggregation Pipeline Optimization: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB Database Manual: $match aggregation stage optimization: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB Database Manual: db.setProfilingLevel(): https://www.mongodb.com/docs/manual/reference/method/db.setprofilinglevel/
- MongoDB Database Manual: Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Database Manual: db.collection.find() projection behavior: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/

## Issues Found
- The decision flowchart used a 16KB threshold for embedded data. MongoDB's BSON document size limit is 16 mebibytes, so this was changed to a bounded data check under 16 MiB.
- The post referred to the document limit as 16MB. This was corrected to 16 mebibytes to match MongoDB's documentation.
- Several illustrative `ObjectId("...")` placeholders would throw if executed because `ObjectId()` requires a valid 24-character hexadecimal string. These were replaced with valid example ObjectId values.
- The aggregation optimization example recommended using `$project` early to reduce document size. MongoDB documentation says early or middle `$project` stages are unlikely to improve performance because the database performs that optimization automatically. The example now uses `$match` early, then groups, sorts, limits, and uses `$project` at the end to shape output.
- The projection examples implied only selected fields were returned but did not exclude `_id`, which MongoDB returns by default. The examples now explicitly set `_id: 0` where the surrounding text says only selected fields should be returned.
- The performance-monitoring helper measured `find()` cursor creation rather than query execution. It now awaits `toArray()` when the operation returns a cursor so the measured duration includes query execution.
- One JavaScript snippet declared `const orderSchema` twice in the same block. The first declaration was renamed to avoid a syntax error.

## Review Notes
The article is technically sound after the corrections. Future improvements could mention cursor pagination tie-breakers for non-unique sort fields and the write/storage tradeoffs of denormalized patterns in more depth, but those are enhancements rather than correctness issues.
