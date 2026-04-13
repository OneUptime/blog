# Validation Summary: How to Implement Hybrid Search Combining Text and Vector in MongoDB

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- MongoDB Atlas Search (`$search` aggregation stage)
- MongoDB Atlas Vector Search (`$vectorSearch` aggregation stage)
- MongoDB aggregation pipeline (`$unionWith`, `$setWindowFields`, `$group`, `$addFields`)
- Reciprocal Rank Fusion (RRF) algorithm
- JavaScript / Node.js (MongoDB driver)
- Python (PyMongo)

## Sources Consulted
- MongoDB Atlas Search documentation: https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB Atlas Vector Search documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/overview/
- MongoDB `$vectorSearch` aggregation stage: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB `$search` aggregation stage: https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/
- MongoDB `$unionWith` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/
- MongoDB `$setWindowFields` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$documentNumber` window function: https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/
- MongoDB `$meta` expression (`searchScore`, `vectorSearchScore`): https://www.mongodb.com/docs/atlas/atlas-search/scoring/
- Original RRF paper: Cormack, Clarke, Buettcher (2009) "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods"

## Issues Found

### 1. Critical: RRF formula used raw scores instead of ranks (both JS and Python)
**What was wrong:** The Reciprocal Rank Fusion computation used raw `searchScore` and `vectorSearchScore` values in the formula `1/(k + score)` instead of rank positions `1/(k + rank)`. RRF is defined over rank positions (1, 2, 3, ...), not relevance scores. Using scores causes an inversion: higher-scoring (more relevant) documents produce larger denominators and thus *lower* RRF contributions. With the descending sort on the final RRF value, the least relevant documents would surface first.

**Example:** With k=60, a top result (ks=10) gets contribution 0.4/70=0.00571, while a mediocre result (ks=2) gets 0.4/62=0.00645. The mediocre result incorrectly ranks higher.

**What was changed:** Added `$setWindowFields` with `$documentNumber` after each search stage to compute actual rank positions (1-based, sorted by score descending). The RRF formula now operates on these rank values. Documents not found by one search leg receive a default rank of 1000 (via `$ifNull`) so they get minimal contribution from that leg. Changed `$max` to `$min` in the `$group` stage since for ranks, lower is better.

### 2. Minor: Invalid JSON syntax with comments
**What was wrong:** The index setup code block was tagged as `json` but contained `//` comments, which are not valid JSON syntax.

**What was changed:** Split the single code block into two separate JSON code blocks, each preceded by a descriptive markdown line, removing the inline comments.

## Review Notes
- The overall architecture (using `$unionWith` to merge keyword and vector search pipelines) is sound and is a well-established pattern for hybrid search in MongoDB Atlas.
- `$setWindowFields` requires MongoDB 5.0+. Since this post targets Atlas Search and Atlas Vector Search (which are Atlas-only features), this is not a concern as Atlas runs modern MongoDB versions.
- MongoDB 7.0+ introduced a native `$rankFusion` stage that simplifies this pattern. A future update to this post could mention it as an alternative for users on newer Atlas versions.
- The weight tuning guidance is reasonable and practical.
- The `numCandidates: 100` with `limit: 20` ratio for vector search is within MongoDB's recommended range.
