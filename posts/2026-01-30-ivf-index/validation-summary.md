# Validation Summary: How to Build IVF Index

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Python
- NumPy
- FAISS
- Inverted File (IVF) indexes
- k-means clustering
- Product Quantization (PQ)
- Approximate nearest neighbor search

## Sources Consulted
- FAISS wiki: Faiss indexes - https://github.com/facebookresearch/faiss/wiki/Faiss-indexes
- FAISS C++ API: `faiss::IndexIVF` - https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexIVF.html
- FAISS C++ API: `faiss::IndexIVFPQ` - https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexIVFPQ.html
- FAISS wiki: FAQ / `nprobe` and `IndexIVFPQ` accuracy - https://github.com/facebookresearch/faiss/wiki/FAQ
- FAISS wiki: Guidelines to choose an index - https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index
- FAISS wiki: Getting started - https://github.com/facebookresearch/faiss/wiki/Getting-started
- NumPy documentation: `numpy.random.choice` - https://numpy.org/doc/stable/reference/random/generated/numpy.random.choice.html

## Issues Found
- The first k-means snippet imported `faiss` even though the implementation did not use FAISS. Removed the unused import and adjusted the surrounding wording so it no longer describes the naive NumPy implementation as production-ready.
- The k-means++ initializer divided by `distances.sum()` without handling duplicate or identical vectors, which can produce invalid probabilities. Added a zero-distance fallback.
- The inverted-list snippet used `List` without importing it and imported `defaultdict` without using it. Added the missing import and removed the unused import.
- Repeated calls to `IVFIndex.add()` could fail after vectors were converted from lists to NumPy arrays. Updated the storage logic so additional batches can be appended safely.
- The search snippet was shown separately from the `IVFIndex` class without saying where it belongs. Clarified that it should be added to `IVFIndex`.
- `calculate_optimal_clusters()` could return zero clusters for very small inputs or accept invalid sizes. Added input validation and a minimum return value of one cluster.
- The hierarchical k-means helper used floor division for per-branch centroids, which could return fewer centroids than requested. Changed it to use ceiling division and removed an unused variable.
- The balanced clustering helper updated only cluster-size counters, not the returned assignments. Updated the assignment array and recomputed centroids after rebalancing moves.
- The PQ implementation always stored codes as `uint8`, which is only valid for up to 8 bits per subquantizer. Added a `uint16` path for 9-16 bits and updated memory accounting.
- The memory table understated IVF flat storage when IDs are included and understated PQ32x4 with 64-bit IDs. Updated the table label and values.
- The FAISS example trained 4096 IVF clusters on only 100,000 vectors, below the article's own 30 * n_clusters guideline. Updated the sample size calculation to respect that lower bound when enough vectors are available.
- The best-practice expression `dimension / 8` would produce a float in Python. Changed it to `dimension // 8`.

## Review Notes
The FAISS production example uses current FAISS APIs for `IndexFlatL2`, `IndexIVFPQ`, `train`, `add`, `search`, and `nprobe`. FAISS was not installed in the local environment, so the FAISS snippet was syntax-checked but not executed. The NumPy examples were syntax-checked and tested with small in-memory datasets.
