# How to Generate Deterministic Qdrant Point IDs and Prevent Duplicate RAG Chunks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, RAG, Vector Database, UUID, Idempotency, Deduplication, Python

Description: Derive stable UUID point IDs from canonical chunk identity so RAG retries overwrite the intended Qdrant points instead of creating duplicates.

---

Duplicate RAG chunks usually begin outside Qdrant. An ingestion job splits the same source again, generates fresh random IDs, and upserts them. Qdrant correctly sees those IDs as new points, so semantically identical chunks coexist and can dominate retrieval results.

Qdrant supports exactly two point-ID forms: unsigned 64-bit integers and UUIDs. It does not accept an arbitrary document key such as `policies/security.pdf#chunk-12`. A deterministic UUIDv5 is a convenient way to turn a canonical chunk identity into a valid, repeatable Qdrant ID.

Stable IDs make retries idempotent, but they do not replace a deletion policy. If a source shrinks or a new chunking algorithm changes chunk boundaries, the pipeline must remove superseded IDs deliberately.

## Decide What Makes a Chunk the Same Chunk

Choose identity before writing code. Common policies are:

- **Logical slot identity:** corpus, stable source ID, chunker version, and chunk index. Re-ingesting changed text into the same slot overwrites the old point.
- **Content revision identity:** corpus, stable source ID, source revision or chunk hash, chunker version, and chunk index. Changed content receives new IDs, so the pipeline must delete the previous revision.
- **Content-only identity:** a hash of chunk text. This can unintentionally collapse identical boilerplate from different documents and lose source-specific payload, so it is rarely appropriate by itself.

A robust default for mutable documents is logical slot identity plus a source-level manifest. Include a chunker version whenever changes to separators, overlap, tokenizer, or maximum size should create a distinct generation.

Do not use a transient download URL, local temporary path, ingestion timestamp, or worker name as the source ID. Canonicalize a durable key such as the content-management record ID and preserve its case and Unicode rules across all producers.

## Generate a Deterministic UUIDv5

Python's `uuid.uuid5(namespace, name)` generates a UUID from a namespace UUID and a UTF-8 name using the UUIDv5 algorithm. Freeze both the namespace and serialization format once data exists:

```python
import json
import uuid

# Keep this derivation constant for the lifetime of the ID scheme.
RAG_NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL,
    "https://example.com/qdrant/rag-chunks/id-scheme-v1",
)


def qdrant_chunk_id(
    *,
    corpus: str,
    source_id: str,
    chunker_version: str,
    chunk_index: int,
) -> str:
    identity = {
        "chunk_index": chunk_index,
        "chunker_version": chunker_version,
        "corpus": corpus,
        "source_id": source_id,
    }
    canonical_name = json.dumps(
        identity,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return str(uuid.uuid5(RAG_NAMESPACE, canonical_name))


point_id = qdrant_chunk_id(
    corpus="support-handbook",
    source_id="article:incident-severity",
    chunker_version="recursive-800-100-v2",
    chunk_index=4,
)
print(point_id)
```

The same inputs now produce the same valid UUID on every retry and worker. `sort_keys=True` and compact separators prevent dictionary ordering or whitespace from changing the name. Still define input normalization explicitly: for example, whether source IDs are case-sensitive and whether Unicode is normalized.

UUIDv5 is deterministic, not secret. Anyone who knows the namespace and name can calculate the result, so do not embed credentials or sensitive text in the name.

## Upsert the Chunk with Audit Payload

Store the identity components in the payload even though the UUID encodes them indirectly. That makes cleanup and debugging possible:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(
    url="https://your-cluster.example.com:6333",
    api_key="YOUR_API_KEY",
)

text = "Severity 1 incidents require immediate paging."
vector = embed_with_your_pinned_model(text)

point_id = qdrant_chunk_id(
    corpus="support-handbook",
    source_id="article:incident-severity",
    chunker_version="recursive-800-100-v2",
    chunk_index=4,
)

client.upsert(
    collection_name="rag_chunks",
    wait=True,
    points=[
        models.PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "corpus": "support-handbook",
                "source_id": "article:incident-severity",
                "source_revision": "2026-08-28T09:00:00Z",
                "chunker_version": "recursive-800-100-v2",
                "chunk_index": 4,
                "text": text,
            },
        )
    ],
)
```

Replace `embed_with_your_pinned_model` with the application's embedding function, and verify that its vector length and distance metric match the existing collection. Do not recreate the collection during ingestion.

Qdrant's default upsert inserts an absent ID and overwrites an existing ID. Repeating this exact logical chunk therefore does not add another point. Because an upsert replaces the existing point, send the complete intended payload and vector set.

## Prove That a Retry Does Not Add a Point

Capture an exact count, run the same upsert twice, and retrieve the ID:

```python
before = client.count(collection_name="rag_chunks", exact=True).count

# Run the same client.upsert(...) call twice here.

after = client.count(collection_name="rag_chunks", exact=True).count
stored = client.retrieve(
    collection_name="rag_chunks",
    ids=[point_id],
    with_payload=True,
    with_vectors=False,
)

assert len(stored) == 1
assert stored[0].payload["source_id"] == "article:incident-severity"
print({"before": before, "after": after, "id": point_id})
```

The total may change because of unrelated writers, so perform this proof in an isolated test collection or compare a source-specific ID manifest in a shared environment. The definitive property is that both retries address the same point ID.

Be careful with `upload_collection`: Qdrant's Python client generates random UUIDs when IDs are omitted. That is convenient for one-off loads but defeats deterministic deduplication.

## Maintain a Source Manifest

For each ingestion generation, record the complete set of IDs expected for the source:

```text
source_id: article:incident-severity
source_revision: 2026-08-28T09:00:00Z
chunker_version: recursive-800-100-v2
point_ids: [uuid-0, uuid-1, uuid-2, ...]
```

After every new point has been upserted and verified, calculate:

```text
obsolete_ids = previous_manifest_ids - new_manifest_ids
```

Then delete only those obsolete IDs:

```python
if obsolete_ids:
    client.delete(
        collection_name="rag_chunks",
        points_selector=models.PointIdsList(points=sorted(obsolete_ids)),
        wait=True,
    )
```

Delete after successful new writes, not before. If the new run fails halfway, readers can continue using the previous generation. Where the application cannot tolerate mixed generations, stage into a new collection or add a revision filter and switch the active revision only after validation.

## Choose Overwrite or Insert-Only Intentionally

Default upsert is appropriate when a logical chunk slot is mutable: reprocessing updates its vector and payload under the same ID.

For an immutable ingestion contract, Qdrant 1.17+ supports:

```python
client.upsert(
    collection_name="rag_chunks",
    points=points,
    update_mode=models.UpdateMode.INSERT_ONLY,
    wait=True,
)
```

An existing ID is ignored in `INSERT_ONLY` mode. This prevents an unexpected producer from replacing it, but it also means a corrected payload will not be applied. Use `UPDATE_ONLY` when missing IDs must not be inserted.

Deterministic IDs do not resolve concurrent conflicting content under the same identity. Assign one writer per source, use a source revision check, or serialize ingestion so that the chosen revision wins deliberately.

## When to Use uint64 IDs

Qdrant also accepts the full unsigned 64-bit integer range. A pipeline can derive one from the first eight bytes of a cryptographic hash, but reducing identity to 64 bits creates a larger collision risk than a UUID and requires collision detection. Cross-language pipelines must also handle 64-bit integers without numeric truncation.

Use uint64 when an upstream system already owns a stable numeric ID or when its tradeoffs are explicitly managed. UUIDv5 is usually clearer for composite RAG identities.

## Custom Sharding Caveat

Keep IDs globally stable even with user-defined shard keys. Qdrant documents that custom sharding currently enforces ID uniqueness only within a shard key, and using the same point ID under different shard keys is unsupported and an anti-pattern. Derive the shard key from the same stable tenant or corpus identity and route every retry consistently.

## Rollback and Recovery

Retain both the previous source manifest and reconstructible source content. To roll back a generation:

1. re-upsert the complete previous points from the source of truth;
2. verify their IDs and payload revisions;
3. delete only IDs introduced by the failed generation;
4. restore the previous active revision or collection alias.

A Qdrant snapshot protects broader data recovery, while the manifest makes a source-scoped rollback precise. Never delete by a loosely tested payload filter during an incident.

## Limitations and Version Scope

Qdrant point IDs remain uint64 or UUID; a hex digest is not automatically a UUID. The `update_mode` examples require Qdrant 1.17 or later. The example uses Python's UUIDv5 implementation defined by RFC 9562; every producer must use the same namespace, canonical serialization, and normalization rules.

## Official Documentation

- [Qdrant point IDs, random client IDs, and idempotent loading](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant upsert points API](https://api.qdrant.tech/api-reference/points/upsert-points)
- [Qdrant delete points API](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant distributed deployment and custom-sharding ID caveat](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Python `uuid` module and UUIDv5](https://docs.python.org/3/library/uuid.html)

## Conclusion

Prevent duplicate RAG chunks by making point identity a deterministic part of the ingestion contract. A frozen UUIDv5 namespace plus canonical source, chunker, and index fields gives every retry the same Qdrant ID. Pair that with complete-point upserts, source manifests, and explicit deletion of obsolete IDs to handle both retries and document evolution safely.
