# Validation Summary: How to Use AlloyDB with pgvector for Vector Similarity Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- pgvector / AlloyDB `vector` extension
- AlloyDB ScaNN (`alloydb_scann`) indexes
- Vertex AI text embeddings
- PostgreSQL SQL
- Python
- psycopg2

## Sources Consulted
- Google Cloud AlloyDB documentation: Store vector embeddings - https://docs.cloud.google.com/alloydb/docs/ai/store-embeddings
- Google Cloud AlloyDB documentation: Create a ScaNN index - https://docs.cloud.google.com/alloydb/docs/ai/create-scann-index
- Google Cloud AlloyDB documentation: AlloyDB ScaNN index reference - https://docs.cloud.google.com/alloydb/docs/reference/ai/scann-index-reference
- Google Cloud AlloyDB documentation: Best practices for tuning ScaNN indexes - https://docs.cloud.google.com/alloydb/docs/ai/best-practices-tuning-scann
- Google Cloud Vertex AI documentation: Text embeddings API - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- pgvector official README - https://github.com/pgvector/pgvector

## Issues Found
- The ScaNN extension setup example used `CREATE EXTENSION IF NOT EXISTS alloydb_scann;`. Updated it to `CREATE EXTENSION IF NOT EXISTS alloydb_scann CASCADE;`, matching AlloyDB documentation and ensuring the dependent `vector` extension is installed if needed.
- The Vertex AI embedding sample used `google.cloud.aiplatform.init()` and `text-embedding-004`. Updated it to the current documented `vertexai.init()` pattern, imported `TextEmbeddingInput` and `TextEmbeddingModel`, and changed the example model to `text-embedding-005`, which is a current 768-dimensional text embedding model.
- The embedding sample did not specify retrieval task types. Updated document embeddings to use `RETRIEVAL_DOCUMENT` and query embeddings to use `RETRIEVAL_QUERY`, matching Vertex AI guidance for retrieval workloads.
- The ScaNN index example used the pgvector opclass `vector_cosine_ops`, which is valid for pgvector indexes like IVFFlat but not for AlloyDB ScaNN syntax. Updated the ScaNN index to use `USING scann (embedding cosine)`.
- The ScaNN example included `max_num_levels = 2` while describing it as appropriate for most workloads. Updated the example to use the default two-level index and clarified that `max_num_levels = 2` is for three-level indexes on very large datasets.

## Review Notes
The remaining SQL examples are technically valid as illustrative prepared-query snippets, but readers running them directly in `psql` would need to replace `$1` with an actual vector literal, a prepared statement parameter, or application-bound parameter. For production filtered vector searches, additional B-tree indexes, partial indexes, partitioning, or ScaNN streaming settings may be useful depending on selectivity and recall requirements.
