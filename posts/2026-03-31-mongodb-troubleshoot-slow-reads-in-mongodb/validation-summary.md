# Validation Summary: How to Troubleshoot Slow Reads in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server-side shell commands and explain plans)
- MongoDB Node.js Driver (read preferences, client configuration)
- MongoDB Query Profiler (`system.profile` collection)
- MongoDB Indexing (`createIndex`, `$indexStats`, covered queries)

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Manual: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: $indexStats — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Node.js Driver API: ReadPreference, MongoClient, FindCursor — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **Incorrect field name `totalDocsReturned` in explain output (Step 2):** The code referenced `result.executionStats.totalDocsReturned`, but this field does not exist in MongoDB's explain output. The correct field is `nReturned` (`result.executionStats.nReturned`). Fixed in both the code example and the "Red flags" bullet point that referenced the same incorrect field name.

## Review Notes
- The ESR (Equality, Sort, Range) indexing rule is correctly described as "equality first, then range, then sort." The compound index example in Step 3 is appropriate for the query shown.
- The 100 MB in-memory sort limit mentioned in Step 6 is correct for MongoDB 4.4+ (controlled by `internalQueryMaxBlockingSortMemoryUsageBytes`, default 104857600 bytes). Prior versions used a 32 MB limit.
- The covered query example in Step 4 is correct: the index on `{ category: 1, name: 1, price: 1 }` covers the query with projection `{ name: 1, price: 1, _id: 0 }` since all queried and returned fields are in the index and `_id` is excluded.
- The `setProfilingLevel` syntax with object options (`{ slowms: 50 }`) is correct for MongoDB 3.6+.
