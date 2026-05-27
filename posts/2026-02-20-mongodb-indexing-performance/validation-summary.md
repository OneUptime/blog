# Validation Summary: How to Optimize MongoDB Query Performance with Indexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB indexes
- Compound indexes and ESR ordering
- Partial indexes
- TTL indexes
- Text indexes
- MongoDB explain plans
- MongoDB database profiler
- PyMongo
- Python datetime handling

## Sources Consulted
- MongoDB Manual: Indexes - https://www.mongodb.com/docs/manual/indexes/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: Query Optimization and ESR guideline - https://www.mongodb.com/docs/v8.2/core/query-optimization/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Text Index Properties - https://www.mongodb.com/docs/current/core/indexes/index-types/index-text/text-index-properties/
- MongoDB Manual: Text Search Result Weights - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/control-text-search-results/
- MongoDB Manual: Explain Results - https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Database Profiler - https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: Database Profiler Output - https://www.mongodb.com/docs/v7.0/reference/database-profiler/
- MongoDB Manual: Find Slow Queries with Database Profiler - https://www.mongodb.com/docs/v8.0/tutorial/find-slow-queries-with-database-profiler/
- MongoDB Manual: Limits and Thresholds - https://www.mongodb.com/docs/manual/reference/limits/
- PyMongo Collection API - https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- PyMongo Cursor API - https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html
- PyMongo Dates and Times - https://www.mongodb.com/docs/languages/python/pymongo-driver/data-formats/dates-and-times/
- Python datetime documentation - https://docs.python.org/3/library/datetime.html

## Issues Found
- The TTL insert example used `datetime.utcnow()`, which is deprecated in current Python and produces a naive datetime. Changed it to `datetime.now(timezone.utc)` and imported `timezone`, matching current Python and PyMongo guidance for UTC datetimes.
- The later `analyze_query()` example used a naive `datetime(2026, 1, 1)` after the TTL example introduced UTC timestamps. Changed it to `datetime(2026, 1, 1, tzinfo=timezone.utc)` for consistency with the updated timestamp handling.
- The profiler example queried `system.profile` for `op` values `query` and `find`, but MongoDB documents profiler `op` values such as `query` and `command`; `find` appears as a command document field, not as an `op` value. Updated the filter to include legacy query operations and modern command-based find operations.
- The compound index section said the `{created_at: ...}` query was not supported because `status` was not the prefix. MongoDB's documentation is more nuanced around prefixes and efficiency, so the wording was changed to say the query is not supported efficiently by that compound index.
- The "too many indexes" advice said collections should rarely have more than 10 indexes. That is a heuristic rather than a MongoDB rule. Replaced it with the documented 64-index collection limit and kept the warning that each index affects write performance.

## Review Notes
- The post is technically relevant and contains working PyMongo-oriented code examples after the corrections above.
- MongoDB documentation recommends MongoDB Search or Vector Search for more advanced search needs, but the text index example remains valid for self-managed text indexes.
- The `executionTimeMillis` target of under 100ms is an application-dependent heuristic, not a universal MongoDB requirement.
