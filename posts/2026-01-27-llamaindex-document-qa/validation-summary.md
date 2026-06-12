# Validation Summary: How to Build Document QA with LlamaIndex

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- LlamaIndex
- Retrieval-Augmented Generation (RAG)
- Python
- OpenAI LLMs and embeddings
- Chroma vector store
- Cohere reranking
- FastAPI
- Redis caching
- OpenTelemetry tracing

## Sources Consulted
- LlamaIndex SimpleDirectoryReader documentation: https://developers.llamaindex.ai/python/framework/module_guides/loading/simpledirectoryreader/
- LlamaIndex VectorStoreIndex documentation: https://developers.llamaindex.ai/python/framework/module_guides/indexing/vector_store_index/
- LlamaIndex DatabaseReader API reference: https://developers.llamaindex.ai/python/framework-api-reference/readers/database/
- LlamaIndex web reader API reference: https://developers.llamaindex.ai/python/framework-api-reference/readers/web/
- LlamaIndex node postprocessor documentation: https://developers.llamaindex.ai/python/framework/module_guides/querying/node_postprocessors/node_postprocessors/
- LlamaIndex retrieval evaluation documentation: https://developers.llamaindex.ai/python/examples/evaluation/retrieval/retriever_eval/
- LlamaIndex LabelledRagDataset and RagDatasetGenerator documentation: https://developers.llamaindex.ai/python/framework/module_guides/evaluating/evaluating_with_llamadatasets/
- LlamaIndex memory API reference: https://developers.llamaindex.ai/python/framework-api-reference/memory/memory/
- OpenAI model documentation: https://developers.openai.com/api/docs/models
- OpenAI embeddings documentation: https://developers.openai.com/api/docs/guides/embeddings
- Cohere rerank model documentation: https://docs.cohere.com/docs/rerank
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- OpenTelemetry Python tracing documentation: https://opentelemetry.io/docs/languages/python/instrumentation/

## Issues Found
- The installation section omitted packages required by later examples. Added `llama-index-readers-web`, `llama-index-readers-database`, `html2text`, `sqlalchemy`, `llama-index-postprocessor-cohere-rerank`, and the optional API/cache/tracing dependencies.
- The OpenAI examples used the stale `gpt-4-turbo-preview` model and comments referring to GPT-3.5. Updated examples to use a current recommended model and neutral current-model wording.
- The chunk size comment described LlamaIndex chunks as characters. Updated it to tokens, matching LlamaIndex chunking documentation.
- The `DatabaseReader` example used unsupported `text_column` and `metadata_columns` arguments. Updated it to use `metadata_cols` and `excluded_text_cols`.
- The chat engine example used deprecated `ChatMemoryBuffer` and an unused chat engine import. Updated it to use `Memory.from_defaults`.
- The Cohere rerank example called `rerank-english-v3.0` the latest model. Updated the example to use Cohere's current rerank model identifier.
- The evaluation dataset example used deprecated `DatasetGenerator` and was missing the `Dict` import. Updated it to `RagDatasetGenerator` and returned examples from the generated labelled RAG dataset.
- The FastAPI query endpoint accepted `top_k` but always used the default query engine with `top_k=5`. Updated it to create a per-request query engine when `top_k` differs from the default.
- The FastAPI async endpoint used `asyncio.get_event_loop()`. Updated it to `asyncio.get_running_loop()` inside the running event loop.

## Review Notes
All Python snippets were syntax-checked with `ast.parse`. Runtime execution was not performed because the examples depend on external services, API keys, and optional LlamaIndex integration packages.
