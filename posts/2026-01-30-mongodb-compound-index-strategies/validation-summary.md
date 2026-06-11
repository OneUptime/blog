# Validation Summary: How to Build MongoDB Compound Index Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB compound indexes
- MongoDB ESR indexing guideline
- MongoDB multikey indexes
- MongoDB index intersection
- MongoDB explain plans
- MongoDB covered queries
- MongoDB partial indexes

## Sources Consulted
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: The ESR (Equality, Sort, Range) Guideline - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB Manual: Use Indexes to Sort Query Results - https://www.mongodb.com/docs/manual/tutorial/sort-results-with-indexes/
- MongoDB Manual: Multikey Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- MongoDB Manual: Query Optimization and Covered Queries - https://www.mongodb.com/docs/manual/core/query-optimization/
- MongoDB Manual: Index Builds on Populated Collections - https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: db.collection.reIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.reindex/

## Issues Found
- The post described `$in` as a range condition in the ESR table and debugging example. MongoDB documents more nuanced behavior: `$in` acts like equality when used alone, behaves like equality for small arrays with `.sort()`, and behaves like a range predicate for very large arrays. Updated the ESR table, added a note, and corrected the debugging example index order.
- The multikey limitation was phrased as "one array field per compound index." MongoDB's restriction is per indexed document: each indexed document can have at most one indexed field whose value is an array. Updated the explanation and summary wording.
- The index management example used `{ background: true }`. Modern MongoDB ignores the old background index build option, so the example now shows a normal `createIndex()` call.
- The partial index example used `$ne` in `partialFilterExpression`, which is not in MongoDB's supported partial index filter operators. Changed the example to an equality filter.
- The index management section presented `db.collection.reIndex()` without caveats. This method is deprecated since MongoDB 6.0, standalone-only in MongoDB 5.0 or later, and unsupported in Atlas. Added a caveat in the comment.

## Review Notes
The remaining examples are broadly accurate for current MongoDB behavior. Some explain plan stage names and nesting can vary by MongoDB version and query engine, so readers should inspect the actual plan structure rather than assuming every index name is at the same path.
