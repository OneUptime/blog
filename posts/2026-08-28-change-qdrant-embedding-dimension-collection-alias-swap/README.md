# How to Change a Qdrant Embedding Dimension with a New Collection and Alias Swap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Embeddings, Vector Dimensions, Collections, Aliases, Migration

Description: Migrate Qdrant to a different embedding dimension by building a new collection, dual-writing and backfilling it, then atomically swapping an alias with a tested rollback path.

---

A Qdrant vector field has a fixed dimension. Changing from a 768-dimensional embedding model to a 1,024-dimensional model is therefore a data migration, not an in-place resize. Existing vectors cannot be padded or truncated without changing their meaning, and Qdrant rejects vectors whose length does not match the collection schema.

The safe pattern is blue-green: create a new collection with the new dimension, generate new embeddings from the original source content, keep writes synchronized, validate the result, and atomically move a stable alias from the old collection to the new one.

## Separate Three Things That Must Change Together

Plan the cutover across:

1. the embedding producer, which generates the new vector size;
2. the Qdrant collection, whose vector schema accepts that size;
3. the query path, which must embed queries with the same model used for stored vectors.

An atomic Qdrant alias change switches the database target, but it does not atomically deploy the application model. Design a release flag, gateway, or coordinated rollout so the alias and query embedding model cannot become mismatched.

Also decide whether the distance metric changes. Use the metric recommended by the embedding model provider and validate it; do not copy `Cosine` from the old collection by habit.

## Inventory the Old Collection

Before creating the replacement, record:

- vector names, dimensions, and distance metrics;
- sparse-vector configuration;
- shard number, replication, write consistency, and on-disk settings;
- HNSW, optimizer, quantization, and memory-tier configuration;
- payload schema and payload indexes;
- tenant or custom sharding rules;
- strict-mode settings;
- aliases and application timeouts.

Fetch the effective collection details rather than relying on old infrastructure code:

```bash
curl --fail-with-body \
  -H 'api-key: YOUR_API_KEY' \
  http://localhost:6333/collections/documents-v1
```

Collection snapshots do not contain aliases, so export the mapping independently before any migration or rollback work.

## Create the New Collection

Create the destination with the new dimension and the other reviewed settings. This minimal REST example uses 1,024-dimensional cosine vectors:

```bash
curl --fail-with-body -X PUT \
  -H 'api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  http://localhost:6333/collections/documents-v2 \
  --data-raw '{
    "vectors": {
      "size": 1024,
      "distance": "Cosine"
    }
  }'
```

Recreate the required payload indexes before or during ingestion according to Qdrant's indexing guidance. Copying only the vector size can produce a destination with different filter performance, storage behavior, or durability.

Do not restore the old collection snapshot into the new schema: it contains vectors with the old dimension and the old collection configuration. Backfill by reading source content and computing genuinely new embeddings.

## Preserve Stable Point Identity

Use the same Qdrant point IDs and payload semantics in both collections. Stable IDs make retries idempotent, simplify count and sample comparisons, and let the application correlate an item through rollback.

The original source—documents, rows, objects, or an event log—should remain authoritative. If the Qdrant payload lacks the complete text or preprocessing metadata needed to reproduce embeddings, do not pretend an old vector can be converted into a new one. Retrieve the original content.

Version embedding provenance in payload or external metadata, for example:

```json
{
  "document_id": "doc-42",
  "chunk_index": 3,
  "embedding_model": "provider/model-v2",
  "embedding_pipeline": "2026-08-28"
}
```

Never store secrets or credentials in payload metadata.

## Dual-Write New Mutations

Before the backfill starts, update the ingestion path so each new or changed item is embedded with both approved models and upserted to both collections. A successful write policy must define what happens if one side fails: retry from a durable queue or log until both reach the same logical version.

Dual-writing only upserts is insufficient if the workload also performs deletes, payload-only changes, partial vector updates, or index-dependent schema changes. Mirror every mutation type or pause unsupported mutations during the migration. Qdrant's migration tutorial explicitly calls out this gap.

Use a monotonic source version or timestamp to prevent an old backfill task from overwriting a newer dual-write result. The latest authoritative event must win on both sides.

## Backfill with Scroll and Re-Embedding

Process the source dataset in bounded, resumable batches. If Qdrant is the source of IDs and payloads, the Scroll API supports cursor-based iteration; fetch vectors only if they are actually needed, because the old embeddings cannot substitute for new ones.

For every batch:

1. read IDs and authoritative content;
2. apply the exact new chunking and preprocessing pipeline;
3. generate 1,024-dimensional embeddings;
4. verify every output has the expected finite length;
5. upsert with stable IDs and payloads into `documents-v2`;
6. persist the batch cursor only after the write is acknowledged;
7. retry failed items idempotently.

Throttle the job based on embedding-provider limits and Qdrant CPU, memory, disk, and optimizer pressure. A fast backfill that destabilizes production is not a successful migration.

## Validate More Than Counts

Wait for optimizers and indexing to settle, then compare:

- exact point counts from an authoritative source or exact count API;
- randomly sampled and boundary point IDs;
- payload equality and required field indexes;
- deletes and updates that occurred during backfill;
- query relevance on a labeled evaluation set;
- filtered-query correctness;
- p50, p95, and p99 latency under realistic concurrency;
- collection health across all shards and replicas.

The new embedding model is expected to return different neighbors and scores, so byte-for-byte search equality is not a valid goal. Define relevance and performance acceptance criteria before cutover.

## Create a Stable Alias

Applications should query an alias such as `documents-live`, not a versioned physical collection name. If no alias exists yet, create one pointing to the old collection before the final migration window and verify every client supports it.

At cutover, use one alias operation request to delete the old mapping and create the new mapping. Qdrant applies alias actions atomically:

```bash
curl --fail-with-body -X POST \
  -H 'api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  http://localhost:6333/collections/aliases \
  --data-raw '{
    "actions": [
      {
        "delete_alias": {
          "alias_name": "documents-live"
        }
      },
      {
        "create_alias": {
          "collection_name": "documents-v2",
          "alias_name": "documents-live"
        }
      }
    ]
  }'
```

Coordinate that request with the query-model rollout. Drain or version queued requests if an old-model query could arrive after the alias points to the new collection.

## Keep a Tested Rollback Window

After cutover, continue mirroring mutations to `documents-v1` for a defined observation period or retain a replayable change log. Monitor errors, empty-result rates, latency, resource use, and relevance signals.

Rollback is the inverse atomic alias update, combined with switching query embedding back to the old model. Practice it before the production change. Do not delete the old collection until the rollback window has closed, backups are verified, and downstream consumers no longer refer to it directly.

When cleanup is finally approved, resolve the physical collection name explicitly. An alias mistake during deletion is far more damaging than a few extra days of storage cost.

## Official Documentation

- [Qdrant tutorial: migrate to a new embedding model](https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/)
- [Qdrant collections, vector configuration, and aliases](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant points and vector dimension requirements](https://qdrant.tech/documentation/concepts/points/)
- [Qdrant Scroll API for paginated backfills](https://qdrant.tech/documentation/concepts/points/#scroll-points)
- [Qdrant indexing and payload-index guidance](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant snapshots and alias limitations](https://qdrant.tech/documentation/operations/snapshots/)

## Conclusion

You cannot resize existing Qdrant vectors in place. Build a correctly configured collection, re-embed authoritative content at the new dimension, mirror every mutation, and validate data, relevance, and performance. Then coordinate the query-model rollout with one atomic alias swap and keep the old collection synchronized long enough to make rollback real.
