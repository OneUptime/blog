# Validation Summary: How to Run Pinecone-Compatible Databases in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Compose
- Qdrant
- Weaviate
- Pinecone
- Python
- sentence-transformers
- Vector similarity search and metadata filtering

## Sources Consulted
- Qdrant installation documentation: https://qdrant.tech/documentation/installation/
- Qdrant points documentation: https://qdrant.tech/documentation/manage-data/points/
- Qdrant query points API reference: https://api.qdrant.tech/api-reference/search/query-points/
- Qdrant client libraries documentation: https://qdrant.tech/documentation/interfaces/
- Weaviate Docker installation documentation: https://docs.weaviate.io/deploy/installation-guides/docker-installation
- Weaviate Python client documentation: https://docs.weaviate.io/weaviate/client-libraries/python
- Weaviate bring-your-own-vectors quickstart: https://docs.weaviate.io/weaviate/starter-guides/custom-vectors
- Weaviate client libraries documentation: https://docs.weaviate.io/weaviate/client-libraries
- Pinecone Python SDK documentation: https://docs.pinecone.io/reference/sdks/python/overview
- Pinecone fetch vectors API reference: https://docs.pinecone.io/reference/fetch
- Pinecone integrated embedding API reference: https://docs.pinecone.io/reference/api/latest/control-plane/create_for_model
- Pinecone SDK overview: https://docs.pinecone.io/reference/pinecone-sdks
- Pinecone pricing page: https://www.pinecone.io/pricing/

## Issues Found
- The Qdrant REST example created a 384-dimensional collection but inserted and queried 4-dimensional sample vectors. Changed the sample collection size to 4 so the cURL example works as written.
- The Qdrant REST search example used the older `/points/search` endpoint and `vector` request field. Updated it to the current `/points/query` endpoint and `query` field.
- The Qdrant Python example used `client.search(...)`, which is deprecated in favor of `client.query_points(...)`. Updated the call and result iteration to use `results.points`.
- The Weaviate Docker image was pinned to an older release. Updated it to the current documented image tag.
- The Weaviate Python example used the older `vectorizer_config=wvc.config.Configure.Vectorizer.none()` API. Updated it to the current `vector_config=wvc.config.Configure.Vectors.self_provided()` API.
- The comparison table said Pinecone has no built-in vectorizers. Updated it to note Pinecone integrated embedding.
- The comparison table had outdated SDK language coverage for Pinecone, Qdrant, and Weaviate. Updated the language lists based on official SDK/client documentation.
- The comparison table described Pinecone pricing as "per query + storage". Updated it to the current read/write units plus storage model.
- The Pinecone migration example used the deprecated `pinecone.init(...)` initialization style. Updated it to instantiate `Pinecone` and create an index client with `pc.index(name=...)`.
- The migration snippet converted Pinecone string IDs with Python's built-in `hash()`, which is process-randomized and collision-prone. Updated it to convert IDs to deterministic UUIDs with `uuid.uuid5(...)`, which Qdrant supports as point IDs.

## Review Notes
None.
