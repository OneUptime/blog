# Validation Summary: How to Build a RAG Application Using Vertex AI RAG Engine and Vector Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI RAG Engine
- Vertex AI Vector Search
- Gemini models on Vertex AI
- Vertex AI SDK for Python
- Google Cloud Storage
- Python
- gsutil

## Sources Consulted
- Vertex AI RAG Engine create corpus sample: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-rag-create-corpus
- Vertex AI RAG Engine import files sample: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-rag-import-files
- Vertex AI RAG Engine retrieval query sample: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-rag-retrieval-query
- Vertex AI RAG Engine generate content sample: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-rag-generate-content
- Vertex AI RAG Engine API reference: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api
- Vertex AI RAG Engine supported models: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/supported-rag-models
- Vertex AI Vector Search index management: https://docs.cloud.google.com/vertex-ai/docs/vector-search/create-manage-index
- Vertex AI Vector Search input data format: https://docs.cloud.google.com/vertex-ai/docs/vector-search/format-structure
- Vertex AI Vector Search query public endpoint: https://cloud.google.com/vertex-ai/docs/vector-search/query-index-public-endpoint
- Vertex AI Vector Search update and rebuild index: https://cloud.google.com/vertex-ai/docs/vector-search/update-rebuild-index
- Vertex AI text embeddings API: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- Vertex AI model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations

## Issues Found
- The RAG Engine snippets imported `rag` from `vertexai.preview`. Updated them to `from vertexai import rag`, matching current official samples.
- The corpus creation snippet omitted the RAG embedding backend configuration shown in current samples. Added `RagVectorDbConfig` with `publishers/google/models/text-embedding-005`.
- The file import snippets passed `chunk_size` and `chunk_overlap` directly to `rag.import_files`. Updated them to use `rag.TransformationConfig(rag.ChunkingConfig(...))`, which is the current Python SDK shape.
- The retrieval query snippet used `similarity_top_k`. Updated it to `rag_retrieval_config=rag.RagRetrievalConfig(top_k=5)`.
- The RAG generation snippet configured `similarity_top_k` directly on `VertexRagStore`. Updated it to use `rag_retrieval_config=rag.RagRetrievalConfig(top_k=5)`.
- The generation snippets used retired `gemini-1.5-pro`. Updated them to `gemini-2.5-flash`, which is listed as a supported RAG Engine model.
- The Vector Search section said to upload vectors and update the index, but only showed the upload command. Added the `MatchingEngineIndex.update_embeddings()` call with a Cloud Storage directory URI.
- The Vector Search index creation snippet did not specify the batch update method. Added `index_update_method='BATCH_UPDATE'` to align with the JSONL batch upload flow used later in the post.

## Review Notes
Google has announced that the generative AI modules in the Vertex AI SDK, including `vertexai.generative_models` and `vertexai.language_models`, are deprecated and scheduled for removal after June 24, 2026. The post now avoids retired model IDs and incorrect RAG parameters, but a future update should migrate generation and embedding snippets to the Google Gen AI SDK where RAG Engine feature parity is available in official samples.
