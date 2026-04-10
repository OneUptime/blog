# Validation Summary: How to Build a Semantic Search Engine with Redis Vector Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RediSearch / Redis Stack) — vector indexing and search
- Python `redis` client library
- `sentence-transformers` library (`all-MiniLM-L6-v2` model)
- NumPy
- HNSW (Hierarchical Navigable Small World) vector index algorithm

## Sources Consulted
- Redis official documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- Redis official documentation for FT.SEARCH: https://redis.io/docs/latest/commands/ft.search/
- Redis vector search documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- SentenceTransformers documentation: https://www.sbert.net/
- all-MiniLM-L6-v2 model card (384-dimensional output): https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The `all-MiniLM-L6-v2` model produces 384-dimensional embeddings, correctly matching the `DIM 384` in the index definition.
- Using `normalize_embeddings=True` with COSINE distance metric is a valid and common practice. Pre-normalizing vectors makes cosine distance equivalent to inner product distance, but the COSINE metric still produces correct results.
- The `execute_command` approach for FT.SEARCH is a low-level but fully functional method. The modern `redis-py` library also offers a higher-level search interface via `redis.commands.search`, but the approach shown is correct and arguably more instructive for understanding the protocol.
- The `.astype(np.float32)` call in the `embed` function is technically redundant since SentenceTransformer already returns float32, but serves as a safe explicit cast and does no harm.
- The default ascending sort order for `SORTBY score` is correct for COSINE distance, where lower values indicate greater similarity (0 = identical, up to 2 = maximally dissimilar).
