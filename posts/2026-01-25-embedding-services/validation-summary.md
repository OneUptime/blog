# Validation Summary: How to Configure Embedding Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- OpenAI Embeddings API and Python SDK
- Sentence Transformers
- PyTorch
- Redis
- FastAPI
- Pydantic
- Prometheus Python client
- asyncio
- Cohere embedding models

## Sources Consulted
- OpenAI Vector embeddings guide: https://developers.openai.com/api/docs/guides/embeddings
- OpenAI Embeddings API OpenAPI spec: https://api.openai.com/v1/embeddings
- Sentence Transformers `SentenceTransformer` API reference: https://www.sbert.net/docs/package_reference/sentence_transformer/model.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- Prometheus Python client exposition source: https://github.com/prometheus/client_python/blob/master/prometheus_client/exposition.py
- Cohere Embed models documentation: https://docs.cohere.com/docs/cohere-embed
- Cohere pricing model documentation: https://docs.cohere.com/docs/how-does-cohere-pricing-work

## Issues Found
- The local Sentence Transformers service did not honor model-pool devices like `cuda:0`, because it only moved the model when `device == "cuda"`. Changed model loading to pass `device=self.config.device` to `SentenceTransformer`, which supports CPU, CUDA, and indexed CUDA device strings.
- The FastAPI production API snippet referenced `EmbeddingCache`, `LocalEmbeddingService`, and `OpenAIEmbeddingClient` without importing them. Added imports matching the file paths used earlier in the post.
- The `/metrics` endpoint returned raw generated metrics without an explicit Prometheus content type. Updated it to return a FastAPI `Response` with `CONTENT_TYPE_LATEST`.
- The batching example used FastAPI `@app.on_event("startup")`, which FastAPI documents as deprecated in favor of lifespan handlers. Replaced it with an `asynccontextmanager` lifespan function.
- The batching example called the synchronous OpenAI embedding client directly from an async function. Wrapped that call with `asyncio.to_thread` to avoid blocking the event loop.
- The batching example referenced `app` and `openai_client` without defining or importing them. Added the required FastAPI app and client initialization, plus a readiness guard for the endpoint.

## Review Notes
All Python code blocks were syntax-checked with `python3` after edits. Pricing claims were checked against provider documentation where available; provider pricing can change, so the summary table should be revalidated before publication.
