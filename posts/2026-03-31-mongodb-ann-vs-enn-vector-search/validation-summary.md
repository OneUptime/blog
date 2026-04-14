# Validation Summary: How to Choose Between ANN and ENN Search in MongoDB Atlas Vector Search

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Vector Search
- `$vectorSearch` aggregation stage
- HNSW (Hierarchical Navigable Small World) indexing algorithm
- Approximate Nearest Neighbor (ANN) search
- Exact Nearest Neighbor (ENN) search
- JavaScript (MongoDB Shell / Node.js driver)
- Python

## Sources Consulted
- [Run Vector Search Queries - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/)
- [MongoDB Vector Search Overview - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [$vectorSearch aggregation stage - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/aggregation/vectorsearch/)
- [Exact Nearest Neighbor Vector Search - MongoDB Blog](https://www.mongodb.com/blog/post/exact-nearest-neighbor-vector-search-for-precise-retrieval)
- [MongoDB Community Forum - $vectorSearch filter & numCandidates](https://www.mongodb.com/community/forums/t/vectorsearch-filter-numcandidates/321689)

## Issues Found
1. **Incorrect `numCandidates` starting point recommendation**: The post originally stated "A good starting point is `numCandidates = limit * 10`." The official MongoDB documentation recommends setting `numCandidates` to at least 20 times the `limit` value, not 10 times. For example, MongoDB docs state: "if you set limit to return 5 results, you should consider setting numCandidates to 100 as a starting point." Changed to `numCandidates = limit * 20` with a note that this follows the MongoDB documentation recommendation.

## Review Notes
- The `$vectorSearch` code examples use correct syntax and valid parameter names (`index`, `path`, `queryVector`, `numCandidates`, `limit`, `exact`, `filter`).
- The ENN example correctly omits `numCandidates` when using `exact: true`, which matches the documented behavior.
- The `filter` syntax inside `$vectorSearch` is correct. Note that only a subset of MQL operators are supported in `$vectorSearch` filters (`$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$nin`, `$and`, `$or`, `$not`, `$exists`), and fields used in filters must be indexed as `filter` type in the vector search index definition. The post does not mention this constraint, but it is not incorrect.
- The performance numbers in the comparison table are illustrative estimates, not from official benchmarks. They are directionally reasonable but should be understood as approximate.
- `numCandidates` has a maximum value of 10,000 and must be >= `limit`. The blog examples all fall within valid ranges.
- ENN search requires MongoDB v6.0.16, v7.0.10, v7.3.2, or later. The post does not mention version requirements, which could be worth noting in a future update.
