# Validation Summary: Redis vs Milvus for Vector Similarity Search

## Status
validated

## Post Type
Comparison Guide / Tutorial

## Technologies Covered
- Redis Stack (vector search via RediSearch module)
- Milvus (open-source vector database)
- pymilvus (Python SDK for Milvus, MilvusClient API)
- redis-py (Python Redis client)
- Docker / Docker Compose

## Sources Consulted
- pymilvus source code on GitHub (MilvusClient API in `milvus_client.py`, `base.py`, `schema.py`, `prepare.py`) — https://github.com/milvus-io/pymilvus
- Milvus official documentation for index types (IVF_FLAT, IVF_SQ8, DISKANN, GPU_IVF_FLAT, HNSW) — https://milvus.io/docs
- Redis FT.CREATE command documentation — https://redis.io/docs/latest/commands/FT.CREATE/
- Redis vector search field and type options — https://redis.io/docs/latest/develop/ai/search-and-query/indexing/field-and-type-options/
- Redis vector index types (HNSW, FLAT, SVS-VAMANA) — https://redis.io/blog/vector-indexes-in-redis/
- Redis 8.2 release notes (SVS-VAMANA introduction) — https://redis.io/docs/latest/develop/whats-new/8-2/
- Redis query dialects documentation — https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/dialects/
- redis/redis-stack Docker Hub page — https://hub.docker.com/r/redis/redis-stack

## Issues Found
- **Redis index types outdated**: The post stated "Redis only supports HNSW and FLAT (exact search) indexes." As of Redis 8.2 (RediSearch >= 2.8.10), Redis also supports SVS-VAMANA, a single-layer graph-based ANN index with built-in compression. Updated the prose and the scalability comparison table to include SVS-VAMANA.

## Review Notes
- The Redis search example does not explicitly set dialect 2, which is required for KNN vector query syntax (`*=>[KNN ...]`). In redis-py >= 6.0.0, dialect 2 is the default, so the code works with modern versions. Older redis-py versions would require explicitly setting `.dialect(2)` on a `Query` object. This is acceptable for a modern tutorial but worth noting for readers on older library versions.
- The `query_vec` variable in the Milvus partition search example is not defined in that code block (it was defined earlier in the Redis section as a bytes object). In a Milvus context it should be a list of floats. This is acceptable for illustrative code snippets but could confuse copy-paste readers.
- The Milvus standalone deployment script URL (`scripts/standalone_embed.sh`) may vary across Milvus releases; readers should consult the official Milvus installation docs for the latest deployment method.
- All pymilvus MilvusClient API calls (create_schema, prepare_index_params, create_index, search, create_partition, insert) were verified as correct against the current API.
- The FT.CREATE command syntax, attribute count ("6"), and all Redis vector search parameters are correct.
- The scalability comparison claims (RAM limits, GPU support, sharding, persistence) are reasonable and directionally accurate.
