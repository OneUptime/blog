# How to Create Qdrant Payload Indexes for Fast Filtered Vector Search

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Indexing, Vector Search, Performance

Description: Learn how to choose, create, verify, and safely time Qdrant payload indexes for predictable filtered vector search.

---

A Qdrant vector index accelerates nearest-neighbor search; it does not by itself make payload filtering efficient. A payload index is a per-field, typed index that speeds compatible filter conditions and gives the query planner better cardinality estimates.

Qdrant deliberately does not index every payload field automatically. You must choose the fields and schemas that match the filters your application actually sends.

## Prerequisites

Before changing a collection:

- Inventory the exact filters used by search, Scroll, count, and filtered update/delete operations.
- Sample stored payload values and confirm their JSON types are stable.
- Prefer creating indexes immediately after collection creation and before bulk ingestion.
- Schedule post-ingestion index work during a quiet period and watch CPU, memory, disk, and request latency.
- Test against the same Qdrant server and Python client minor versions used in production.

The examples use a collection named <code>products</code> and REST on port 6333:

~~~bash
export QDRANT_URL=http://localhost:6333
~~~

Add the Qdrant Cloud <code>api-key</code> header when required.

## Match the Index Schema to the Filter

An index only helps the conditions supported by its schema.

| Payload index | Intended filter conditions |
|---|---|
| <code>keyword</code> | Exact Match; optional whole-value prefix matching on current releases |
| <code>integer</code> | Match and numeric Range |
| <code>float</code> | Numeric Range |
| <code>bool</code> | Boolean Match |
| <code>geo</code> | Geo radius and bounding-box conditions |
| <code>datetime</code> | Datetime Range |
| <code>text</code> | Full-text conditions using configured tokenization |
| <code>uuid</code> | Match for UUID values with a UUID-optimized representation |

Do not use a text index when the requirement is exact matching of an identifier, category, path, or SKU. Text indexes tokenize strings; keyword indexes preserve whole values. Conversely, a keyword index does not provide tokenized full-text search.

The stored JSON type also matters. A numeric Range condition does not match a number stored as a string.

## Create the Indexes with REST

Suppose the application filters on category equality, an integer price range, and availability:

~~~bash
curl -X PUT "$QDRANT_URL/collections/products/index?wait=true" -H 'Content-Type: application/json' -d '{
    "field_name": "category",
    "field_schema": "keyword"
  }'

curl -X PUT "$QDRANT_URL/collections/products/index?wait=true" -H 'Content-Type: application/json' -d '{
    "field_name": "price_cents",
    "field_schema": "integer"
  }'

curl -X PUT "$QDRANT_URL/collections/products/index?wait=true" -H 'Content-Type: application/json' -d '{
    "field_name": "available",
    "field_schema": "bool"
  }'
~~~

The <code>wait=true</code> query parameter asks Qdrant to return after each index operation has actually completed. Without it, an update response can be only <code>acknowledged</code>, meaning the operation was accepted for background processing.

For a nested leaf, pass its dot-style path as <code>field_name</code>. Index the same logical leaf path referenced by the filter rather than the entire parent object.

## Create the Same Indexes with Python

~~~python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

client.create_payload_index(
    collection_name="products",
    field_name="category",
    field_schema=models.PayloadSchemaType.KEYWORD,
    wait=True,
)

client.create_payload_index(
    collection_name="products",
    field_name="price_cents",
    field_schema=models.PayloadSchemaType.INTEGER,
    wait=True,
)

client.create_payload_index(
    collection_name="products",
    field_name="available",
    field_schema=models.PayloadSchemaType.BOOL,
    wait=True,
)
~~~

If an integer field is only used for one kind of condition, current Qdrant versions can use a parameterized integer index:

~~~python
client.create_payload_index(
    collection_name="products",
    field_name="created_sequence",
    field_schema=models.IntegerIndexParams(
        type=models.IntegerIndexType.INTEGER,
        lookup=False,
        range=True,
    ),
    wait=True,
)
~~~

The regular integer schema enables both lookup and range behavior by default. Disable one only after confirming the application never uses its corresponding condition; using a disabled condition can cause a major performance regression.

## Verify the Installed Schema

Do not treat an HTTP 200 response alone as the final check. Read the collection information and inspect <code>payload_schema</code>:

~~~bash
curl -s "$QDRANT_URL/collections/products" |
  jq '.result.payload_schema'
~~~

A simplified result should contain:

~~~json
{
  "category": {"data_type": "keyword"},
  "price_cents": {"data_type": "integer"},
  "available": {"data_type": "bool"}
}
~~~

The Python client exposes the same collection information:

~~~python
info = client.get_collection(collection_name="products")

required = {"category", "price_cents", "available"}
missing = required.difference(info.payload_schema)
assert not missing, f"Missing payload indexes: {sorted(missing)}"

for field_name in sorted(required):
    print(field_name, info.payload_schema[field_name].data_type)
~~~

Then run a real filtered request using the same filter shape as production. Scroll is useful for a correctness check without needing a query vector:

~~~bash
curl -X POST "$QDRANT_URL/collections/products/points/scroll" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {"key": "category", "match": {"value": "laptop"}},
        {"key": "price_cents", "range": {"gte": 50000, "lt": 150000}},
        {"key": "available", "match": {"value": true}}
      ]
    },
    "limit": 10,
    "with_payload": ["category", "price_cents", "available"],
    "with_vector": false
  }'
~~~

For performance validation, replay a representative distribution of vector queries and filters, not one hand-picked request. Compare latency percentiles, resource use, and recall before and after the change. The presence of a payload schema proves the index exists; it does not by itself prove that a particular workload improved.

## Create Indexes Before Ingestion

Timing matters for two related structures:

1. The payload index accelerates compatible filter evaluation and cardinality estimation.
2. Qdrant's filterable HNSW graph can add payload-aware edges when the HNSW graph is generated after the payload indexes exist.

The preferred sequence is therefore:

1. Create the collection.
2. Create the required payload indexes and wait for completion.
3. Ingest the points.
4. Let the optimizer build the vector index.
5. Verify the collection state and benchmark production filter shapes.

Creating a payload index after ingestion still creates the payload index, but it does not retroactively give an existing HNSW graph all of the filter-aware edges it could have had. Qdrant's official procedure for forcing an HNSW rebuild is to change <code>ef_construct</code> slightly, such as increasing it by one. That rebuild is resource-intensive and can take a long time. Read the current value first, change it deliberately, and do not immediately revert it, because another change would trigger another rebuild.

Treat payload-index creation and any HNSW rebuild as separate operational steps. A completed create-index request does not mean that you also performed a later, optional HNSW rebuild.

## Index Selectively

Every payload index consumes storage and memory. Prioritize:

- Fields that appear frequently in filters.
- Fields with selective values that substantially narrow the candidate set.
- Fields needed for strict-mode compliance.
- Leaf fields used in nested filters.

Avoid indexing large numbers of unused or open-ended keys. When payload keys are dynamic, remodel them into a fixed key/value shape that can be indexed predictably.

Qdrant strict mode can reject retrieval queries that filter on unindexed fields by setting <code>unindexed_filtering_retrieve</code> to false. This converts an accidental scan into an immediate error. Current Qdrant Cloud collections apply these protections by default, so a filter that worked on an unrestricted local server may be rejected in Cloud until the matching index exists.

## Roll Back an Index

Deleting a payload index removes the index structure, not the point payload:

~~~bash
curl -X DELETE "$QDRANT_URL/collections/products/index/category?wait=true"
~~~

Or use Python:

~~~python
client.delete_payload_index(
    collection_name="products",
    field_name="category",
    wait=True,
)
~~~

Verify that <code>category</code> disappears from <code>payload_schema</code>. Filter correctness remains the same on an unrestricted collection, but performance can fall sharply, and strict mode may reject the now-unindexed filter. Recreate the index if either behavior is unacceptable.

## Version Notes

- Boolean payload indexes are available from Qdrant 1.4.
- Datetime indexes and parameterized integer indexes are available from 1.8.
- UUID indexes are available from 1.11.
- Whole-keyword prefix indexing is available from 1.19 and requires an explicitly prefix-enabled keyword index.
- The current 1.19 documentation uses memory tiers for index placement. Older releases use legacy options such as <code>on_disk</code>; consult the documentation for your deployed minor version before copying advanced storage parameters.

## Official Documentation

- [Qdrant indexing and payload index schemas](https://qdrant.tech/documentation/manage-data/indexing/)
- [Create payload index API reference](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Delete payload index API reference](https://api.qdrant.tech/api-reference/indexes/delete-field-index)
- [Collection information and payload schema](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant filtering](https://qdrant.tech/documentation/search/filtering/)
- [Bulk upload guidance](https://qdrant.tech/documentation/tutorials/bulk-upload/)

## Conclusion

Fast filtered search starts with the right field schema, not with indexing every payload key. Index the fields and condition types your application actually uses, create those indexes before ingestion when possible, wait for and verify each operation, and benchmark representative queries. If indexes are added after data is already indexed, plan any filter-aware HNSW rebuild as a separate, expensive maintenance operation.
