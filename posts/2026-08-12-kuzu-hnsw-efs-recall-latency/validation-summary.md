# Validation Summary: Kuzu HNSW Search Is Fast but Misses Neighbors: Tuning `efs` for Recall and Latency

## Status
validated

## Post Type
Technical guide and performance-tuning tutorial

## Technologies Covered
- Kuzu 0.11.3 graph database
- Kuzu `vector` extension and its disk-based HNSW index
- Cypher, prepared parameters, and projected graphs
- Python and NumPy
- Exact cosine nearest-neighbor search and recall@k measurement
- Latency-percentile and throughput benchmarking

## Sources Consulted
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu extensions overview](https://kuzudb.github.io/docs/extensions/)
- [Kuzu vector search extension](https://kuzudb.github.io/docs/extensions/vector/)
- [Kuzu array functions](https://kuzudb.github.io/docs/cypher/expressions/array-functions/)
- [Kuzu list and array data types](https://kuzudb.github.io/docs/cypher/data-types/list-and-array/)
- [Kuzu projected graphs](https://kuzudb.github.io/docs/extensions/algo/)
- [Kuzu prepared statements](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu v0.11.3 HNSW configuration source](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/include/index/hnsw_config.h)
- [Kuzu v0.11.3 vector-query implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/function/query_hnsw_index.cpp)
- [Kuzu v0.11.3 HNSW search implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/index/hnsw_index.cpp)
- [Kuzu v0.11.3 metric dispatch](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/index/hnsw_index_utils.cpp)
- [Bundled SimSIMD cosine implementation in Kuzu v0.11.3](https://github.com/kuzudb/kuzu/blob/v0.11.3/third_party/simsimd/include/spatial.h)
- [Kuzu v0.11.3 filtered-vector-search tests](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/test/test_files/filter.test)
- [NumPy `linalg.norm`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html)
- [NumPy `argsort`](https://numpy.org/doc/stable/reference/generated/numpy.argsort.html)
- [LadybugDB maintained vector search reference](https://docs.ladybugdb.com/extensions/vector/)

## Issues Found
- **Redundant and inaccurately described extension loading.** The post said that Kuzu 0.11.3 still requires `LOAD vector` in each connection. Version 0.11.3 statically bundles and preloads `vector`, so neither `INSTALL` nor `LOAD` is required. Removed `LOAD vector;` and corrected the explanation.
- **Filtered-search schema mismatch.** The projected graph filtered on `n.active`, but the earlier `Document` table did not define that property, so the example failed with a binder error. Added `active BOOLEAN` to the table schema.
- **Incorrect zero-vector behavior in the exact cosine baseline.** The original NumPy code assigned negative infinity to every zero-norm comparison. Kuzu 0.11.3 instead gives two zero vectors cosine distance 0 and a zero/nonzero pair distance 1. Updated the baseline to reproduce those semantics and to reject null/non-finite data before benchmarking.
- **Recall denominator did not handle small filtered corpora.** Dividing by `k` prevents recall from reaching 1 when an identical filter leaves fewer than `k` eligible indexed embeddings. Defined the denominator as `m = min(k, eligible indexed embeddings)`, documented the empty-corpus case, and clarified that Kuzu returns up to `k` rows.
- **The `k`/`efs` explanation omitted their internal interaction.** Kuzu 0.11.3 uses `max(k, efs)` as its effective search breadth. Clarified that `efs < k` is valid but redundant and that raising `k` above `efs` also increases search effort.
- **The `dotproduct` ordering caveat was implicit.** Kuzu 0.11.3 treats the raw inner product as an ascending distance, contrary to conventional maximum-inner-product retrieval. Made the required exact-baseline ordering explicit.

## Review Notes
- The corrected schema, index creation, parameterized `QUERY_VECTOR_INDEX` call, and projected-graph query were executed successfully with the official `kuzu==0.11.3` Python package without `INSTALL` or `LOAD`.
- The documented `efc` and `efs` defaults of 200, supported metrics, output columns, prepared-parameter syntax, `FLOAT[384]` type, and `mu`/`ml`/`pu` meanings are correct for Kuzu 0.11.3. Internally, Kuzu uses `max(k, efs)` as the effective lower-layer search breadth, and `efs` must be positive.
- Kuzu 0.11.3's `dotproduct` metric treats the raw dot product as an ascending distance, unlike the common maximum-inner-product convention. The post already instructs readers to mirror the selected metric and its ordering in the exact baseline; benchmarks using `dotproduct` should preserve this version-specific behavior.
- The Kuzu repository is archived, and v0.11.3 is its final official release. The linked LadybugDB documentation describes a maintained successor whose behavior and extension distribution can change independently.
- All external links listed in the post returned HTTP 200 during validation on 2026-08-12.
