# Validation Summary: How to Store and Search Vector Embeddings in Redis with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack)
- Python
- redis-py client library
- sentence-transformers (all-MiniLM-L6-v2 model)
- NumPy
- Docker (for running Redis Stack Server)

## Sources Consulted
- Redis vector similarity search documentation: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/
- redis-py official documentation and source for `redis.commands.search` module: https://redis-py.readthedocs.io/en/stable/redismodules.html
- RediSearch query syntax documentation: https://redis.io/docs/latest/develop/interact/search-and-query/query/
- sentence-transformers documentation for all-MiniLM-L6-v2 model (384-dimensional output): https://www.sbert.net/docs/pretrained_models.html
- Redis Stack Server Docker image: https://hub.docker.com/r/redis/redis-stack-server

## Issues Found
- **Unused `import struct` in KNN Search section**: The code block under "Performing KNN Search" included `import struct` which was never used anywhere in the code. Removed the unused import to avoid confusing readers.

## Review Notes
- The `decode_responses=False` setting on the Redis client is correctly used and important — without it, binary vector data would be incorrectly decoded as strings.
- The embedding dimension (384) correctly matches the output of the `all-MiniLM-L6-v2` model.
- The f-string double-brace escaping `{{sci-fi}}` in the hybrid search example correctly produces the RediSearch tag filter syntax `{sci-fi}`.
- The `.dialect(2)` call is correctly included on all queries, as dialect 2+ is required for vector search syntax.
- HNSW parameter values (M=16, EF_CONSTRUCTION=200) are reasonable defaults for production use.
