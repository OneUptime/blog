# Validation Summary: Cosine, Dot Product, or Euclidean: How to Choose a Qdrant Distance Metric

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Qdrant vector database, including named and unnamed dense vectors
- Cosine similarity, dot product, and Euclidean distance
- Qdrant sparse-vector scoring behavior
- Python and `qdrant-client` 1.19.0
- Qdrant Query API, collection schemas, HNSW indexing, score thresholds, aliases, snapshots, and migrations
- Qdrant 1.16 insert-only upserts and Qdrant 1.18 named-vector schema changes

## Sources Consulted

- [Qdrant collections and distance metrics](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant distance metrics course](https://qdrant.tech/course/essentials/day-1/distance-metrics/)
- [Qdrant search metrics and score thresholds](https://qdrant.tech/documentation/search/)
- [Qdrant vector types and sparse-vector configuration](https://qdrant.tech/documentation/manage-data/vectors/)
- [Qdrant FAQ on Cosine normalization and stored vectors](https://qdrant.tech/documentation/faq/qdrant-fundamentals/)
- [Qdrant Python quickstart](https://qdrant.tech/documentation/quickstart/)
- [Qdrant Python client source and current method signatures](https://github.com/qdrant/qdrant-client/blob/550484d767d319857d4f46e97d4551ba419ee670/qdrant_client/qdrant_client.py)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points)
- [Qdrant data-integrity migration checks](https://qdrant.tech/documentation/migration-guidance/data-integrity/)
- [Qdrant discrepancy diagnosis guidance](https://qdrant.tech/documentation/migration-guidance/diagnosing-discrepancies/)
- [Qdrant embedding-model migration guide](https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/)
- [Qdrant collection snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant 1.18.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.18.0)
- [Qdrant Count Points API](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant filtering documentation, including `has_vector`](https://qdrant.tech/documentation/search/filtering/)

## Issues Found

- The HNSW evaluation step implied that a small collection would eventually finish building an HNSW index. A collection can remain below `indexing_threshold` and continue using exact search indefinitely. The step now distinguishes collections that cross the threshold from those that do not.
- The blue-green migration sequence backfilled the target before enabling dual writes. Writes made during that window could be absent from the target, so dual writes now begin before the backfill and both writes must be checked for success.
- The backfill guidance did not prevent stale source records from overwriting newer dual-written target points. It now recommends `models.UpdateMode.INSERT_ONLY`, available in Qdrant 1.16 and later, or equivalent conflict protection on older releases.
- The blue-green steps did not account for deletes and partial updates during backfill. The post now requires pausing them or implementing explicit reconciliation so that backfill cannot resurrect deleted points or overwrite newer state.
- The Qdrant 1.18 named-vector workflow did not explicitly start dual writes before background population. It now requires every upsert to write both vector names before the new vector is backfilled.

## Review Notes

- Both Python examples use current, non-deprecated APIs. The disposable-collection example was executed successfully with `qdrant-client` 1.19.0, and the returned ranking and score direction matched the post.
- Cosine normalization, Dot/Cosine ranking equivalence conditions, Euclidean score ordering, metric-dependent `score_threshold` behavior, sparse-vector Dot scoring, and the Qdrant 1.18 named-vector schema APIs were verified.
- All six links in the post's Official Documentation section resolve to the intended Qdrant resources.
- Qdrant's `points_count` and `indexed_vectors_count` collection-info fields are approximate. Implementations of the post's exact-count validation step should use the Count API and, when validating a named vector, a `has_vector` filter.
- Qdrant also supports Manhattan distance for dense vectors. The post intentionally compares the three metrics named in its title and does not claim that they are exhaustive.
