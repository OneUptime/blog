# Validation Summary: How to Generate Deterministic Qdrant Point IDs and Prevent Duplicate RAG Chunks

## Status
validated

## Post Type
Technical tutorial and implementation guide

## Technologies Covered

- Qdrant vector database and Python client
- Retrieval-augmented generation (RAG) ingestion
- Python UUIDv5 generation
- Canonical JSON serialization
- Idempotent point upserts and deduplication
- Source manifests, point deletion, and rollback
- Qdrant update modes and custom sharding

## Sources Consulted

- [Qdrant points documentation](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant collections documentation](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant upsert points API](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Qdrant count points API](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant retrieve points API](https://api.qdrant.tech/api-reference/points/get-points)
- [Qdrant delete points API](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant filtering documentation](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant distributed deployment documentation](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant 1.17.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.17.0)
- [qdrant-client 1.17.0 source](https://github.com/qdrant/qdrant-client/blob/v1.17.0/qdrant_client/qdrant_client.py)
- [Python `uuid` documentation](https://docs.python.org/3/library/uuid.html)
- [Python `json` documentation](https://docs.python.org/3/library/json.html)
- [RFC 9562: Universally Unique IDentifiers](https://www.rfc-editor.org/rfc/rfc9562.html)

## Issues Found

- The source-manifest section said readers could continue using the previous generation after a partial logical-slot reingestion. That was inaccurate because upserts overwrite matching point IDs as they run, potentially exposing a mix of old and new revisions. The text now describes that behavior and explains that full generation isolation requires either a staged collection with an alias switch or revision-specific IDs with a revision filter.
- The version scope mentioned only Qdrant 1.17+. The shown `models.UpdateMode` enum and `update_mode` client parameter also require `qdrant-client` 1.17+, so both relevant passages now state the server and client requirements.

## Review Notes

The UUIDv5 derivation, canonical JSON settings, Qdrant point-ID constraints, complete-point upsert guidance, count/retrieve/delete calls, omitted-ID behavior of `upload_collection`, update-mode semantics, uint64 caveats, and custom-sharding warning were verified. The Python examples were also smoke-tested with `qdrant-client` 1.17.0 in local mode. The retry-count example is correct, although a future revision could make the demonstration stronger by comparing the count immediately after the first upsert with the count after the second.
