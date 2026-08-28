# Validation Summary: How to Tune Qdrant HNSW ef, m, and exact Search for Recall vs Latency

## Status

validated

## Post Type

Technical performance-tuning guide

## Technologies Covered

- Qdrant vector database
- HNSW approximate nearest-neighbor indexing
- Qdrant Query API and REST API
- Python and `qdrant-client`
- `curl`
- Payload indexes, query planning, and Qdrant optimizers

## Sources Consulted

- [Qdrant similarity search and current Query API examples](https://qdrant.tech/documentation/search/search/)
- [Qdrant indexing, filterable HNSW, defaults, and rebuild guidance](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant tutorial: Measuring ANN Recall](https://qdrant.tech/documentation/tutorials-search-engineering/ann-recall/)
- [Qdrant Fundamentals FAQ](https://qdrant.tech/documentation/faq/qdrant-fundamentals/)
- [Qdrant collection configuration and update behavior](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant optimizer and optimization monitoring](https://qdrant.tech/documentation/operations/optimizer/)
- [Qdrant memory tiers and cache behavior](https://qdrant.tech/documentation/ops-configuration/memory-tiers/)
- [Qdrant API reference: Get collection details](https://api.qdrant.tech/api-reference/collections/get-collection)
- [Official `qdrant-client` v1.19.0 release](https://github.com/qdrant/qdrant-client/releases/tag/v1.19.0) and [Python client source](https://github.com/qdrant/qdrant-client/blob/v1.19.0/qdrant_client/qdrant_client.py)
- [Qdrant source: merging collection and vector-specific HNSW settings](https://github.com/qdrant/qdrant/blob/74f3e85b9473c62560006c043e13737ce6b48412/lib/collection/src/config.rs#L274-L280)
- [Official curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found

- The `hnsw_ef` sweep omitted the tenant filter used by the exact-search baseline, so its results represented a different workload and could not be used for a valid recall comparison. The filter is now assigned to `tenant_filter` and reused by the exact, approximate, and sweep queries.
- The text said the two baseline calls changed only `exact`, although the ANN call also set `hnsw_ef`. It now accurately says to keep the vector, filter, limit, and output settings the same while comparing exact search with the ANN `hnsw_ef` under test.
- The collection-inspection snippet mentioned vector-specific overrides but displayed only the collection-level HNSW configuration. It now also displays `info.config.params.vectors` and explains that named-vector overrides take precedence and must be updated through `vectors_config` when applicable.
- The introduction described three settings while listing three HNSW settings plus the `exact` search-mode flag. It now distinguishes the three HNSW settings from exact mode.

## Review Notes

- All shown `qdrant-client` APIs, models, and arguments are current and non-deprecated in v1.19.0.
- The recall calculation assumes the exact filtered query returns at least one result. A larger evaluation harness should skip or explicitly reject queries with an empty exact result set because recall is undefined for them.
- The query examples assume the collection's default unnamed vector. A named-vector workload should pass the same `using` value to every exact and ANN query.
- All external links in the post resolved to the intended current Qdrant documentation pages.
