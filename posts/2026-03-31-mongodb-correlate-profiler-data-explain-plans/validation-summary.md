# Validation Summary: How to Correlate Profiler Data with Explain Plans in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (profiler, explain plans, indexing)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: system.profile output — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: ESR (Equality, Sort, Range) Rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/

## Issues Found
No technical issues found.

## Review Notes
- The profiler field names (`keysExamined`, `docsExamined`, `nreturned`, `millis`, `planSummary`) and their explain plan equivalents (`totalKeysExamined`, `totalDocsExamined`, `nReturned`, `executionTimeMillis`, `executionStages.stage`) are all correct.
- The ESR rule is correctly applied: both `customerId` and `status` are equality filters, and `createdAt` is the sort key, making the index `{ customerId: 1, status: 1, createdAt: -1 }` optimal.
- The aggregation explain syntax `db.collection.explain().aggregate(pipeline)` is correct.
- The `op: "query"` filter for find operations and `op: "command"` for aggregations are both correct profiler conventions.
- The post hardcodes the collection name (`db.orders`) when replaying the aggregation from the profiler; in practice a reader would need to extract it from `slowAgg.command.aggregate`, but this is acceptable for an illustrative example.
