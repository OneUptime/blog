# Validation Summary: How to Use $vectorSearch in MongoDB Atlas for AI Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Vector Search (`$vectorSearch` aggregation stage)
- MongoDB Atlas Search (`$search` aggregation stage)
- OpenAI Embeddings API (`text-embedding-3-small` model)
- OpenAI Chat Completions API (`gpt-4o-mini` model)
- Node.js MongoDB driver (`mongodb` package)
- OpenAI Node.js SDK (`openai` package)

## Sources Consulted
- MongoDB Atlas Vector Search documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB Atlas Vector Search index definition: https://www.mongodb.com/docs/atlas/atlas-vector-search/create-index/
- MongoDB Atlas Vector Search vector type definition: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/
- MongoDB Atlas Vector Search scoring: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#atlas-vector-search-score
- OpenAI Embeddings API reference: https://platform.openai.com/docs/api-reference/embeddings
- OpenAI Node.js SDK documentation: https://github.com/openai/openai-node

## Issues Found
1. **Missing `price` filter field in vector index definition**: The "Pre-Filtering by Metadata" example used `price: { $lte: 1000 }` in the `$vectorSearch` filter, but the vector search index definition only declared `category` and `inStock` as filter fields. All fields used in `$vectorSearch` pre-filters must be declared with `"type": "filter"` in the index definition, or the query will fail at runtime. **Fix**: Added `{ "type": "filter", "path": "price" }` to the index definition's fields array.

2. **Inaccurate `numCandidates` recommendation**: The post recommended setting `numCandidates` to "at least 10 times `limit`" but MongoDB's official documentation examples use a 20:1 ratio (e.g., `limit: 5` with `numCandidates: 100`) and recommend starting at around 20x for good recall (90%+). **Fix**: Updated the recommendation from "10 times" to "20 times" with a note about 90%+ recall.

## Review Notes
- The "Hybrid Search" section mentions using `$unionWith` and `$group` for reciprocal rank fusion but only shows the two separate queries (vector and keyword) without the actual merging/fusion step. The individual queries are correct, but the section is incomplete as a tutorial for hybrid search. A future update could add the actual result merging code.
- Several code examples use `numCandidates` ratios below the post's own 20x recommendation (e.g., hybrid search uses 3:1, scoring uses 4:1, recommendation uses ~8:1). These are not errors since the ratio is a guideline, but they are inconsistent with the stated best practice.
- The OpenAI SDK usage (`openai.embeddings.create()` and `openai.chat.completions.create()`) is correct for the v4+ SDK.
- All `$vectorSearch` stages correctly appear as the first stage in their respective pipelines, as required by MongoDB.
- The `$meta: "vectorSearchScore"` usage is correct throughout and returns scores normalized to 0-1.
