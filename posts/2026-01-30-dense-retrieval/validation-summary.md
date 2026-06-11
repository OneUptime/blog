# Validation Summary: How to Build Dense Retrieval

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Dense retrieval and Retrieval-Augmented Generation (RAG)
- Python
- Sentence Transformers
- Cross-encoder re-ranking
- FAISS vector indexes, including Flat, HNSW, IVF, and IVF-PQ
- OpenAI text embeddings
- Voyage AI embeddings
- BM25 with rank-bm25
- Retrieval evaluation metrics: precision@k, recall@k, MRR, and NDCG

## Sources Consulted
- Sentence Transformers documentation: https://www.sbert.net/docs/package_reference/sentence_transformer/model.html
- Sentence Transformers semantic search documentation: https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html
- FAISS documentation: https://faiss.ai/index.html
- FAISS index documentation: https://github.com/facebookresearch/faiss/wiki/Faiss-indexes
- FAISS IndexHNSWFlat API documentation: https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexHNSWFlat.html
- FAISS IndexIVFFlat API documentation: https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexIVFFlat.html
- FAISS IndexIVFPQ API documentation: https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexIVFPQ.html
- FAISS IndexIDMap API documentation: https://faiss.ai/cpp_api/file/IndexIDMap_8h.html
- OpenAI embeddings documentation: https://developers.openai.com/api/docs/guides/embeddings
- Voyage AI voyage-large-2-instruct announcement/specification: https://blog.voyageai.com/2024/05/05/voyage-large-2-instruct-instruction-tuned-and-rank-1-on-mteb/
- rank-bm25 documentation: https://github.com/dorianbrown/rank_bm25
- Hugging Face model card for sentence-transformers/all-MiniLM-L6-v2: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- BAAI BGE model listing: https://bge.baai.ac.cn/

## Issues Found
- FAISS HNSW, IVF, and IVF-PQ examples normalized embeddings for cosine-style retrieval but omitted `faiss.METRIC_INNER_PRODUCT` in constructors that default to L2 distance. Updated the constructors to use inner product consistently with `IndexFlatIP` and normalized embeddings.
- IVF and IVF-PQ examples described searching relevant clusters but left `nprobe` at FAISS's default of 1. Added `index.nprobe = 10` to make the example match the stated trade-off more clearly.
- The `add_with_ids` example called `add_with_ids` directly on indexes that may not support custom IDs. Updated it to wrap the index in `faiss.IndexIDMap` and cast IDs to `np.int64`.
- The complete retriever snippet used `faiss.write_index` and `faiss.read_index` without importing `faiss` in that snippet. Added the missing import.
- The score threshold check treated `0` as equivalent to no threshold. Updated it to check `score_threshold is not None`.
- The cached encoder accepted `cache_size` but hard-coded `@lru_cache(maxsize=10000)`. Updated the implementation so the provided `cache_size` controls the LRU cache.
- The batched retrieval example encoded queries one at a time, which contradicted the batching guidance. Updated it to call `SentenceTransformer.encode` once with the list of query texts while preserving the asymmetric query prefix when present.

## Review Notes
All Python code blocks parse successfully with `python3` after the edits. FAISS is not installed in the local review environment, so FAISS runtime execution was not performed; the FAISS changes were checked against the official FAISS API documentation. The examples remain illustrative and would still need production hardening for empty calibration sets, persistence of cached query encoders, and model-specific prompt handling beyond the simple BGE-style prefix shown in the post.
