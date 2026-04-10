# Validation Summary: How to Build a Plagiarism Detection System with Redis Vectors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack for vector search)
- Python redis-py client
- sentence-transformers (all-MiniLM-L6-v2 model)
- NumPy
- HNSW (Hierarchical Navigable Small World) vector indexing

## Sources Consulted
- RediSearch Vector Search documentation: https://redis.io/docs/latest/develop/ai/search-and-query/query/vector-search/
- RediSearch FT.CREATE command reference: https://redis.io/docs/latest/commands/ft.create/
- RediSearch FT.SEARCH command reference: https://redis.io/docs/latest/commands/ft.search/
- sentence-transformers documentation: https://www.sbert.net/
- all-MiniLM-L6-v2 model card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The chunk-level plagiarism detection compares chunk embeddings against document-level embeddings (since the corpus is indexed at the document level via `embed_document`). This is a valid practical approach but could yield lower similarity scores for partial matches. A more precise system could index chunks separately with their own index. This is a design trade-off, not a technical error.
- The `all-MiniLM-L6-v2` model has a max sequence length of 256 tokens. The `embed_document` function truncates to 512 words, but the model's tokenizer will further truncate to 256 tokens internally. This is acceptable for a tutorial but worth noting for production use — longer documents may lose information beyond the token limit.
- The post correctly uses `decode_responses=False` on the Redis client, which is essential when working with binary vector data.
