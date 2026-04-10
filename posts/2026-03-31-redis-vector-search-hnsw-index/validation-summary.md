# Validation Summary: How to Use Vector Similarity Search in Redis with HNSW Index

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack / RediSearch module)
- RediSearch vector similarity search (FT.CREATE, FT.SEARCH)
- HNSW (Hierarchical Navigable Small World) approximate nearest neighbor algorithm
- Python (redis-py, NumPy)
- Sentence-transformers embedding models

## Sources Consulted
- Redis official documentation on vector similarity search: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/
- Redis FT.CREATE command reference: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH command reference: https://redis.io/docs/latest/commands/ft.search/
- HNSW algorithm paper and Redis HNSW implementation details

## Issues Found

### 1. Incorrect HNSW attribute count (HNSW 10 → HNSW 12)
**What was wrong:** The `FT.CREATE` command specified `VECTOR HNSW 10` but the example included 6 key-value attribute pairs (TYPE, DIM, DISTANCE_METRIC, M, EF_CONSTRUCTION, EF_RUNTIME), which equals 12 individual tokens. The `nargs` parameter must reflect the total token count.
**What was changed:** Changed `HNSW 10` to `HNSW 12` and updated the explanatory text to clarify the counting (6 key-value pairs = 12 tokens).

### 2. Wrong comment syntax in Python code block
**What was wrong:** The Python code example used `--` (SQL/Lua comment syntax) instead of `#` (Python comment syntax) on the line `-- 384-dimensional vector (e.g., from sentence-transformers)`.
**What was changed:** Replaced `--` with `#` to use correct Python comment syntax.

### 3. Incorrect IP distance sorting direction
**What was wrong:** The Inner Product (IP) distance metric section stated "Higher IP = more similar (opposite of L2/COSINE)" and "Sort DESCENDING for inner product." In RediSearch, all distance metrics — including IP — return scores where lower values indicate greater similarity. Redis internally computes `1 - IP` as the distance score, maintaining consistency with COSINE and L2.
**What was changed:** Updated the comments to explain that Redis returns `1 - IP` as the score, so lower score = more similar, and sorting should be ASC (same convention as COSINE and L2).

## Review Notes
- The `--` pseudo-comment syntax used in Redis CLI code blocks (e.g., `-- Store a simple 4-dimensional vector`) is not valid Redis syntax and would cause errors if copy-pasted directly into redis-cli. However, this is a common convention in Redis documentation and blog posts for illustrative purposes, so it was left as-is.
- The post mentions `FLOAT32` and `FLOAT64` as supported vector types. Newer versions of Redis Stack also support `BFLOAT16` and `FLOAT16`, but omitting these is not an error — the listed types are correct and most commonly used.
- The L2 distance metric section states the score is "squared Euclidean distance." Redis documentation has varied on this point across versions; some versions return actual Euclidean distance rather than squared. Users should verify behavior for their specific Redis Stack version.
- The post correctly notes that DIALECT 2 is required for vector search queries.
