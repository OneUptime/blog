# Validation Summary: How to Detect Collection Scan Hotspots with the MongoDB Profiler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (database profiler, system.profile collection)
- MongoDB Aggregation Framework ($match, $group, $sort, $limit stages)
- MongoDB Indexing (createIndex, compound indexes)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB documentation on Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB documentation on db.setProfilingLevel(): https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB documentation on system.profile output: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB documentation on db.collection.createIndex(): https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on Index Build Process (4.2+): https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found
1. **`background: true` in createIndex is deprecated** (Step 5): The `createIndex` call included `background: true` as an option. The `background` option was deprecated in MongoDB 4.2 (released August 2019). Since 4.2, MongoDB uses an optimized index build process that allows reads and writes during the build, making the `background` option unnecessary — it is silently ignored. Removed the `background: true` option from the `createIndex` call to avoid misleading readers into thinking it has an effect on modern MongoDB versions.

## Review Notes
- The `db.setProfilingLevel(1, { slowms: 50, sampleRate: 0.2 })` syntax is correct. The `sampleRate` parameter is available since MongoDB 3.6.
- The profiler field names used (`planSummary`, `ns`, `millis`, `docsExamined`, `command.filter`, `command.sort`) are all correct for the system.profile collection.
- Grouping by `$command.filter` in Step 3 works but has a practical limitation: documents with the same fields in different key order would be treated as different groups since BSON comparison is order-sensitive. This is a known caveat of this approach but not a bug — it is acceptable for identifying hotspot patterns.
- The automation script uses `print()` with ES6 template literals, which works in mongosh but not in the legacy mongo shell. Since mongosh is the current default shell, this is appropriate.
- The compound index design in Step 5 (equality fields first, then sort field) follows correct MongoDB index design best practices (ESR rule: Equality, Sort, Range).
