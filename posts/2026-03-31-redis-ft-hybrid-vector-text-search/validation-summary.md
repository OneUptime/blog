# Validation Summary: How to Use FT.SEARCH for Hybrid Vector and Text Search in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (vector similarity search module)
- Python redis-py client
- HNSW and FLAT vector indexing algorithms

## Sources Consulted
- Redis FT.HYBRID command docs (Redis 8.4+): https://redis.io/docs/latest/commands/ft.hybrid/
- Redis vector search documentation: https://redis.io/docs/latest/develop/ai/search-and-query/vectors/
- Redis vector search query guide: https://redis.io/docs/latest/develop/ai/search-and-query/query/vector-search/
- RediSearch 2.4 release notes (vector similarity introduction): https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisearch/redisearch-2.4-release-notes/
- Redis 8.4 hybrid search blog post: https://redis.io/blog/revamping-context-oriented-retrieval-with-hybrid-search-in-redis-84/

## Issues Found

1. **Title referenced non-existent/misleading command "FT.HYBRID"**: The title claimed the post was about using "FT.HYBRID", but `FT.HYBRID` is a command introduced only in Redis 8.4.0. The entire post content describes the pre-8.4 approach using `FT.SEARCH` with KNN + pre-filter expressions. Changed the title to "How to Use FT.SEARCH for Hybrid Vector and Text Search in Redis" to accurately reflect the content.

2. **Incorrect minimum version requirement**: The prerequisites stated "RediSearch 2.6+" but vector similarity search (including KNN queries with DIALECT 2) was introduced in RediSearch 2.4. Changed to "RediSearch 2.4+".

3. **Unused `numpy` import in Python example**: The code imported `numpy as np` but never used it (the `struct` module is used for vector encoding instead). Removed the unused import.

## Review Notes
- The `FT.HYBRID` command does exist in Redis 8.4+ with a different syntax than what this post describes. If the author wants to cover the newer Redis 8.4 `FT.HYBRID` command specifically, the post would need a significant rewrite to use the actual `FT.HYBRID` syntax. As written, the post correctly describes the `FT.SEARCH`-based hybrid search approach.
- The FT.CREATE syntax, HNSW attribute count (6 for 3 key-value pairs), KNN query syntax with pre-filters, DIALECT 2 requirement, EF_RUNTIME parameter, and Python code logic are all technically correct.
- The HNSW vs FLAT comparison and pre-filtering performance claim are accurate.
