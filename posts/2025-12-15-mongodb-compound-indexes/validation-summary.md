# Validation Summary: How to Use MongoDB Compound Indexes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB compound indexes
- MongoDB query optimization
- MongoDB geospatial 2dsphere indexes
- MongoDB covered queries
- MongoDB index intersection
- mongosh JavaScript examples

## Sources Consulted
- MongoDB Manual: The ESR (Equality, Sort, Range) Guideline - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: Use Indexes to Sort Query Results - https://www.mongodb.com/docs/manual/tutorial/sort-results-with-indexes/
- MongoDB Manual: Query Optimization and Covered Queries - https://www.mongodb.com/docs/manual/core/query-optimization/
- MongoDB Manual: 2dsphere Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- MongoDB Manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Manual: db.collection.getIndexes() - https://www.mongodb.com/docs/manual/reference/method/db.collection.getindexes/
- MongoDB Manual: Unique Indexes - https://www.mongodb.com/docs/manual/core/index-unique/

## Issues Found
- The ESR section listed `$in` as a range operator without qualification. MongoDB documents `$in` as equality-like in some cases and range-like for large lists when used with `.sort()`, so the text was updated to reflect that nuance.
- The e-commerce catalog index placed `price` before `popularityScore`, which prevents efficient sorting by `popularityScore` when `price` is a range field and is also inefficient for the category/brand popularity sort because there is no equality condition on `price`. The index was changed to place `popularityScore` before `price`, matching the ESR guidance for the shown queries.
- The redundant-index helper could flag indexes that are not safely redundant because of index options such as `unique`, `sparse`, `partialFilterExpression`, `expireAfterSeconds`, `collation`, or `hidden`. The script now skips those special indexes before comparing prefixes.

## Review Notes
The examples are written for mongosh and use current MongoDB shell methods. Some index choices remain workload-dependent; the post correctly recommends validating with `explain()` before relying on an index design.
