# Validation Summary: How to Run ChromaDB in Docker for Embeddings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- ChromaDB
- Python
- ChromaDB Python client
- OpenAI Python SDK
- Retrieval-Augmented Generation (RAG)
- Vector embeddings and metadata filtering

## Sources Consulted
- Chroma Docker deployment documentation: https://docs.trychroma.com/guides/deploy/docker
- Chroma legacy token authentication documentation: https://cookbook.chromadb.dev/security/legacy-auth/
- Chroma collections and embedding-function guidance: https://github.com/chroma-core/docs/blob/main/docs/usage-guide.md
- Chroma current collection management documentation: https://docs.trychroma.com/docs/collections/manage-collections
- Chroma update/upsert documentation: https://docs.trychroma.com/docs/collections/update-data
- Chroma delete documentation: https://docs.trychroma.com/docs/collections/delete-data
- Chroma metadata filtering documentation: https://docs.trychroma.com/docs/querying-collections/metadata-filtering
- Docker Compose file/deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create

## Issues Found
- The quick-start Docker command mounted a data volume but did not enable persistence. I added `IS_PERSISTENT=TRUE` and `PERSIST_DIRECTORY=/chroma/chroma` so the mounted volume is actually used for Chroma 0.5.x persistence.
- The custom embedding example created a collection with `SentenceTransformerEmbeddingFunction` but did not show reopening it with the same embedding function. I added a `get_collection(..., embedding_function=embedding_fn)` call before querying, because older Chroma versions such as 0.5.0 require the same embedding function when retrieving a collection that was created with a custom one.
- The RAG example used older OpenAI SDK style and `max_tokens`. I updated it to instantiate `OpenAI()`, call `openai_client.chat.completions.create(...)`, use a current model string, and use `max_completion_tokens`.
- The document management example labeled `collection.update(...)` as an upsert. I changed the comment to "Update an existing document" because Chroma documents `update` and `upsert` as separate operations.
- The raw API administration `curl` examples omitted the token header even though the Compose example enables token auth. I added the `Authorization: Bearer my-secret-token` header.

## Review Notes
- The post pins `chromadb/chroma:0.5.0`, so the legacy `/api/v1/...` endpoints and legacy token-auth environment variables are appropriate for that version. Current Chroma releases use newer API paths and have changed built-in auth behavior, so this post should continue to be treated as version-specific.
- Current Chroma documentation now recommends newer collection configuration fields for recent releases, but `metadata={"hnsw:space": "cosine"}` is correct for the pinned 0.5.x-era examples.
