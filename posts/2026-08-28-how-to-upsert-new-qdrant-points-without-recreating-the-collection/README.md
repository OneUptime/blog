# How to Upsert New Qdrant Points Without Recreating the Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Upsert, Python, Data Ingestion, RAG

Description: Add or replace Qdrant points safely with the current upsert API while preserving the collection schema and verifying each write.

---

A Qdrant collection does not need to be recreated when new data arrives. Create the collection once with the vector dimension and distance metric required by the embedding model, then use the points upsert API for ongoing ingestion.

The important distinction is identity: within an automatically sharded collection-or within the targeted shard key under custom sharding-a previously unseen point ID inserts a point, while an existing ID overwrites that point. Qdrant accepts point IDs as either unsigned 64-bit integers or UUIDs. Arbitrary strings such as `document-42-chunk-7` are not valid point IDs unless they are converted to a valid UUID or uint64 first.

This guide uses the current Python client and makes writes synchronous for straightforward verification.

## Do Not Recreate a Live Collection

Methods or workflows named `recreate_collection` delete and create a collection. That is a destructive schema operation, not an ingestion method. Recreating a collection can remove points, payload indexes, aliases, optimizer state, and collection settings.

Use an upsert when:

- adding newly embedded documents or chunks;
- retrying an ingestion message with the same stable ID;
- intentionally replacing the complete point associated with an ID;
- backfilling data whose vectors match the existing vector schema.

Use a new collection when changing the embedding dimension or distance metric. On Qdrant 1.18 or later, a collection that was created with named vectors can instead add a new named vector space. An upsert cannot change the collection's vector schema.

## Inspect the Schema Before Writing

Pin compatible versions of Qdrant and `qdrant-client`, protect the API key, and take a snapshot or preserve the source data before a large batch. Then inspect the destination:

```python
from qdrant_client import QdrantClient

client = QdrantClient(
    url="https://your-cluster.example.com:6333",
    api_key="YOUR_API_KEY",
)

collection_name = "rag_chunks"
info = client.get_collection(collection_name)
print("status:", info.status)
print("vectors:", info.config.params.vectors)
print("points:", info.points_count)
```

For a single unnamed dense vector, `info.config.params.vectors` contains one `size` and `distance`. For named vectors it is a mapping. Verify the exact vector name, dimension, and metric used by the application. A vector with the wrong number of elements is not adapted automatically.

Also record whether the collection uses sparse vectors, custom sharding, strict mode, or write-ordering requirements. Those choices affect the request shape even though the basic upsert rule remains the same. For custom sharding, pass the intended `shard_key_selector` and keep IDs globally unique across shard keys; Qdrant enforces ID uniqueness only within each shard key.

## Upsert a New Point

This example assumes an automatically sharded collection with one unnamed four-dimensional dense vector. In a real RAG pipeline, `vector` must come from the same pinned embedding model used for the existing points.

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(
    url="https://your-cluster.example.com:6333",
    api_key="YOUR_API_KEY",
)

collection_name = "rag_chunks"
point_id = "9f2054b2-9d8e-5cd3-a43b-981cacfdf481"
vector = [0.12, -0.44, 0.78, 0.31]

params = client.get_collection(collection_name).config.params.vectors
if isinstance(params, dict):
    raise RuntimeError("This example expects an unnamed vector collection")
if len(vector) != params.size:
    raise ValueError(f"Expected {params.size} values, got {len(vector)}")

result = client.upsert(
    collection_name=collection_name,
    wait=True,
    points=[
        models.PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "source_id": "handbook/incident-response",
                "chunk_index": 7,
                "text": "Escalate an unresolved incident after 30 minutes.",
                "embedding_model": "your-pinned-model-revision",
            },
        )
    ],
)
print(result.status)
```

`wait=True` asks Qdrant to return after the update has been applied, which makes the immediate read below meaningful. For throughput-oriented ingestion, batching is more efficient, but keep each request within deployment limits and preserve retry-safe IDs.

For a named dense vector, send a mapping instead:

```python
vector={"dense": vector}
```

The key must exactly match a vector name in the collection schema. If the point should contain multiple named vectors, include the complete intended set for an upsert.

## Verify the Written Point

Retrieve the exact ID rather than relying only on an approximate collection count:

```python
records = client.retrieve(
    collection_name=collection_name,
    ids=[point_id],
    with_payload=True,
    with_vectors=True,
)

if len(records) != 1:
    raise RuntimeError("The point was not found after the upsert")

record = records[0]
assert record.id == point_id
assert record.payload["source_id"] == "handbook/incident-response"
print(record)
```

For a production batch, compare the set of requested IDs with retrieved IDs, validate payload fields, and confirm vector names and dimensions. Qdrant's approximate `points_count` is useful operationally but is not a substitute for ID-level verification; use the count API with `exact=True` when an exact total is required.

Finally, run a representative query and payload filter. Successful retrieval by ID proves storage, not that the embedding model, metric, filter paths, or search relevance are correct.

## Understand Same-ID Overwrites

Qdrant point-loading APIs are idempotent: uploading the same request again with the same ID has the effect of one upload. For an existing ID, however, that means overwrite-not merge.

Treat a point upsert as a complete replacement operation:

- send the complete intended payload;
- for named-vector collections, send every vector that should remain on the point;
- do not use upsert as a partial patch.

Qdrant explicitly documents that, for an existing ID, the old point is deleted and reinserted with the specified vectors; unspecified named vectors become null. To preserve other vectors while changing one, use `update_vectors`. To merge payload keys, use `set_payload`; to replace the entire payload intentionally, use `overwrite_payload`.

This is a common failure mode during RAG re-embedding: upserting only a new dense vector under the same ID can remove a sparse or legacy named vector that the application still queries.

## Prevent an Accidental Overwrite

Qdrant 1.17 introduced `update_mode` for upserts. Use `INSERT_ONLY` when the ingestion contract says an existing ID must remain unchanged:

```python
client.upsert(
    collection_name=collection_name,
    wait=True,
    update_mode=models.UpdateMode.INSERT_ONLY,
    points=[
        models.PointStruct(
            id=point_id,
            vector=vector,
            payload={"source_id": "handbook/incident-response", "chunk_index": 7},
        )
    ],
)
```

If the ID already exists, `insert_only` ignores that point. `UPDATE_ONLY` performs the inverse: it updates existing IDs and does not insert missing ones. The default `UPSERT` behavior inserts or updates.

On Qdrant versions before 1.17, a retrieve-before-upsert check is not atomic and can race with another writer. If overwriting is forbidden, coordinate writers externally or upgrade to a release that supports `update_mode`.

## Batch Safely

Build batches of complete points with stable IDs:

```python
points = [
    models.PointStruct(id=row["id"], vector=row["vector"], payload=row["payload"])
    for row in rows
]

client.upsert(
    collection_name=collection_name,
    points=points,
    wait=True,
)
```

Retry a failed or timed-out batch with the same IDs. Generating new random UUIDs for each retry creates additional points instead of making the retry idempotent. If multiple clients can update the same IDs concurrently in a distributed cluster, choose appropriate write ordering and serialize conflicting application updates where necessary.

For very large loads, Qdrant's Python client also provides `upload_points`, with batching, retries, and parallelization. Its same-ID semantics still apply.

## Roll Back or Recover

Before overwriting an existing point, retain its previous payload and vectors in a source-of-truth system or snapshot. To undo a bad replacement, upsert the complete previous point again.

For points that were genuinely new, delete only the exact inserted IDs after confirming no later workflow owns them:

```python
client.delete(
    collection_name=collection_name,
    points_selector=models.PointIdsList(points=[point_id]),
    wait=True,
)
```

Do not roll back a batch with a broad payload filter unless the filter has been reviewed and the affected ID set captured. A deterministic ingestion manifest containing batch ID, source revision, and point IDs makes recovery auditable.

## Limitations and Version Scope

The code targets the current Qdrant Python client. Conditional `update_mode` values are documented as available from Qdrant 1.17. Named vector schema additions require Qdrant 1.18 or later and a collection originally configured with named vectors; they do not alter an existing vector name's dimension or metric. If `prevent_unoptimized` is enabled on Qdrant 1.17.1+, review its documented interaction with `wait=True` before using synchronous high-volume writes.

## Official Documentation

- [Qdrant point IDs, uploads, idempotence, and update modes](https://qdrant.tech/documentation/manage-data/points/)
- [Upsert points API reference](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Retrieve points API reference](https://api.qdrant.tech/api-reference/points/get-points)
- [Delete points API reference](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant collections and vector schemas](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant optimizer behavior and `wait`](https://qdrant.tech/documentation/operations/optimizer/)

## Conclusion

Keep the collection and upsert points into it. Validate the existing vector schema, use a valid uint64 or UUID, send the complete intended point, and retrieve the ID after the write. Stable IDs make retries safe; `INSERT_ONLY` on Qdrant 1.17+ protects append-only ingestion, while snapshots or a source-of-truth copy make intentional overwrites recoverable.
