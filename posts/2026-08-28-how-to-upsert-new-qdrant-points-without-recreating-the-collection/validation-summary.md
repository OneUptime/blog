# Validation Summary: How to Upsert New Qdrant Points Without Recreating the Collection

## Status

validated

## Post Type

Technical tutorial and operational guide

## Technologies Covered

- Qdrant vector database
- Qdrant Python client (`qdrant-client`)
- Python
- Dense, named, and sparse vectors
- Point upserts, retrieval, deletion, and payload updates
- Custom sharding and distributed write ordering
- RAG ingestion and embedding-model migration

## Sources Consulted

- [Qdrant: Points](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant API: Upsert points](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Qdrant API: Retrieve points](https://api.qdrant.tech/api-reference/points/get-points)
- [Qdrant API: Delete points](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant API: Update vectors](https://api.qdrant.tech/api-reference/points/update-vectors)
- [Qdrant API: Count points](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant: Collections and vector schemas](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant: Migrate to a New Embedding Model](https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/)
- [Qdrant: Distributed Deployment and user-defined sharding](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant: Consistency Guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant: Payload](https://qdrant.tech/documentation/concepts/payload/)
- [Qdrant: Optimizer](https://qdrant.tech/documentation/ops-optimization/optimizer/)
- [Qdrant: Snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Official `qdrant-client` v1.19.0 source](https://github.com/qdrant/qdrant-client/blob/v1.19.0/qdrant_client/qdrant_client.py)
- [Qdrant v1.17.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.17.0), [v1.17.1 release](https://github.com/qdrant/qdrant/releases/tag/v1.17.1), and [v1.18.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.18.0)

## Issues Found

- The post presented a new named vector space as a general alternative to a new collection when changing vector dimensions or distance metrics. Qdrant 1.18+ only supports adding a named vector schema to a collection that was originally created with named vectors. The migration guidance and version-scope note now state this prerequisite.
- The point-identity explanation did not account for custom sharding. Qdrant enforces point-ID uniqueness only within each shard key, so the same ID can otherwise exist under different keys. The explanation now scopes overwrite semantics correctly, advises globally unique IDs across custom shard keys, requires the intended `shard_key_selector`, and states that the code examples assume automatic sharding.

## Review Notes

- All Python snippets use current, non-deprecated APIs. The constructor, schema inspection, `PointStruct`, `upsert`, `UpdateMode.INSERT_ONLY`, `retrieve`, and `delete` forms were also smoke-tested with `qdrant-client` 1.19.0 in local mode.
- The documented version gates are correct: `update_mode` is available from Qdrant 1.17.0, `prevent_unoptimized` from 1.17.1, and existing-collection named-vector schema additions from 1.18.0.
- The post's optimizer link resolves through a redirect to the current canonical optimizer documentation URL. The official guidance recommends `wait=False` for high-volume writes when experimental `prevent_unoptimized` is enabled because `wait=True` can cause delays, timeouts, and head-of-line blocking.
