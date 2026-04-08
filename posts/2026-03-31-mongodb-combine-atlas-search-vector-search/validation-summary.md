# Validation Summary: How to Combine Atlas Search and Vector Search in One Pipeline in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search (`$search` aggregation stage)
- MongoDB Atlas Vector Search (`$vectorSearch` aggregation stage)
- MongoDB Aggregation Pipeline (`$unionWith`, `$setWindowFields`, `$group`, `$addFields`)
- Reciprocal Rank Fusion (RRF) scoring algorithm
- Python (PyMongo)

## Sources Consulted
- MongoDB Atlas Search documentation: https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB Atlas Vector Search documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB `$unionWith` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/
- MongoDB `$setWindowFields` documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$meta` expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB hybrid search tutorial: https://www.mongodb.com/docs/atlas/atlas-vector-search/tutorials/reciprocal-rank-fusion/

## Issues Found

### 1. RRF implementation used raw scores instead of rank positions (Critical)
**What was wrong:** The RRF formula is defined as `1 / (k + rank)` where `rank` is the positional rank (1, 2, 3, ...) of each document in a result list. The original code incorrectly used the raw `searchScore` and `vectorSearchScore` values in place of rank positions: `$divide: [1, { $add: [60, score] }]`. Since search scores are not integers representing position, this would produce incorrect fusion results.

**What was changed:** Added a `$setWindowFields` stage that partitions results by their `source` field and assigns positional ranks using `$denseRank`, sorted by a unified `searchScore` field. The `$group` stage now collects rank positions instead of raw scores, and the RRF formula correctly uses `"$$r.rank"` (positional rank) instead of raw score values.

### 2. Unused weight constants (Minor)
**What was wrong:** `KEYWORD_WEIGHT` (0.5) and `VECTOR_WEIGHT` (0.5) were declared at the top of the first code example but never referenced anywhere in the pipeline.

**What was changed:** Removed the unused constant declarations to avoid confusion.

## Review Notes
- The `$vectorSearch` inside a `$unionWith` sub-pipeline is a valid pattern documented by MongoDB for hybrid search scenarios, since `$vectorSearch` is the first stage of the inner pipeline.
- The Python helper function uses a simple weighted sum approach (not RRF) which is a valid alternative. The multiplier of 10 on vector scores is arbitrary and would need tuning per use case — this is acknowledged by context but could be called out more explicitly.
- The `$setWindowFields` operator used in the fix requires MongoDB 5.0+. This is reasonable for any deployment using Atlas Search and Vector Search, which require MongoDB Atlas.
- The "Simplified Hybrid Using $project Normalization" section assumes scores have already been normalized to 0-1 range but does not show how to perform that normalization. This is noted as a simplification and is acceptable for a conceptual example.
