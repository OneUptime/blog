# Validation Summary: How to Build Embedding Generation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Text embeddings and semantic search
- Retrieval Augmented Generation (RAG)
- OpenAI Embeddings API and Chat Completions API
- Python, aiohttp, NumPy, scikit-learn, tiktoken, sentence-transformers
- TypeScript, Node.js, Express, OpenAI JavaScript SDK
- PostgreSQL with pgvector and psycopg2
- Vector databases including Pinecone, Weaviate, Qdrant, ChromaDB, and FAISS

## Sources Consulted
- OpenAI Vector embeddings guide: https://developers.openai.com/api/docs/guides/embeddings
- OpenAI Create embeddings API reference: https://developers.openai.com/api/reference/resources/embeddings/methods/create
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI tiktoken guide: https://developers.openai.com/cookbook/examples/how_to_count_tokens_with_tiktoken
- Cohere Embed model documentation: https://docs.cohere.com/docs/cohere-embed
- sentence-transformers/all-MiniLM-L6-v2 model card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- BAAI/bge-large-en-v1.5 model card: https://huggingface.co/BAAI/bge-large-en-v1.5
- pgvector Python documentation: https://github.com/pgvector/pgvector-python
- pgvector PostgreSQL extension documentation: https://github.com/pgvector/pgvector

## Issues Found
- OpenAI embedding model context lengths were listed as 8191 tokens. Updated them to 8192 tokens to match current OpenAI documentation.
- The input validation helper defaulted to 8191 tokens. Updated it to 8192 tokens for consistency with the OpenAI embedding model limit.
- The Python and TypeScript chunking helpers could fail or loop incorrectly when overlap values were greater than or equal to the chunk size, or when chunk sizes were non-positive. Added validation guards for those parameters.
- The async batch processor claimed retry and token tracking support, but `_embed_batch` did not retry failures and `total_tokens` was never updated. Added retry logic and token accounting from the embeddings API response.
- The pgvector psycopg2 example inserted raw Python lists and dictionaries without registering pgvector adapters or wrapping JSONB values. Added `register_vector`, NumPy array conversion for vectors, and `Json(...)` adaptation for metadata.
- The RAG Chat Completions example used `max_tokens`, which is now deprecated in favor of `max_completion_tokens` for Chat Completions. Updated the request parameter.

## Review Notes
Python snippets were parsed with `ast`, TypeScript snippets were checked with TypeScript 5.9 transpilation, and the related OneUptime links returned HTTP 200. The examples remain illustrative and still require installed dependencies and configured API/database credentials to run end to end.
