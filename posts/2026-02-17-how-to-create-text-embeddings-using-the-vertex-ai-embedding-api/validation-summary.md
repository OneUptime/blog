# Validation Summary: How to Create Text Embeddings Using the Vertex AI Embedding API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Text embeddings API
- Vertex AI SDK for Python
- Python
- NumPy
- Text embeddings
- Semantic search

## Sources Consulted
- Google Cloud Vertex AI Text embeddings API model reference: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- Google Cloud Get text embeddings guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings
- Google Cloud Choose an embeddings task type guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/task-types
- Google Cloud Generative AI on Vertex AI quotas and system limits: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/quotas
- Vertex AI Python SDK TextEmbeddingModel reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.language_models.TextEmbeddingModel
- Vertex AI Python SDK TextEmbeddingInput reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.language_models.TextEmbeddingInput

## Issues Found
- The install command only installed `google-cloud-aiplatform`, but later examples import `numpy`. Updated it to install both `google-cloud-aiplatform` and `numpy`.
- The post stated that embedding vectors are typically 768 dimensions. Updated this to clarify that `text-embedding-005` produces up to 768-dimensional embeddings, while newer models such as `gemini-embedding-001` can produce larger vectors.
- The task type list omitted current supported values. Added `QUESTION_ANSWERING`, `FACT_VERIFICATION`, and `CODE_RETRIEVAL_QUERY`.
- The large batch section mentioned batch size limits without stating the current documented online request limits. Added the documented 250 input text, 20,000 token, and 2,048 token per-input limits.
- The model selection section called `text-embedding-005` the latest and best overall model. Updated it to identify `gemini-embedding-001` as the current highest-performing embedding model, while keeping `text-embedding-005` as an English/code-specialized model.

## Review Notes
The Python examples use `vertexai.language_models.TextEmbeddingModel` and `TextEmbeddingInput`, which remain documented in the Vertex AI SDK for Python. Google also documents the newer Google Gen AI SDK path for some Vertex AI embedding workflows, so a future refresh could consider whether the blog should standardize on that SDK.
