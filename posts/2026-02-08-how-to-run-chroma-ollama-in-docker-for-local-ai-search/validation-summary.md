# Validation Summary: How to Run Chroma + Ollama in Docker for Local AI Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Chroma
- Ollama
- Python
- REST APIs
- Vector search
- Retrieval-Augmented Generation

## Sources Consulted
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Ollama Docs, Docker: https://docs.ollama.com/docker
- Ollama Docs, Generate embeddings API: https://docs.ollama.com/api/embed
- Ollama Docs, Generate response API: https://docs.ollama.com/api/generate
- Ollama Docs, Embeddings capability: https://docs.ollama.com/capabilities/embeddings
- Ollama Library, nomic-embed-text: https://ollama.com/library/nomic-embed-text
- Chroma Docs, Python client reference: https://docs.trychroma.com/reference/python/client
- Chroma Docs, Python collection reference: https://docs.trychroma.com/reference/python/collection
- Chroma Docs, Configure collections: https://docs.trychroma.com/docs/collections/configure
- Chroma Docs, Adding data to collections: https://docs.trychroma.com/docs/collections/add-data
- Chroma Cookbook, Chroma-native auth: https://cookbook.chromadb.dev/security/legacy-auth/

## Issues Found
- The Docker Compose example used the obsolete top-level `version` field. Removed it because current Docker Compose uses the Compose Specification and warns that `version` is obsolete.
- The Chroma collection example used the legacy `metadata={"hnsw:space": "cosine"}` form. Updated it to `configuration={"hnsw": {"space": "cosine"}}`, which matches current Chroma collection configuration docs.
- The Ollama examples used the superseded `/api/embeddings` endpoint with `prompt` and parsed `embedding`. Updated the examples to use `/api/embed` with `input` and parse `embeddings[0]`.
- The prose describing the Ollama embedding response still described a single top-level array. Updated it to describe the current `embeddings` response field.
- The production section referenced `CHROMA_SERVER_AUTH_CREDENTIALS`, which is not the documented Chroma token auth variable. Corrected it to `CHROMA_SERVER_AUTHN_CREDENTIALS`.

## Review Notes
The post remains a valid local AI search tutorial. The Chroma auth snippet is only a minimal production pointer; a complete production setup should also configure client authentication headers and secret management.
