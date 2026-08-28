# Validation Summary: Why Qdrant Filtered Queries Time Out: Payload Indexes, exact Search, and HNSW

## Status
validated

## Post Type
Technical troubleshooting and performance guide

## Technologies Covered
- Qdrant Query API and REST API
- Qdrant Python client
- Dense vector similarity search
- HNSW and filterable HNSW
- ACORN search
- Payload and tenant indexes
- Qdrant query planning, optimizer, and strict mode
- cURL, Bash, JSON, and jq

## Sources Consulted
- [Qdrant Search and Query Planning](https://qdrant.tech/documentation/search/)
- [Qdrant Indexing and Filterable HNSW](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant Collections and Named-Vector Configuration](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant Low-Latency Search and `indexed_only`](https://qdrant.tech/documentation/guides/low-latency-search/)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Count Points API](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant Create Payload Index API](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Qdrant Get Collection Details API](https://api.qdrant.tech/api-reference/collections/get-collection)
- [Qdrant Update Collection API](https://api.qdrant.tech/api-reference/collections/update-collection/)
- [Qdrant Strict Mode Administration](https://qdrant.tech/documentation/ops-configuration/administration/)
- [Qdrant Cloud Cluster Configuration](https://qdrant.tech/documentation/cloud/configure-cluster/)
- [Qdrant Multitenancy](https://qdrant.tech/documentation/tutorials/multiple-partitions/)
- [Qdrant Fundamentals](https://qdrant.tech/documentation/faq/qdrant-fundamentals/)
- [Qdrant Optimizer](https://qdrant.tech/documentation/operations/optimizer/)
- [Qdrant 1.16.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.16.0)
- [Qdrant Python client source](https://github.com/qdrant/qdrant-client)
- [Qdrant planner source](https://github.com/qdrant/qdrant/blob/74f3e85b9473c62560006c043e13737ce6b48412/lib/segment/src/index/hnsw_index/hnsw/read_view/dispatch.rs)

## Issues Found
1. **Planner-selected scans were called exact scans.** A planner-selected scan of a small candidate set is the plain/full-scan path, which is distinct from a request with `exact: true`; when exact mode is off, quantized scoring may still apply. Changed the introduction and conclusion to call this a full scan.
2. **Filterable-HNSW connectivity was stated as a guarantee.** Extra payload-aware edges improve filtered graph connectivity but do not guarantee that every relevant subgraph remains connected, especially for combinations of filters. Changed the wording from “remains connected” to “improve connectivity.”
3. **The `hnsw_ef` default was scoped only to the collection.** Named vectors can override HNSW configuration. Clarified that the default comes from the selected vector index's effective `ef_construct`, using the collection value unless a named-vector override applies.
4. **`indexed_only` was described as skipping every unindexed segment.** Qdrant still searches small unindexed segments below the indexing threshold and can exclude larger unindexed segments. Corrected the description while retaining the warning that results can be partial.

## Review Notes
- All three Python snippets parse successfully, and the current Qdrant client accepts and serializes the models and parameters shown.
- All six Bash snippets pass shell syntax validation. The REST methods, paths, query parameters, and JSON field names match the current API.
- The stated version boundaries for the Query API (1.10), `is_tenant` (1.11), and ACORN (1.16) are correct. Strict mode itself is available from Qdrant 1.13.
- The approximate Count API response may be unreliable while indexing is in progress, as documented by Qdrant; using it as a diagnostic estimate remains appropriate.
- The documentation links all resolve. Some older Qdrant documentation paths in the post redirect to newer canonical locations but remain functional.
