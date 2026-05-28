# Validation Summary: How to Create a Vertex AI Vector Search Index for Semantic Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Vector Search
- Vertex AI Text Embeddings API
- Google Gen AI SDK for Python
- Vertex AI SDK for Python / google-cloud-aiplatform
- Cloud Storage / gsutil
- Flask

## Sources Consulted
- Google Cloud documentation: Get text embeddings: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings
- Google Cloud documentation: Text embeddings API: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- Google Cloud documentation: Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud documentation: Vector Search quickstart: https://docs.cloud.google.com/vertex-ai/docs/vector-search/quickstart
- Google Cloud documentation: Create and manage Vector Search indexes: https://docs.cloud.google.com/vertex-ai/docs/vector-search/create-manage-index
- Google Cloud documentation: Vector Search input data format and structure: https://docs.cloud.google.com/vertex-ai/docs/vector-search/format-structure
- Google Cloud documentation: Vector Search index configuration parameters: https://docs.cloud.google.com/vertex-ai/docs/vector-search/configuring-indexes
- Google Cloud documentation: Filter vector matches: https://docs.cloud.google.com/vertex-ai/docs/vector-search/filtering
- Google Cloud documentation: Update and rebuild an active index: https://docs.cloud.google.com/vertex-ai/docs/vector-search/update-rebuild-index
- Google Cloud Python client reference: MatchingEngineIndex: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.MatchingEngineIndex
- Google Cloud Python client reference: MatchingEngineIndexEndpoint: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.MatchingEngineIndexEndpoint
- Google APIs Python AI Platform source: MatchingEngineIndexEndpoint namespace classes: https://github.com/googleapis/python-aiplatform/blob/main/google/cloud/aiplatform/matching_engine/matching_engine_index_endpoint.py

## Issues Found
- The embedding examples used `vertexai.language_models`, which is deprecated and scheduled for removal after June 24, 2026. Replaced the embedding generation, query, and Flask examples with the current Google Gen AI SDK (`google-genai`) while keeping the same `text-embedding-005` model and 768-dimensional index.
- The private endpoint example used `projects/your-project-id/global/networks/your-vpc`, but the Vector Search private services access network format requires the project number in that path. Changed the placeholder to `projects/123456789012/global/networks/your-vpc`.
- The restrict metadata JSON used `allow_list`, but Vector Search JSON input uses `allow` and `deny` fields. Updated the restrict examples to use `allow`.
- The deletion update comment did not mention the documented `delete/` subdirectory layout for files containing datapoint IDs to remove. Clarified that the delete file should be uploaded under a `delete/` subdirectory and the update root should be passed to `update_embeddings`.

## Review Notes
The post is technically relevant and now matches current Google Cloud documentation. `text-embedding-005` remains supported, but Google currently recommends `gemini-embedding-001` for superior embedding quality; the post keeps `text-embedding-005` to preserve the original 768-dimensional index example.
