# Validation Summary: How to Build Milvus Integration

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Milvus
- PyMilvus 2.4.x
- Vector databases
- Vector indexing and similarity search
- Scalar filtering and JSON fields
- Sparse vectors and hybrid search
- Python

## Sources Consulted
- Milvus PyMilvus 2.4.x `Collection.create_index()` API reference: https://milvus.io/api-reference/pymilvus/v2.4.x/ORM/Collection/create_index.md
- Milvus PyMilvus 2.4.x `Collection.search()` API reference: https://milvus.io/api-reference/pymilvus/v2.4.x/ORM/Collection/search.md
- Milvus PyMilvus 2.4.x `Collection.hybrid_search()` API reference: https://milvus.io/api-reference/pymilvus/v2.4.x/ORM/Collection/hybrid_search.md
- Milvus PyMilvus 2.4.x `CollectionSchema` API reference: https://milvus.io/api-reference/pymilvus/v2.4.x/ORM/CollectionSchema/CollectionSchema.md
- Milvus PyMilvus 2.4.x `FieldSchema` API reference: https://milvus.io/api-reference/pymilvus/v2.4.x/ORM/FieldSchema/FieldSchema.md
- Milvus 2.4.x sparse vector documentation: https://milvus.io/docs/v2.4.x/sparse_vector.md
- Milvus 2.4.x hybrid search documentation: https://milvus.io/docs/v2.4.x/hybrid_search_with_milvus.md
- Milvus similarity metrics documentation: https://milvus.io/docs/metric.md
- Milvus string field documentation: https://milvus.io/docs/string.md
- Milvus load and release documentation: https://milvus.io/docs/load-and-release.md
- Milvus 2.4.x release notes: https://milvus.io/docs/v2.4.x/release_notes.md

## Issues Found
- The search examples converted Milvus COSINE results with `1 - hit.distance`. Milvus documents COSINE as cosine similarity where larger values indicate greater similarity, and PyMilvus exposes the returned value as `distance`/`score`. Updated the examples to use `hit.distance` directly as the score.
- The hybrid search example used `ranker=ranker`, but the PyMilvus 2.4.x ORM `Collection.hybrid_search()` parameter is named `rerank`. Updated the call to `rerank=ranker`.
- The sparse vector search request omitted sparse search parameters. Updated the sparse request to include `params: {"drop_ratio_search": 0.2}`, matching Milvus 2.4.x sparse vector examples.

## Review Notes
The post uses the legacy PyMilvus ORM style, which is still documented for PyMilvus 2.4.x. Current Milvus documentation increasingly emphasizes the `MilvusClient` API, so a future modernization pass could update examples to that style, but the reviewed ORM examples are valid for the version discussed.
