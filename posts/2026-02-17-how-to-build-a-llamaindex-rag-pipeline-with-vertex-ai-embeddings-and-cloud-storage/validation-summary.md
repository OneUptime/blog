# Validation Summary: How to Build a LlamaIndex RAG Pipeline with Vertex AI Embeddings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- LlamaIndex
- Google GenAI / Vertex AI
- Vertex AI text embeddings
- Gemini models
- Google Cloud Storage
- Cloud Run functions / Cloud Functions triggers
- Retrieval-Augmented Generation

## Sources Consulted
- LlamaIndex Google GenAI LLM integration: https://docs.llamaindex.ai/en/stable/examples/llm/google_genai/
- LlamaIndex Google GenAI embedding integration: https://docs.llamaindex.ai/en/stable/examples/embeddings/google_genai/
- LlamaIndex Vertex LLM API reference and deprecation notice: https://docs.llamaindex.ai/en/stable/api_reference/llms/vertex/
- LlamaIndex Vertex embedding API reference and deprecation notice: https://docs.llamaindex.ai/en/stable/api_reference/embeddings/vertex/
- LlamaIndex GCSReader API reference: https://docs.llamaindex.ai/en/stable/api_reference/readers/gcs/
- LlamaIndex vector index and document management docs: https://docs.llamaindex.ai/en/stable/module_guides/indexing/vector_store_index/
- LlamaIndex response synthesizer docs: https://docs.llamaindex.ai/en/stable/module_guides/querying/response_synthesizers/
- LlamaIndex relevancy evaluator docs: https://docs.llamaindex.ai/en/stable/examples/evaluation/relevancy_eval/
- Google Cloud Vertex AI text embeddings API: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- Google Cloud Gemini model documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/models/
- Google Cloud model versions and lifecycle: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Google Cloud Storage-triggered functions / Eventarc docs: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage

## Issues Found
- The post used the deprecated `llama-index-llms-vertex` and `llama-index-embeddings-vertex` integrations. Updated the install command and model initialization to use `llama-index-llms-google-genai`, `llama-index-embeddings-google-genai`, `GoogleGenAI`, and `GoogleGenAIEmbedding` with `vertexai_config`, matching current LlamaIndex guidance.
- The post used `gemini-1.5-pro` for generation. Updated the example to `gemini-2.5-flash`, which is a current generally available Gemini model in Vertex AI documentation.
- The post listed Python 3.9+. Updated it to Python 3.10+ to align with the current LlamaIndex package requirements.
- The GCS reader examples used `llama_index.readers.google`, `llama-index-readers-google`, `project_id`, and `load_data(blob_name=...)`. Updated them to `llama-index-readers-gcs`, `llama_index.readers.gcs.GCSReader`, and the documented `prefix` / `required_exts` parameters.
- The source-node example accessed `source_node.metadata` and `source_node.text` directly. Updated it to access `source_node.node.metadata` and `source_node.node.get_text()`, and made score formatting handle `None`.

## Review Notes
The examples were statically checked by parsing all Python code blocks after edits. Runtime calls to Vertex AI and GCS were not executed because they require project credentials, enabled APIs, and bucket data. `gemini-2.5-flash` is currently listed as a latest stable model, but Google publishes a retirement date for stable Gemini models, so this example should be rechecked before that date.
