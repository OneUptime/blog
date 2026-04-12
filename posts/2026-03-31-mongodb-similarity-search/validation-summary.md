# Validation Summary: How to Implement Similarity Search with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Vector Search
- Python (pymongo)
- sentence-transformers (all-MiniLM-L6-v2)
- $vectorSearch aggregation stage
- HNSW (Hierarchical Navigable Small World) algorithm
- Atlas CLI

## Sources Consulted
- MongoDB $vectorSearch documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB Atlas Vector Search Overview: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/
- How to Index Fields for Vector Search: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/
- Atlas CLI search indexes create: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/
- MongoDB HNSW documentation: https://www.mongodb.com/resources/basics/hierarchical-navigable-small-world

## Issues Found

### 1. Missing `price` filter field in vector search index definition
**What was wrong:** The filtered similarity search code filters on the `price` field (`"price": {"$lte": max_price}`), but `price` was not declared as a `"type": "filter"` field in the vector search index definition. MongoDB requires all fields used in `$vectorSearch` filters to be indexed as filter fields in the index definition. Filtering on an un-indexed field would cause the query to fail.

**What was changed:** Added `{"type": "filter", "path": "price"}` to the `fields` array in the `vector-index.json` index definition.

### 2. Incorrect `numCandidates` recommendation in Best Practices
**What was wrong:** The best practices section recommended setting `numCandidates` to "at least 10x" the `limit`. MongoDB's official documentation recommends at least 20x the `limit` for optimal accuracy of ANN results.

**What was changed:** Updated the recommendation from "at least 10x" to "at least 20x" to align with official MongoDB documentation. Note: the code examples use 15x which is a reasonable practical choice, though below the official recommendation.

## Review Notes
- The code examples use a `numCandidates` multiplier of 15x (e.g., `top_k * 15`). While the best practices now correctly state the official 20x recommendation, the code uses 15x as a practical trade-off between recall and latency. This is acceptable but readers should be aware the official guidance is 20x.
- The `all-MiniLM-L6-v2` model produces 384-dimensional embeddings, which correctly matches the `numDimensions: 384` in the index definition.
- The best practices note about `dotProduct` only being for unit-normalized embeddings is correct. However, cosine similarity in MongoDB internally normalizes vectors, so it works with non-normalized embeddings too -- this is a subtle but correct recommendation.
- The `$vectorSearch` stage must be the first stage in an aggregation pipeline, which all code examples correctly follow.
- The `vectorSearchScore` for cosine similarity is normalized to [0, 1] by MongoDB (computed as `(1 + cosine_similarity) / 2`), so the 0.75 threshold in the thresholding example is reasonable.
