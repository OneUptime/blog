# Validation Summary: How to Create Qdrant Payload Indexes for Fast Filtered Vector Search

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Qdrant 1.19
- Qdrant payload indexes and filterable HNSW indexes
- Qdrant REST API
- Qdrant Python client (`qdrant-client`)
- Qdrant strict mode and Qdrant Cloud collection defaults
- `curl` and `jq`

## Sources Consulted
- [Qdrant indexing and payload index schemas](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant text filtering](https://qdrant.tech/documentation/search/text-search/text-filtering/)
- [Create payload index API reference](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Delete payload index API reference](https://api.qdrant.tech/api-reference/indexes/delete-field-index)
- [Scroll points API reference](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Get collection details API reference](https://api.qdrant.tech/api-reference/collections/get-collection)
- [Qdrant Cloud cluster configuration and collection defaults](https://qdrant.tech/documentation/cloud/configure-cluster/)
- [Qdrant bulk upload guidance](https://qdrant.tech/documentation/manage-data/bulk-upload/)
- [Qdrant memory tiers and legacy settings](https://qdrant.tech/documentation/ops-configuration/memory-tiers/)
- [Qdrant 1.4.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.4.0)
- [Qdrant 1.8.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.8.0)
- [Qdrant 1.11.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.11.0)
- [Qdrant 1.19.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.19.0)
- [Qdrant Python client 1.19.0 source](https://github.com/qdrant/qdrant-client/tree/v1.19.0)

## Issues Found
- The strict-mode paragraph said that current Qdrant Cloud collections apply the protections by default. The Cloud-specific documentation scopes those defaults to new collections. Changed “Current” to “New” so the post does not imply that every existing Cloud collection is retroactively configured this way.
- The bulk-upload documentation link used a legacy URL that now redirects through an HTML meta-refresh. Replaced it with the current canonical `manage-data/bulk-upload` URL.

No code, command, request-body, schema, endpoint, or version-introduction errors were found.

## Review Notes
- The REST create, inspect, Scroll, and delete examples were executed successfully against Qdrant 1.19.0. The Python methods, enums, parameterized integer schema, `payload_schema` dictionary access, and delete operation were also runtime-checked with `qdrant-client` 1.19.0.
- The payload-schema mappings, `wait=true` semantics, dot-path indexing guidance, pre-ingestion ordering, filter-aware HNSW explanation, `ef_construct + 1` rebuild procedure, selective-indexing advice, and index-deletion semantics agree with the official documentation.
- The stated introduction versions for boolean, datetime, parameterized integer, UUID, keyword-prefix, and memory-tier support are correct.
- The Python client uses a five-second default request timeout. A slow or post-ingestion index build can outlast that client timeout even though the server-side operation continues. Production maintenance code should configure a suitable client timeout and re-read `payload_schema` before retrying after a timeout.
