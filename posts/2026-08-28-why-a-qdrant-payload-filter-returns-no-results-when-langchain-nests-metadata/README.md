# Why a Qdrant Payload Filter Returns No Results When LangChain Nests Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, LangChain, RAG, Metadata Filtering, Metadata, Python, Vector Search

Description: Diagnose empty LangChain Qdrant searches by inspecting raw payloads and filtering the actual nested `metadata.<field>` path.

---

A LangChain `Document` can look flat in application code:

```python
Document(
    page_content="A support article",
    metadata={"source": "handbook"},
)
```

The current `langchain-qdrant` integration does not store `source` at the root of the Qdrant payload by default. It stores the document as:

```json
{
  "page_content": "A support article",
  "metadata": {
    "source": "handbook"
  }
}
```

Therefore, a Qdrant field condition on `source` looks for a root-level key that is absent and returns no matching points. The correct default path is `metadata.source`.

This guide targets the current `langchain_qdrant.QdrantVectorStore` integration. Its current documentation requires Qdrant 1.10 or later for the Query API. Legacy or custom integrations can use a different payload layout, so inspect stored data before changing a filter.

## Reproduce the Path Mismatch

Assume the vector store was initialized with the default payload keys and a document was added:

```python
from langchain_core.documents import Document

vector_store.add_documents(
    documents=[
        Document(
            page_content="Severity 1 incidents require immediate paging.",
            metadata={"source": "handbook", "tenant": "operations"},
        )
    ],
    ids=["cf667fb3-0f58-5ec2-87e6-4e7d62bb4c72"],
)
```

This filter targets the wrong JSON path:

```python
from qdrant_client import models

wrong_filter = models.Filter(
    must=[
        models.FieldCondition(
            key="source",
            match=models.MatchValue(value="handbook"),
        )
    ]
)

results = vector_store.similarity_search(
    query="How do I page a critical incident?",
    k=5,
    filter=wrong_filter,
)
print(results)  # Often [] even though the document exists.
```

Qdrant filters the stored payload, not the reconstructed `Document.metadata` object that LangChain returns to the application.

## Inspect the Raw Qdrant Payload

Use the underlying Qdrant client and scroll a few points without vectors:

```python
client = vector_store.client

points, next_offset = client.scroll(
    collection_name="rag_chunks",
    limit=3,
    with_payload=True,
    with_vectors=False,
)

for point in points:
    print(point.id, point.payload)
```

With the default integration, expect a shape like:

```python
{
    "page_content": "Severity 1 incidents require immediate paging.",
    "metadata": {
        "source": "handbook",
        "tenant": "operations",
    },
}
```

Do this in the same collection and environment used by the failing application. A local test collection, stale alias, or different tenant shard can otherwise produce a misleading result.

If `payload` is `None`, the content was likely loaded by another pipeline or without payload. If the keys are named differently, find the code that set `content_payload_key` and `metadata_payload_key`.

## Filter the Nested Path

Qdrant supports dot notation for nested payload fields. The correct filter for the default LangChain layout is:

```python
from qdrant_client import models

source_filter = models.Filter(
    must=[
        models.FieldCondition(
            key="metadata.source",
            match=models.MatchValue(value="handbook"),
        )
    ]
)

results = vector_store.similarity_search(
    query="How do I page a critical incident?",
    k=5,
    filter=source_filter,
)

for document in results:
    print(document.page_content, document.metadata)
```

The current LangChain API reference uses the same pattern in its example: a metadata value `{"bar": "baz"}` is filtered with `key="metadata.bar"`.

For deeper JSON, extend the full path. For example, a LangChain metadata object shaped as `{"tenant": {"id": "ops"}}` is stored under `metadata.tenant.id` by default.

## Test Filtering Without Embeddings

Separate filter debugging from vector search by using the same Qdrant filter with `scroll`:

```python
matching_points, _ = client.scroll(
    collection_name="rag_chunks",
    scroll_filter=source_filter,
    limit=10,
    with_payload=True,
    with_vectors=False,
)

for point in matching_points:
    print(point.id, point.payload)
```

If this returns the expected points but `similarity_search` does not, the payload path is fixed and the remaining problem lies elsewhere: collection or vector name, query embedding, retrieval mode, score threshold, shard selection, or search parameters.

If the scroll is also empty, compare the raw payload carefully:

- field names are case-sensitive;
- a keyword exact match is case-sensitive (`handbook` differs from `Handbook`);
- the stored JSON type must match the condition (`"42"` differs from integer `42`);
- a missing key does not match;
- the application may have customized the metadata payload key;
- old and new ingestion versions may have different schemas in one collection.

## Account for Custom Payload Keys

LangChain exposes both payload key names:

```python
from langchain_qdrant import QdrantVectorStore

vector_store = QdrantVectorStore(
    client=client,
    collection_name="rag_chunks",
    embedding=embeddings,
    content_payload_key="body",
    metadata_payload_key="my_meta",
)
```

With that configuration, LangChain stores:

```json
{
  "body": "A support article",
  "my_meta": {
    "source": "handbook"
  }
}
```

The filter path is now `my_meta.source`, not `metadata.source`. The configured key must match how existing points were written. Merely changing `metadata_payload_key` on a reader does not move or rewrite stored payloads.

## Create an Index on the Exact Path

After correctness is proven, create a payload index for frequently filtered fields. Index the complete nested path, not its parent and not the flat field you originally expected:

```bash
curl -X PUT \
  'http://localhost:6333/collections/rag_chunks/index?wait=true' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "field_name": "metadata.source",
    "field_schema": "keyword"
  }'
```

Use HTTPS and the `api-key` header for a secured cluster. A `keyword` index is appropriate for exact categorical values such as a source name. Create indexes for the fields actually used by filters; every index consumes resources.

Qdrant Cloud enables strict mode for new collections by default and rejects retrieval filters on unindexed payload fields. That case produces an error rather than an empty result. If `metadata.source` is correct but the request is rejected for unindexed filtering, create the exact payload index instead of disabling strict mode.

Verify the collection's `payload_schema` through `client.get_collection("rag_chunks")`, then repeat the direct scroll and LangChain search.

## Migrate a Mixed Payload Schema Safely

Collections sometimes contain older root-level payloads and newer LangChain-nested payloads. Pick one target schema and migrate deliberately:

1. snapshot the collection or preserve a reconstructible source;
2. sample and count points for each known layout;
3. create the payload index on the target path;
4. update ingestion to write the target layout consistently;
5. backfill payloads in bounded batches while preserving point IDs and vectors;
6. temporarily query both paths with a reviewed `should` filter if zero downtime is required;
7. switch readers to the target path after count and query validation;
8. remove legacy payload keys only after the rollback window.

Do not recreate the collection just to move metadata. Qdrant provides payload update operations, and LangChain can reuse an existing collection when configured with the matching keys.

## Verification and Rollback

Verify at three layers:

- **Raw storage:** scroll returns the expected nested payload and types.
- **Qdrant filter:** direct filtered scroll returns the expected point IDs.
- **LangChain retrieval:** `similarity_search(..., filter=source_filter)` returns documents from the intended source.

Add regression tests that assert the raw key path as well as returned `Document.metadata`, because LangChain removes the wrapper when reconstructing a `Document` and can make the nesting easy to overlook.

If a new custom-key rollout fails, restore the previous `content_payload_key`, `metadata_payload_key`, and filter paths, then re-enable the old read route. Do not delete old keys or indexes until all readers use the new schema and a rollback no longer depends on them.

## Limitations and Version Scope

The exact default paths in this article apply to current `langchain-qdrant` `QdrantVectorStore`, whose latest reference at writing is version 1.1.0: `page_content` and `metadata`. The deprecated legacy `Qdrant` class, a custom serializer, or data written directly with `qdrant-client` may differ. Qdrant's Query API requirement in the current LangChain integration is Qdrant 1.10 or later. Always inspect raw payloads and pinned package versions.

## Official Documentation

- [LangChain Qdrant integration and default payload structure](https://docs.langchain.com/oss/python/integrations/vectorstores/qdrant)
- [LangChain `QdrantVectorStore` API reference and `metadata.bar` filter example](https://reference.langchain.com/python/langchain-qdrant/qdrant/QdrantVectorStore)
- [Qdrant filtering and nested-key dot notation](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant payload indexes and nested paths](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant Cloud strict-mode defaults](https://qdrant.tech/documentation/cloud/configure-cluster/)
- [Qdrant scroll points API](https://api.qdrant.tech/api-reference/points/scroll-points)

## Conclusion

When LangChain writes a default Qdrant payload, metadata lives below the `metadata` key. Inspect a raw point, filter `metadata.source` rather than `source`, and build the payload index on that same complete path. Testing the filter directly with Qdrant scroll cleanly separates payload-schema problems from embedding and vector-search problems.
