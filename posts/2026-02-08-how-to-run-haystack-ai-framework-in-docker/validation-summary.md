# Validation Summary: How to Run Haystack AI Framework in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Python
- FastAPI
- Haystack
- Sentence Transformers
- Qdrant
- qdrant-haystack
- PDF ingestion with pypdf

## Sources Consulted
- Haystack documentation: Get Started and `haystack-ai` installation, https://docs.haystack.deepset.ai/v2.0/docs/get_started
- Haystack documentation: SentenceTransformersDocumentEmbedder, https://docs.haystack.deepset.ai/docs/sentencetransformersdocumentembedder
- Haystack documentation: SentenceTransformersTextEmbedder, https://docs.haystack.deepset.ai/docs/sentencetransformerstextembedder
- Haystack documentation: InMemoryEmbeddingRetriever, https://docs.haystack.deepset.ai/docs/inmemoryembeddingretriever
- Haystack documentation: QdrantDocumentStore and `qdrant-haystack` installation, https://docs.haystack.deepset.ai/docs/qdrant-document-store
- Haystack documentation: PyPDFToDocument, https://docs.haystack.deepset.ai/docs/pypdftodocument
- Qdrant documentation: Docker and Docker Compose installation, https://qdrant.tech/documentation/installation/
- Qdrant documentation: monitoring and `/healthz`, `/livez`, `/readyz` endpoints, https://qdrant.tech/documentation/ops-monitoring/monitoring/
- Docker documentation: Compose startup order and `depends_on`, https://docs.docker.com/compose/how-tos/startup-order/
- Docker documentation: Compose top-level `version` element is obsolete, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: `docker build` and `docker run`, https://docs.docker.com/build/ and https://docs.docker.com/engine/reference/run/
- FastAPI documentation: installation with `fastapi[standard]`, https://fastapi.tiangolo.com/

## Issues Found
- The in-memory FastAPI example created an `indexing_pipeline` and connected `embedder` to `writer`, but no `writer` component was added. This would fail at application import time. Removed the unused indexing pipeline block because the code already embeds documents and writes them directly to the document store.
- The in-memory example imported `PromptBuilder`, `HuggingFaceLocalGenerator`, and `HTTPException` but did not use them. Removed those imports so the sample matches the code being demonstrated.
- The in-memory document store did not explicitly set an embedding similarity function. Added `embedding_similarity_function="cosine"` to align with Haystack's embedding retrieval guidance.
- The Docker Compose snippet used the obsolete top-level `version` property. Removed it to match the current Compose Specification.
- The Qdrant service healthcheck used `curl` inside the `qdrant/qdrant` image. The official Qdrant Dockerfile installs only minimal runtime packages and does not install `curl`, so this healthcheck is not reliable. Removed the healthcheck and changed `depends_on` to the standard service dependency list.
- The monitoring section called `curl http://localhost:8000/health`, but the Qdrant-backed FastAPI app did not define `/health`. Added a `/health` endpoint that returns the app status and document count.

## Review Notes
- The examples are technically valid as semantic search APIs. They retrieve relevant documents and return context, but they do not include a full LLM generation step despite the broader RAG framing.
- For a production deployment, pinning Python package versions and the Qdrant image tag would improve reproducibility.
