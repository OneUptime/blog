# Validation Summary: How to Create HNSW Index

## Status
validated

## Post Type
Technical tutorial / Guide — covers HNSW algorithm theory, parameter tuning, code examples across 6 vector databases (pgvector, FAISS, Qdrant, Pinecone, Weaviate, Milvus), memory estimation, benchmarking script, and common pitfalls.

## Technologies Covered
- HNSW (Hierarchical Navigable Small World) algorithm
- PostgreSQL with pgvector extension
- FAISS (Facebook AI Similarity Search)
- Qdrant (qdrant-client Python SDK)
- Pinecone (v3+ Python SDK)
- Weaviate (v4 Python client)
- Milvus (pymilvus)
- Python, NumPy

## Sources Consulted
- FAISS source — `IndexHNSW.h` constructor signature: https://github.com/facebookresearch/faiss/blob/main/faiss/IndexHNSW.h
- pgvector README — HNSW operators, parameter defaults: https://github.com/pgvector/pgvector
- Qdrant Query Points API docs: https://api.qdrant.tech/api-reference/search/query-points
- Qdrant 1.10 release notes (Universal Query API): https://qdrant.tech/blog/qdrant-1.10.x/
- Pinecone Python SDK reference: https://docs.pinecone.io/reference/python-sdk
- Weaviate vector index config reference: https://docs.weaviate.io/weaviate/config-refs/indexing/vector-index
- Milvus HNSW documentation: https://milvus.io/docs/hnsw.md
- HNSW arXiv preprint (Malkov & Yashunin, 1603.09320): https://arxiv.org/abs/1603.09320
- HNSW TPAMI paper: https://dl.acm.org/doi/10.1109/TPAMI.2018.2889473

## Issues Found

1. **FAISS `IndexHNSWFlat` default metric — INCORRECT**
   - The post claimed (twice) that FAISS HNSW uses inner product by default and that "inner product = cosine similarity" for normalized vectors.
   - In reality, `IndexHNSWFlat(d, M)` defaults to `METRIC_L2`, not inner product. (Constructor signature: `IndexHNSWFlat(int d, int M, MetricType metric = METRIC_L2)`.)
   - The practical result the post relies on (normalize vectors to get cosine-equivalent ranking) is still correct, but the *reason* it works is that for L2-normalized vectors, L2 distance ranking is equivalent to cosine similarity ranking (because `||a − b||² = 2 − 2⟨a,b⟩` for unit vectors), not because the metric is already inner product.
   - **Fixed**: Updated the comments in the FAISS code example (Section 4) and Pitfall 2 (Section 9) to correctly state that `IndexHNSWFlat` uses L2 by default and explain why normalization still produces cosine-equivalent rankings.

## Review Notes

- **Qdrant `recreate_collection` is deprecated** in newer qdrant-client versions; the documented replacement is `delete_collection` followed by `create_collection`. The call still works, so the example will run, but a future revision could modernize this.
- **Qdrant `client.search()` is deprecated** in favor of `client.query_points()` (the Universal Query API introduced in Qdrant 1.10). The `SearchParams(hnsw_ef=..., exact=...)` parameter names remain valid and are passed to `query_points` instead. The current example still functions but is on the deprecation path.
- **HNSW paper year**: The post says "introduced by Malkov and Yashunin in 2016." This is correct if citing the arXiv preprint (1603.09320, March 2016). The formal IEEE TPAMI publication is dated 2018 (officially appears in TPAMI 42(4), 2020 issue). The 2016 attribution is the most common in literature and is acceptable.
- **Memory formula caveat**: The estimate `num_vectors * M * 2 * 8 bytes` assumes 64-bit connection indices, which matches FAISS's storage; other implementations (e.g., hnswlib, pgvector) may use 32-bit indices, making the real graph memory roughly half. The formula is a reasonable conservative upper bound and the post notes it is approximate.
- **pgvector defaults verified correct**: `m=16`, `ef_construction=64`, `ef_search=40`, operators `vector_cosine_ops` / `vector_l2_ops` all match upstream.
- **Weaviate v4, Milvus, Pinecone v3+ code samples**: Parameter names, enums (e.g., `VectorDistances.COSINE`), and import paths all verified against current official docs.
- **Algorithmic descriptions** (multi-layer structure, greedy traversal, ef/M trade-offs) are accurate and align with the original HNSW paper.
