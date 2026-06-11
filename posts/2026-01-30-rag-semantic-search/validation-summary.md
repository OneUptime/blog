# Validation Summary: How to Build Semantic Search

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- PostgreSQL with pgvector extension
- Pinecone vector database (serverless v3 SDK)
- OpenAI embeddings API (`text-embedding-3-small`, `text-embedding-3-large`)
- OpenAI Chat Completions API (`gpt-4o-mini`) for query expansion / LLM reranking
- Sentence Transformers (`BAAI/bge-large-en-v1.5`, `all-MiniLM-L6-v2`)
- Cross-Encoder models (`cross-encoder/ms-marco-MiniLM-L-12-v2`)
- tiktoken for token counting
- psycopg2 / psycopg2.pool for PostgreSQL access
- PostgreSQL full-text search (`tsvector`, `plainto_tsquery`, `ts_rank`)
- IVFFlat and HNSW vector indexes
- Reciprocal Rank Fusion (RRF)
- IR evaluation metrics (Precision@K, Recall@K, MRR, NDCG)
- Python `concurrent.futures` for parallel indexing

## Sources Consulted
- pgvector official README — https://github.com/pgvector/pgvector (operators, index types, IVFFlat/HNSW recommended parameters, `lists` formula)
- Cohere embedding models documentation — `embed-english-v3.0` vs `embed-multilingual-v3.0`, dimensions
- OpenAI embeddings docs — `text-embedding-3-small` (1536 default) and `text-embedding-3-large` (3072 default) dimensions
- OpenAI Python SDK v1 reference (`openai.OpenAI()`, `client.embeddings.create`, `client.chat.completions.create`)
- Pinecone Python SDK v3 reference (`Pinecone`, `ServerlessSpec`, `create_index`, `Index`)
- Sentence Transformers documentation (`SentenceTransformer.encode`, `CrossEncoder.predict`, `get_sentence_embedding_dimension`)
- tiktoken docs (`encoding_for_model`)
- psycopg2 docs (`execute_values` template usage)
- PostgreSQL full-text search docs (`to_tsvector`, `plainto_tsquery`, `@@`, `ts_rank`, generated `STORED` columns)
- HuggingFace model cards for `BAAI/bge-large-en-v1.5` (1024 dims), `all-MiniLM-L6-v2` (384 dims), `cross-encoder/ms-marco-MiniLM-L-12-v2`

## Issues Found

1. **Incorrect description of Cohere `embed-english-v3.0`**
   - Was: described as "Commercial, multilingual" in the embedding models table.
   - Fixed: changed to "Commercial, English-only". The `embed-english-v3.0` model is English-only; Cohere's multilingual variant is `embed-multilingual-v3.0`. Dimension (1024) was correct.

2. **Incorrect pgvector IVFFlat `lists` formula for medium datasets**
   - Was: code comment said `lists = sqrt(num_vectors)` for medium datasets (100K - 1M vectors).
   - Fixed: changed comment to `lists = rows / 1000 (use sqrt(rows) for over 1M rows)`. Per the official pgvector README, `rows / 1000` is the recommended starting point for up to 1M rows; `sqrt(rows)` is only recommended for datasets over 1M rows. The chosen value `lists = 1000` happens to coincide with both formulas at exactly 1M rows, so the value itself is reasonable, but the comment was misleading.

## Review Notes

- All other code examples were verified as correct: OpenAI SDK v1 calls, Pinecone v3 SDK serverless API, sentence-transformers and CrossEncoder APIs, psycopg2 `execute_values` template usage, pgvector operators (`<=>` for cosine distance, `vector_cosine_ops`, `vector(1536)`), HNSW parameters (`m = 16`, `ef_construction = 64`, `ef_search = 40` are pgvector defaults), full-text search with generated `STORED` `tsvector` column, RRF formula (`1/(k + rank)`), and IR metrics (P@K, R@K, MRR, NDCG with `(2^rel - 1)/log2(i+2)`).
- The `DocumentChunker._recursive_split` method calls `_add_overlap` at every level of recursion, which can cause overlap to be applied multiple times — a minor design quirk that may inflate chunk text in deeply recursive splits, but the code still runs correctly and produces usable chunks. Not corrected because it is implementation style, not a factual technical error.
- The class name `ReciprocalsRankFusion` contains a stylistic typo (the algorithm is "Reciprocal Rank Fusion"); the math inside the class is correct. Left as-is since it is the author's chosen identifier.
- The IVFFlat `ivfflat.probes = 10` setting is on the lower end (pgvector convention is roughly `sqrt(lists)`, so for `lists = 1000` ~32 would be more typical), but 10 is a valid runtime trade-off favoring speed over recall and is not technically wrong.
- The dimensions listed for `text-embedding-3-small` (1536) and `text-embedding-3-large` (3072) are the default maximums; both models also support the `dimensions` API parameter to request shorter outputs. The post's framing as default dimensions is accurate.
