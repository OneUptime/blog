# Validation Summary: How to Build a Recommendation Engine with Redis Vector Similarity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack for vector similarity)
- Python `redis` client library
- `sentence-transformers` library (model: `all-MiniLM-L6-v2`)
- NumPy
- HNSW (Hierarchical Navigable Small World) approximate nearest neighbor algorithm

## Sources Consulted
- Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis Vector Similarity Search documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- SentenceTransformers documentation and all-MiniLM-L6-v2 model card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- redis-py client documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

Verified the following specific items:
- `FT.CREATE` VECTOR HNSW syntax: `VECTOR HNSW 6` correctly specifies 6 attribute tokens (3 key-value pairs: TYPE FLOAT32, DIM 384, DISTANCE_METRIC COSINE).
- `FT.SEARCH` KNN query syntax with DIALECT 2 is correct, including the hybrid filter variant with TAG field.
- `PARAMS 2` correctly specifies 2 tokens (one name-value pair) for the vector parameter.
- `RETURN 3 name category score` correctly includes the KNN score alias.
- `SORTBY score` defaults to ASC, which is correct for distance-based ranking (lower = more similar).
- `all-MiniLM-L6-v2` outputs 384-dimensional vectors, matching the `DIM 384` index configuration.
- Cosine distance to similarity conversion (`1 - score`) is correct since RediSearch returns cosine distance, not cosine similarity.
- `normalize_embeddings=True` is compatible with COSINE distance metric.
- Result parsing loop correctly handles the FT.SEARCH response format (alternating doc IDs and field arrays starting at index 1).

## Review Notes
- The explicit `.encode()` calls on string values in `hset` mapping are redundant when `decode_responses=False` (redis-py encodes strings automatically), but this is a stylistic choice, not an error.
- Pre-normalizing embeddings with `normalize_embeddings=True` is redundant when using COSINE distance (Redis normalizes internally), but it's harmless and a common practice. Using the IP (inner product) metric with pre-normalized vectors would be slightly more efficient but functionally equivalent.
- The post requires Redis Stack (or the RediSearch module) to be installed on the Redis server, which is mentioned implicitly but could be clearer for beginners. Not a technical error.
