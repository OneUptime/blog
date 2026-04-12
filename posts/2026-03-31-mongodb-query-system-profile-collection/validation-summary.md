# Validation Summary: How to Query the system.profile Collection in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (system.profile collection, database profiler)
- MongoDB Shell (mongosh) queries and aggregation pipelines
- MongoDB Aggregation Framework ($match, $group, $project, $sort, $limit, $divide, $max, $objectToArray)

## Sources Consulted
- MongoDB official documentation: system.profile collection (https://www.mongodb.com/docs/manual/reference/database-profiler/)
- MongoDB official documentation: Database Profiler Output (https://www.mongodb.com/docs/manual/reference/database-profiler/#database-profiler-output)
- MongoDB official documentation: db.setProfilingLevel() (https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/)
- MongoDB official documentation: Aggregation Pipeline Operators (https://www.mongodb.com/docs/manual/reference/operator/aggregation/)
- MongoDB official documentation: $max (aggregation expression) (https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/)
- MongoDB official documentation: $objectToArray (https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/)

## Issues Found
No technical issues found.

## Review Notes
- The `$max` usage in the `$project` stage (examine-to-return ratio section) correctly uses the array form of `$max` to return the maximum of `$nreturned` and `1`, preventing division by zero. This is technically redundant since the preceding `$match` already filters `nreturned: { $gt: 0 }`, but it is a reasonable defensive measure and not an error.
- The `.pretty()` method in the first query example is valid in both the legacy mongo shell and mongosh, though mongosh pretty-prints by default. Not an error.
- The `$objectToArray` approach for grouping by filter shape is a clever technique. It groups queries by their filter key structures, which is a useful proxy for query shape analysis.
- All profiler field names (`op`, `ns`, `millis`, `docsExamined`, `keysExamined`, `nreturned`, `planSummary`, `ts`, `client`, `user`, `command`) are accurate for MongoDB 3.6+ profiler output.
