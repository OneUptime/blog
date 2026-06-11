# Validation Summary: How to Build Vector Storage

## Status
validated

## Post Type
Tutorial / Guide — hands-on walkthrough for building vector storage for RAG, with multiple working Python implementations (in-memory store, IVF index, pgvector backend, FAISS HNSW, sharding, PQ, instrumentation).

## Technologies Covered
- Python 3 (numpy, dataclasses, typing)
- scikit-learn (`MiniBatchKMeans`)
- PostgreSQL + pgvector extension (ivfflat, hnsw, cosine distance operator `<=>`)
- psycopg2 / pgvector-python adapter
- FAISS (`IndexHNSWFlat`, `IndexIVFPQ`, `IndexFlatL2`)
- Approximate nearest-neighbor algorithms: Flat, IVF, HNSW, LSH, Product Quantization
- Mermaid diagrams
- Prometheus/OpenTelemetry-style metrics emission

## Sources Consulted
- FAISS wiki — MetricType and distances: https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances
- FAISS wiki — Faiss indexes: https://github.com/facebookresearch/faiss/wiki/Faiss-indexes
- FAISS C++ API — `struct faiss::IndexIVFPQ`: https://faiss.ai/cpp_api/struct/structfaiss_1_1IndexIVFPQ.html
- pgvector README (HNSW/IVFFlat syntax, distance operators): https://github.com/pgvector/pgvector
- pgvector-python README (`register_vector` for psycopg2): https://github.com/pgvector/pgvector-python
- psycopg2 docs for `execute_values`

## Issues Found

1. **`PgVectorStore.search` parameter binding bug when `filter_metadata` is provided.**
   The original built `params = [query, top_k]`, inserted the JSON filter at index 1 to get `[query, filter, top_k]`, and then called `cur.execute(sql, params[:1] + params)` which yields `[query, query, filter, top_k]`. The SQL placeholders, in order, expect `(query, filter, query, top_k)` — so the second `query` and `filter` were swapped, causing a JSON value to be bound to the `ORDER BY embedding <=> %s` slot and a vector to be bound to the `metadata @> %s` slot. With a filter applied this would fail with a type error (or in pathological cases silently misbehave). The unfiltered code path happened to work by accident.
   Fixed by building the `params` list in the exact order of the SQL placeholders for each branch (with-filter and no-filter), removing the brittle `params[:1] + params` slicing.

2. **`PgVectorStore` could not bind embeddings as `vector` through psycopg2.**
   The original code passed `embedding.tolist()` as a parameter for a `vector(N)` column. psycopg2 adapts a Python list to a Postgres array literal (e.g. `'{1.0,2.0,...}'`), and pgvector does **not** define an implicit cast from `double precision[]` to `vector` — only an explicit `::vector` cast or the `pgvector.psycopg2.register_vector` adapter will work. As written, `INSERT` and `SELECT ... <=> %s` calls would raise a type-mismatch error.
   Fixed by: (a) importing `register_vector` from `pgvector.psycopg2`, (b) calling `register_vector(self.conn)` after ensuring the extension exists, (c) passing the numpy array directly instead of `.tolist()` in `insert`, `insert_batch`, and `search`, and (d) updating the prerequisites comment to mention `pip install pgvector`.

3. **HNSW similarity comment was imprecise.**
   The `HNSWVectorStore.search` comment said "FAISS returns L2 distance" while the conversion `similarity = 1 - dist / 2` only works for **squared** L2 distance. FAISS's `METRIC_L2` returns squared L2 distances by design (per the FAISS MetricType wiki). The formula is correct, but the comment was misleading — a reader who copy-pasted the conversion expecting an L2 distance from another source would get wrong scores.
   Fixed by updating the comment to call out "squared L2 distance for METRIC_L2" and showing the derivation `||a-b||^2 = 2 - 2*cos(a,b)`.

## Review Notes
- The `ORDER BY embedding <=> %s` in the pgvector search is correctly kept as a raw operator expression (not wrapped in `1 - (...)`) so that the HNSW/IVFFlat index can be used by the planner; this was already right in the original.
- `faiss.IndexHNSWFlat(d, M)` constructor, `index.hnsw.efConstruction` / `efSearch` attribute names, `faiss.IndexIVFPQ(quantizer, d, nlist, M, nbits)` signature, pgvector's `<=>` cosine distance operator, and the `USING hnsw (... vector_cosine_ops) WITH (m, ef_construction)` syntax are all verified accurate against current upstream docs.
- The Product Quantization arithmetic checks out: 768-dim vector split into M=96 sub-vectors of 8 dims each, stored as 96 bytes vs. 3072 bytes raw → 32× reduction.
- The complexity claims in the indexing comparison table are presented as informal asymptotic shorthand (e.g. IVF as O(n/k), HNSW as O(log n), LSH as O(1)). These are standard simplifications used in the ANN literature and acceptable in a tutorial context, even though real-world behavior depends heavily on parameters and data distribution.
- `IVFIndex.search` builds `centroid_similarities = self.centroids @ query_norm` — note that `MiniBatchKMeans.cluster_centers_` are not unit-normalized even when input vectors are, so this is technically a dot product against unnormalized centroids rather than true cosine similarity. In practice it still selects the nearest clusters reasonably well for this tutorial. Not a defect worth changing, but worth flagging for production use.
- The `from psycopg2.extras import execute_values` import is used in `insert_batch`; that helper has been around since psycopg2 2.7 and is still current. (psycopg3 uses `cursor.executemany` with batched mode instead — outside the scope of this post.)
- Code samples are illustrative; none of them include retries, connection pooling, or error handling, which is appropriate for a tutorial focused on the storage layer mechanics.
