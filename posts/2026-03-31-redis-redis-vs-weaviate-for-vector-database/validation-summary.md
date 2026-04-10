# Validation Summary: Redis vs Weaviate for Vector Database

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- Weaviate (Python client v4)
- Redis Stack (vector search via RediSearch)
- redis-py (Python client)
- OpenAI Embeddings API (text-embedding-3-small)
- NumPy

## Sources Consulted
- Weaviate Python client v4 documentation — https://weaviate.io/developers/weaviate/client-libraries/python
- Weaviate collection operations — https://weaviate.io/developers/weaviate/manage-data/collections
- Weaviate multi-tenancy docs — https://weaviate.io/developers/weaviate/concepts/data#multi-tenancy
- Weaviate hybrid search — https://weaviate.io/developers/weaviate/search/hybrid
- Weaviate generative search (RAG) — https://weaviate.io/developers/weaviate/search/generative
- redis-py vector search documentation — https://redis.io/docs/latest/develop/clients/redis-py/vecsearch/
- redis-py vector similarity examples — https://redis.readthedocs.io/en/stable/examples/search_vector_similarity_examples.html
- redis-py source (field.py) — https://github.com/redis/redis-py/blob/master/redis/commands/search/field.py
- Redis FT.SEARCH command reference — https://redis.io/docs/latest/commands/ft.search/
- Redis ACL SETUSER command reference — https://redis.io/docs/latest/commands/acl-setuser/

## Issues Found

### 1. Redis field types accessed incorrectly (Breaking)
**What was wrong:** `r.ft.TextField`, `r.ft.TagField`, `r.ft.VectorField`, and `r.ft.IndexDefinition` were used as attributes of the Redis client's `ft` namespace. These classes do not exist there.
**What was changed:** Added proper imports from `redis.commands.search.field` (for `TextField`, `TagField`, `VectorField`) and `redis.commands.search.indexDefinition` (for `IndexDefinition`, `IndexType`). Restructured index creation to pass fields as a positional tuple and added `index_type=IndexType.HASH`.

### 2. Redis KNN search used raw string instead of Query object (Breaking)
**What was wrong:** The search call passed a raw query string and used a non-existent `query_params=` keyword argument. Vector search in redis-py requires a `Query` object with `.dialect(2)` set — without dialect 2, the `=>[KNN ...]` syntax is not recognized.
**What was changed:** Replaced with a proper `Query` object from `redis.commands.search.query`, added `.sort_by("score")`, `.return_fields(...)`, and `.dialect(2)`. Parameters dict is now passed as a positional argument.

### 3. Redis CLI FT.SEARCH missing DIALECT 2 (Breaking)
**What was wrong:** The `FT.SEARCH` command in the hybrid search example was missing the mandatory `DIALECT 2` clause required for vector search KNN syntax.
**What was changed:** Added `DIALECT 2` to the FT.SEARCH command.

### 4. Weaviate tenants.create() passed plain strings (Breaking)
**What was wrong:** `articles.tenants.create(["tenant_a", "tenant_b"])` passed a list of strings. The `tenants.create()` method requires `Tenant` objects from `weaviate.classes.tenants`.
**What was changed:** Added import for `Tenant` and wrapped tenant names in `Tenant(name="...")` objects.

## Review Notes
- The Weaviate code uses `vectorizer_config=Configure.Vectorizer.text2vec_openai()`. Starting with Weaviate Python client v4.16.0, the preferred API is `vectorizer_config=Configure.NamedVectors.text2vec_openai(name="default")` for named vectors. The pattern used in the blog still works with earlier v4 client versions but may be updated in a future revision.
- The Weaviate `alpha` parameter description in the hybrid search comment (`0=BM25 only, 1=vector only`) is correct per Weaviate docs.
- The Redis ACL command syntax is correct, including the `&*` (all Pub/Sub channels) selector available since Redis 6.2.
- All OpenAI embedding API usage (`text-embedding-3-small` model, response structure) is correct and current.
