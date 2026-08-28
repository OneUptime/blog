# Validation Summary: One Collection per Tenant or Payload Partitioning? Designing Qdrant Multitenancy

## Status
validated

## Post Type
Technical architecture guide with Python and REST implementation examples

## Technologies Covered
- Qdrant vector database
- Qdrant REST API
- Qdrant Python client
- Payload indexes and tenant indexes
- Payload-based multitenancy
- User-defined sharding
- Tiered multitenancy
- JWT role-based access control
- Qdrant Cloud and self-hosted deployments

## Sources Consulted
- [Qdrant Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/)
- [Qdrant Collections](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant Payload Indexing](https://qdrant.tech/documentation/manage-data/indexing/#payload-index)
- [Qdrant Points and Point IDs](https://qdrant.tech/documentation/manage-data/points/#point-ids)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Distributed Deployment](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant Security and Granular Access API Keys](https://qdrant.tech/documentation/security/#granular-access-api-keys)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Retrieve Points API](https://api.qdrant.tech/api-reference/points/get-points)
- [Qdrant Create Collection API](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant Create Payload Index API](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Qdrant Create a Shard Key API](https://api.qdrant.tech/api-reference/distributed/create-shard-key)
- [Qdrant 1.11.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.11.0)
- [Qdrant 1.16.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.16.0)
- [qdrant-client 1.19.0 release](https://github.com/qdrant/qdrant-client/releases/tag/v1.19.0)
- [Qdrant Data Synchronization Patterns](https://qdrant.tech/documentation/data-synchronization/)
- [Qdrant Snapshots](https://qdrant.tech/documentation/operations/snapshots/)

## Issues Found
- The REST Query example sent a three-dimensional vector to a 384-dimensional collection, so the command would fail vector-dimension validation. Changed it to generate a 384-dimensional placeholder vector with `jq` and clarified that a real embedding should replace it.
- The opening and comparison table implied that every Qdrant operation accepts a payload filter. Qualified that guidance and documented that point-by-ID retrieval has no payload-filter parameter, so tenant-scoped ID lookups should use a filter-capable Query or Scroll operation.
- The custom-sharding example did not state that shard-key management requires Qdrant distributed mode. Added the cluster-mode requirement; a default standalone server rejects the create-shard-key request.
- The custom-sharding explanation described collection-level `shard_number` as an unconditional per-key value. Clarified that it is the default and that an individual create-shard-key request can override it with `shards_number`.
- The migration sequence did not account for mutations made during the copy and did not distinguish exact counts from approximate collection statistics. Changed it to require paused or mirrored mutations, reconciliation, and exact-count comparisons before cutover.

## Review Notes
- The corrected REST and Python examples were exercised against Qdrant 1.19.0 and qdrant-client 1.19.0. The tenant index, UUID point handling, filtered query, custom collection, and shard-key creation all behaved as described when Qdrant was running in distributed mode.
- The documented introduction versions are correct: user-defined sharding in Qdrant 1.7, tenant indexing in Qdrant 1.11, and tiered multitenancy in Qdrant 1.16.
- The post correctly distinguishes storage placement from authorization. Current JWT RBAC is collection-scoped and does not automatically inject tenant payload filters.
- All external documentation links in the post resolved to the intended official Qdrant resources during review.
