# Validation Summary: How to Read the queryPlanner Output in MongoDB explain()

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MongoDB (query planner, explain output)
- MongoDB Shell (mongosh) commands
- MongoDB indexing and query optimization

## Sources Consulted
- MongoDB official documentation: db.collection.explain() — https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB official documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: Query Plans — https://www.mongodb.com/docs/manual/core/query-plans/
- MongoDB official documentation: planCacheSetFilter — https://www.mongodb.com/docs/manual/reference/command/planCacheSetFilter/
- MongoDB official documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query

## Issues Found

1. **FETCH stage description used "RIDs" instead of "record IDs"**: The FETCH stage was described as retrieving documents "using RIDs from index." MongoDB uses the term "RecordId" internally, not "RID" which is relational database terminology. Changed to "using record IDs from index."

2. **SORT_MERGE description was misleading**: The description said "merge sorted streams (compound index or multi-key)." SORT_MERGE is actually used for merging results from multiple index scans, typically in `$or` queries or index intersection scenarios — not for compound indexes. Changed to "merge sorted streams from multiple index scans ($or or index intersection)."

3. **SKIP stage described as "skip rows"**: MongoDB uses document-oriented terminology, not relational "rows." Changed to "skip documents."

4. **Nested plan tree step numbering was incorrect**: The example had 3 stages (IXSCAN, FETCH, LIMIT) but numbered them as Steps 2, 3, and 4 — implying a missing Step 1. Corrected to Steps 1, 2, and 3.

## Review Notes
- The post covers the classic query planner output (plannerVersion 1). MongoDB 7.0+ introduces the Slot-Based Execution (SBE) engine with plannerVersion 2, which may produce slightly different output structures. This is not incorrect for the current content but could be noted in a future update.
- The sample `rejectedPlans` showing a COLLSCAN is plausible but somewhat unusual — in practice, COLLSCAN is more commonly the fallback when no indexes exist, rather than a rejected alternative competing against an index scan. This is not technically wrong since the planner can consider collection scans as candidates during multi-planning.
