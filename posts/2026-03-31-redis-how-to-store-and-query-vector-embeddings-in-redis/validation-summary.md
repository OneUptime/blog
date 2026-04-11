# Validation Summary: How to Store and Query Vector Embeddings in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (redis/redis-stack-server)
- RediSearch vector search (FT.CREATE, FT.SEARCH with KNN)
- Python redis-py (4.x+)
- OpenAI Embeddings API (text-embedding-3-small, 1536 dimensions)
- Sentence Transformers (all-MiniLM-L6-v2, 384 dimensions)
- HNSW approximate nearest-neighbor indexing
- Docker

## Sources Consulted
- Redis vector search documentation: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/
- Redis FT.CREATE command reference: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH command reference: https://redis.io/docs/latest/commands/ft.search/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/redismodules.html
- OpenAI Embeddings API reference: https://platform.openai.com/docs/guides/embeddings
- Sentence Transformers documentation: https://www.sbert.net/docs/package_reference/SentenceTransformer.html

## Issues Found

1. **Filtered vector search used a field not in the index schema**: The filtered search section used `@category:{technology}` as a pre-filter, but the `category` field was never defined in the `FT.CREATE` index schema. Without a `category TAG` field in the index, the filter would not match any documents. Fixed by adding a separate `FT.CREATE idx:docs_filtered` command that includes `category TAG` in the schema, and updated the `FT.SEARCH` command and Python code to reference the new index name `idx:docs_filtered`.

## Review Notes
- The `import numpy as np` in the first Python code block (OpenAI section) is unused since `embed_to_bytes` uses `struct.pack` instead. This is a minor code quality issue but does not affect functionality.
- The `text-embedding-3-small` model correctly produces 1536-dimensional vectors by default. The `all-MiniLM-L6-v2` model correctly produces 384-dimensional vectors.
- The KNN query syntax, dialect 2 usage, and binary vector parameter passing are all correct per current Redis documentation.
- The `decode_responses=False` setting on the Redis client is correctly used since vector embeddings must be stored and queried as raw bytes.
