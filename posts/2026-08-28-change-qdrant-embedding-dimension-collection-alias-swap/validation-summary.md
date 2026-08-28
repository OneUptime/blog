# Validation Summary: How to Change a Qdrant Embedding Dimension with a New Collection and Alias Swap

## Status

validated

## Post Type

Technical guide / migration tutorial

## Technologies Covered

- Qdrant dense vectors and vector schemas
- Embedding models and dimensionality migration
- Qdrant collections, payload indexes, custom sharding, and snapshots
- Qdrant point upserts, conditional updates, update modes, and Scroll API
- Qdrant collection aliases and atomic alias updates
- Qdrant REST API, JSON, and curl

## Sources Consulted

- [Qdrant: Migrate to a New Embedding Model](https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/)
- [Qdrant: Collections](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant: Vectors](https://qdrant.tech/documentation/manage-data/vectors/)
- [Qdrant: Matryoshka Models](https://qdrant.tech/documentation/inference/matryoshka-models/)
- [Qdrant: Points](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant API: Create a Collection](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant API: Get Collection Details](https://api.qdrant.tech/api-reference/collections/get-collection)
- [Qdrant API: Upsert Points](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Qdrant API: Scroll Points](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Qdrant API: Count Points](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant API: Update Collection Aliases](https://api.qdrant.tech/api-reference/aliases/update-aliases)
- [Qdrant: Indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant: Distributed Deployment and Custom Sharding](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant: Snapshots](https://qdrant.tech/documentation/snapshots/)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found

- The opening referred to every Qdrant vector field as fixed-dimensional, but Qdrant sparse vectors do not have a fixed length. It now says "dense-vector field."
- The claim that embeddings cannot be padded or truncated without changing their meaning was too absolute because some models support deliberate dimensionality reduction. It now states the migration-relevant rule: padding or truncating an old-model embedding does not convert it into the new model's vector space.
- The collection inventory omitted vector data types, multivector settings, WAL configuration, and concrete custom shard keys. These were added, along with the endpoint for listing shard keys. Stable identity guidance now also preserves shard-key routing.
- The post allowed payload indexes to be created during ingestion. Qdrant recommends creating known payload indexes before ingestion so the filter-aware HNSW graph can be built correctly without a later rebuild; the wording was corrected.
- Mirroring deletes and partial updates without race handling can still allow a backfill to recreate or overwrite data. The post now requires pausing those operations or using race-safe ordered replay, tombstones, or conditional writes.
- A monotonic version stored in payload does not enforce write ordering by itself, and a normal upsert can overwrite a newer dual-write result. The backfill now uses Qdrant's `insert_only` update mode and explains when conditional updates or ordered serialization are required.
- Qdrant's `acknowledged` operation status does not mean an asynchronous write has completed and such an operation may still fail. Cursor persistence now waits for a `completed` result or independently verifies the write.

The collection creation curl command, collection-details command, alias-swap request, JSON field names, REST endpoints, and alias atomicity claim were verified as correct and current.

## Review Notes

- Blue-green migration remains valid for every Qdrant collection type. Qdrant 1.18 and later also supports an in-collection migration for collections created with named vectors by adding a new vector definition; that creates a new field rather than resizing the existing one.
- The post's older Points, Scroll, and Snapshots documentation URLs currently redirect to Qdrant's canonical current pages and remain functional.
- The `insert_only` update mode is a current Qdrant feature; deployments on older Qdrant versions need an equivalent conditional or serialized backfill strategy.
- `curl --fail-with-body` is valid current syntax and was introduced in curl 7.76.0.
