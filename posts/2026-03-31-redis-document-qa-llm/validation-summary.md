# Validation Summary: How to Build a Document Q&A System with Redis and LLMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack for vector search)
- Python (`redis` client library)
- `sentence-transformers` (`all-MiniLM-L6-v2` model, 384 dimensions)
- OpenAI API (`gpt-4o-mini` via `openai` Python SDK v1+)
- `pypdf` for PDF text extraction
- NumPy for vector serialization
- HNSW approximate nearest neighbor search with COSINE distance

## Sources Consulted
- Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis vector search query syntax and dialect 2: https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- sentence-transformers documentation and model card for all-MiniLM-L6-v2: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- OpenAI Python SDK v1 API reference: https://platform.openai.com/docs/api-reference/chat/create
- pypdf documentation: https://pypdf.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- The tag filter query `(@doc_name:{value})` does not escape special characters in `doc_name`. For the example value `annual_report_2025` this works fine, but values containing spaces, hyphens, or other RediSearch special characters would need escaping in production use.
- The `hashlib.md5` usage for chunk IDs is fine for content-addressed keying but is not cryptographically secure — acceptable here since it is only used for generating unique Redis keys, not for security.
- The summary claim that "retrieval latency under 10ms even for large document collections" is reasonable for in-memory HNSW search but is not qualified with specific collection sizes or hardware requirements.
