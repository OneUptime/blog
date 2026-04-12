# Validation Summary: How to Build a Semantic Search Application with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Vector Search
- Python (PyMongo)
- sentence-transformers (all-MiniLM-L6-v2)
- FastAPI
- Pydantic
- uvicorn

## Sources Consulted
- MongoDB $match aggregation stage documentation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/ (confirms `$text` in `$match` must be the first pipeline stage)
- MongoDB $text in the Aggregation Pipeline — https://www.mongodb.com/docs/manual/tutorial/text-search-in-aggregation/ (confirms first-stage restriction)
- MongoDB Atlas Vector Search $vectorSearch stage — https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/ (confirms `$vectorSearch` must be the first pipeline stage)
- MongoDB Atlas Hybrid Search documentation — https://www.mongodb.com/docs/atlas/atlas-vector-search/hybrid-search/vector-search-with-full-text-search/ (official hybrid search tutorial using `$rankFusion`/`$scoreFusion`)
- MongoDB $rankFusion aggregation reference — https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/
- sentence-transformers documentation — https://www.sbert.net/ (verified all-MiniLM-L6-v2 produces 384 dimensions)
- FastAPI documentation — https://fastapi.tiangolo.com/

## Issues Found

### 1. Incorrect hybrid search pipeline using `$text` after `$vectorSearch`
- **What was wrong:** The "Combining Semantic and Keyword Search" section used `$match` with `$text` as the second stage after `$vectorSearch`. This is invalid for two reasons: (1) `$text` inside a `$match` stage must be the first stage in a pipeline, and (2) `$vectorSearch` must also be the first stage. Both operators demand the first position, so they cannot coexist in the same pipeline. The code would throw a runtime error.
- **What was changed:** Replaced the incorrect pipeline with two correct approaches: (a) a simple regex-based `$match` filter for post-filtering vector results by keyword, and (b) the `$rankFusion` operator (MongoDB 8.0+) for true hybrid search that scores and merges results from both vector and full-text search pipelines.
- **Why:** The `$text` operator is also the legacy self-managed text search operator, not the Atlas Search `$search` operator. The section description mentioned `$search` but the code used `$text`, which was inconsistent. The fix uses the correct Atlas Search `$search` operator within `$rankFusion` for the full-text search leg.

## Review Notes
- The `/index` FastAPI endpoint accepts `title` and `content` as query parameters (since they are plain `str` arguments without a Pydantic body model). This works but is unconventional for a POST endpoint — a request body model would be more idiomatic. Left as-is since it is functionally correct.
- The `$rankFusion` operator requires MongoDB 8.0+ and is noted as such in the fix. For older Atlas versions, the `$unionWith` pattern combining separate `$search` and `$vectorSearch` sub-pipelines could be used instead.
- All other code examples (embedding generation, vector search index definition, `$vectorSearch` query, FastAPI backend) are technically correct and use current APIs.
