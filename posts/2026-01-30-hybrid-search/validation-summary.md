# Validation Summary: How to Create Hybrid Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Hybrid search
- PostgreSQL full-text search
- pgvector
- OpenAI embeddings
- Python
- psycopg2
- asyncpg
- Reciprocal Rank Fusion

## Sources Consulted
- OpenAI Vector embeddings guide: https://developers.openai.com/api/docs/guides/embeddings
- OpenAI Python SDK README: https://github.com/openai/openai-python
- PostgreSQL full-text search documentation: https://www.postgresql.org/docs/current/textsearch-controls.html
- pgvector README: https://github.com/pgvector/pgvector
- Python data model documentation for hash randomization: https://docs.python.org/3/reference/datamodel.html#object.__hash__
- Python PYTHONHASHSEED documentation: https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED
- asyncpg usage documentation: https://magicstack.github.io/asyncpg/current/usage.html

## Issues Found
- PostgreSQL `ts_rank_cd` was described as BM25-like. PostgreSQL documents `ts_rank_cd` as cover density ranking, not BM25, so the section title and explanation were changed to describe PostgreSQL full-text ranking accurately.
- The vector search example used older global OpenAI client configuration and `text-embedding-ada-002`. The example now uses the current explicit `OpenAI` client and `text-embedding-3-small`, which is documented as a current 1536-dimensional embedding model.
- The vector search snippet depended on imports from a previous code block. Added `psycopg2` and `RealDictCursor` imports so the snippet is complete.
- The A/B test assignment used Python's built-in `hash()` while claiming deterministic assignment. Python randomizes string hashes across interpreter runs by default, so this was changed to a stable SHA-256 hash.
- The vector index scaling diagram used overspecific complexity labels for HNSW and IVF/PQ. These were revised to describe approximate nearest-neighbor behavior without unsupported Big-O claims.
- The async implementation called an undefined `_get_embedding_async` method and did not use the OpenAI API key. Added an `AsyncOpenAI` client and implemented the async embedding method.
- The async latency claim said concurrency cuts latency roughly in half. This was softened to "can reduce latency" because actual latency depends on embedding generation and database query times.

## Review Notes
The post remains a practical tutorial, but the code examples are illustrative fragments rather than a single copy-paste runnable module. A future revision could add dependency installation instructions and a complete end-to-end sample with document ingestion and embedding backfill.
