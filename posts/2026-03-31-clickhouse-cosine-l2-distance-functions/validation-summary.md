# Validation Summary: How to Use cosineDistance() and L2Distance() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL distance functions)
- `cosineDistance`, `L2Distance`, `L1Distance`, `LinfDistance`, `dotProduct`
- Vector similarity / ANN (approximate nearest neighbor) indexes
- Vector embeddings (text, image, TF-IDF)

## Sources Consulted
- ClickHouse Distance functions reference: https://clickhouse.com/docs/sql-reference/functions/distance-functions
- ClickHouse Array functions reference (for `dotProduct`): https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse vector similarity index docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes
- Mathematical verification of example outputs (L2=5, L1=7, Linf=4, dotProduct=32, cosineDistance bounds 0–2)

## Issues Found
1. **Incorrect ANN index trigger description.** The post stated: "When an ANN index exists, the WHERE clause on the distance function triggers index usage." This is wrong — the ClickHouse `vector_similarity` index is triggered by `ORDER BY <distance_function>(...) LIMIT N`, not by `WHERE` predicates. A `WHERE cosineDistance(...) < threshold` is applied as a post-filter and does not activate the index on its own. I rewrote this sentence to clarify that the ANN index is triggered by ORDER BY + LIMIT and the WHERE predicate acts as a post-filter.

2. **Missing ASC/DESC caveat for ANN index usage.** The Performance Comparison section did not mention that ClickHouse's vector indexes built with `L2Distance` or `cosineDistance` only accelerate `ORDER BY ... ASC` queries, while `dotProduct` indexes only accelerate `ORDER BY ... DESC` queries. I appended a one-sentence note to capture this.

## Review Notes
- All arithmetic in the examples is correct: `cosineDistance` returns 0/1/2 for same/orthogonal/opposite unit vectors; `L2Distance([0,0],[3,4])=5`; `L1Distance([1,2],[4,6])=7`; `LinfDistance([1,2],[4,6])=4`; `dotProduct([1,2,3],[4,5,6])=32`.
- Function-name casing matches ClickHouse docs exactly (`cosineDistance`, `L2Distance`, `L1Distance`, `LinfDistance`, `dotProduct`).
- The `[0, 2]` range claim for `cosineDistance` is mathematically correct (1 − cos θ where θ ∈ [0, π]). The official ClickHouse docs describe it as "one minus the cosine similarity" without stating an explicit range, so the author's framing is a valid mathematical clarification.
- The 0.3 similarity heuristic is a general rule of thumb and depends on the embedding model; acceptable as a qualitative guide.
- Future improvement: the post could reference the `vector_similarity` index type and the `hnsw` algorithm by name, and mention the `quantization` parameter, if the author wants to expand the ANN coverage.
