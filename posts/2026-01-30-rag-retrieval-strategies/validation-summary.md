# Validation Summary: How to Create Retrieval Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Retrieval-Augmented Generation (RAG)
- Python
- Sentence Transformers (bi-encoders, cross-encoders)
- BM25 (Okapi BM25 sparse retrieval)
- Dense vector retrieval (cosine similarity, dot product)
- HyDE (Hypothetical Document Embeddings)
- Reciprocal Rank Fusion (RRF)
- Maximal Marginal Relevance (MMR)
- ColBERT late interaction
- Information retrieval evaluation (Precision@K, Recall@K, NDCG, MRR, MAP)
- NumPy

## Sources Consulted
- Sentence Transformers documentation: https://www.sbert.net/
- Sentence Transformers model hub (verified model names: `all-MiniLM-L6-v2`, `all-mpnet-base-v2`, `multi-qa-mpnet-base-dot-v1`, `cross-encoder/ms-marco-MiniLM-L-6-v2`)
- Okapi BM25 original paper (Robertson & Walker) and Wikipedia BM25 reference
- Reciprocal Rank Fusion paper (Cormack, Clarke, Buettcher, 2009) — confirms k=60 default
- HyDE paper: "Precise Zero-Shot Dense Retrieval without Relevance Labels" (Gao et al., 2022)
- ColBERT paper (Khattab & Zaharia, 2020) — MaxSim late-interaction scoring
- MMR paper: Carbonell & Goldstein, "The Use of MMR..." (1998)
- Standard IR evaluation references for NDCG, MRR, MAP definitions

## Issues Found

1. **`DenseRetriever` constructor signature mismatch**
   - The `DenseRetriever` class in section 3 was defined with only `model_name: str` as a parameter, but later example code (sections 5 and 12) attempted to pass a pre-loaded model object via `DenseRetriever(model=bi_encoder)` and `DenseRetriever(model=self.embedding_model)`. These calls would raise a `TypeError`.
   - **Fix**: Updated `DenseRetriever.__init__` to accept an optional `model` parameter that allows passing a pre-loaded `SentenceTransformer` instance, falling back to loading from `model_name` when not provided. The example call sites now work as written.

2. **Undefined `HybridRetriever` class in `create_pipeline()` example (section 5)**
   - The example referenced `HybridRetriever(retrievers=[...], weights=[...])` which is never defined in the post. The post's actual hybrid/ensemble class is `EnsembleRetriever` (defined in section 7), and it takes a list of `(retriever, weight)` tuples, not separate `retrievers` and `weights` arguments.
   - **Fix**: Replaced the `HybridRetriever` call with `EnsembleRetriever(retrievers=[(dense_retriever, 0.6), (bm25_retriever, 0.4)])` with a comment noting the forward reference to section 7.

## Review Notes

- **BM25 formula correctness**: The BM25 IDF (`log((N - df + 0.5) / (df + 0.5) + 1)`) and scoring formula (`tf*(k1+1) / (tf + k1*(1 - b + b*dl/avgdl))`) are correct, matching Okapi BM25 with the +1 smoothing inside the log to guarantee non-negative IDF.
- **RRF rank convention**: The implementation uses 0-indexed ranks (`1/(k+rank)` with `rank` starting at 0), while the original Cormack et al. paper uses 1-indexed ranks. The difference at k=60 is negligible (1/60 vs 1/61) and the relative ordering is preserved, so this is acceptable. The inline comment correctly documents the 0-indexed convention.
- **NDCG implementation**: Correct for binary relevance. `1/log2(rank+2)` with 0-indexed rank correctly maps to `1/log2(i+1)` for 1-indexed position. IDCG correctly places all relevant docs at top positions.
- **Sentence Transformer model names**: All referenced models (`all-MiniLM-L6-v2`, `all-mpnet-base-v2`, `multi-qa-mpnet-base-dot-v1`, `cross-encoder/ms-marco-MiniLM-L-6-v2`) exist on the Hugging Face Hub and the cited embedding dimensions (384, 768) are correct.
- **Dead code in `ProductionRetriever._initial_retrieval`**: An `RRFEnsemble` is instantiated but immediately discarded in favor of `EnsembleRetriever`. This is dead code (the comment acknowledges the intent), not a technical error, so it was left in place to preserve author voice.
- **MMR `_cosine_sim` references `np`**: The `DiversityStage._cosine_sim` method uses `np.dot`/`np.linalg.norm` but `numpy` is not imported at the top of that file's example. Readers porting the snippet need to add `import numpy as np`. Common pattern in tutorial code and consistent with other snippets in the post, so left as-is.
- **`KeywordExpander.expand` lowercases the query**: This is a stylistic choice — fine for keyword expansion but could lose casing-sensitive information in some domains. Not technically wrong.
