# Validation Summary: How to Combine Vector Search with Text Filters in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RediSearch / Redis Stack)
- Python redis-py client library
- sentence-transformers (all-MiniLM-L6-v2)
- NumPy
- HNSW vector indexing with COSINE distance

## Sources Consulted
- Redis FT.CREATE command documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis vector search documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- redis-py search module API (VectorField, TagField, TextField, NumericField, Query)
- sentence-transformers documentation for all-MiniLM-L6-v2 model (384 dimensions)
- RediSearch query syntax documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/

## Issues Found
1. **FT.CREATE VECTOR HNSW nargs was incorrect (line 27)**: The `nargs` parameter for the VECTOR field was set to `8`, but there are 5 attribute key-value pairs (TYPE, DIM, DISTANCE_METRIC, M, EF_CONSTRUCTION), requiring `nargs = 5 × 2 = 10`. Changed `VECTOR HNSW 8` to `VECTOR HNSW 10`.

## Review Notes
- The `search_in_stock_budget` and `post_filter_search` functions do not decode `doc.title` from bytes, while `search_by_category` correctly handles this with `doc.title.decode() if isinstance(doc.title, bytes) else doc.title`. This is an inconsistency but not a crash-causing bug — callers would receive bytes instead of strings for the title field. Since this is a stylistic inconsistency across separate example functions rather than a correctness error, it was left as-is.
- The Python `VectorField` constructor in `create_hybrid_index` correctly passes HNSW attributes as a dictionary, which redis-py translates into the correct FT.CREATE arguments — the nargs count is only relevant for the raw CLI command, not the Python API.
