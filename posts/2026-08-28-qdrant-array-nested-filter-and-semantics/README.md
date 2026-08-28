# How to Filter Qdrant Arrays and Nested Objects with Correct AND Semantics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Filtering, Payload, Python

Description: Learn why separate Qdrant array conditions can match different elements and how nested filters enforce same-element AND semantics.

---

Qdrant payload filters look like ordinary Boolean expressions, but arrays of objects introduce an important distinction: should each condition match somewhere in the array, or must all conditions match the same object? A plain outer <code>must</code> implements the first meaning. A <code>nested</code> condition implements the second.

This guide builds a reproducible example, demonstrates the false positive, and shows the equivalent REST and Python forms of the correct filter.

## Prerequisites

You need:

- Qdrant server 1.4 or later. Nested object filters were introduced in 1.2, while the Boolean payload index used below requires 1.4.
- REST access on port 6333 or a compatible Qdrant Cloud endpoint.
- For Python, a current <code>qdrant-client</code> package compatible with your server.
- A snapshot or another recovery plan before adapting these examples to production data.

Set the URL and, for Qdrant Cloud, add the <code>api-key</code> header to every curl request:

~~~bash
export QDRANT_URL=http://localhost:6333
~~~

## Build a Small Test Collection

The two points below deliberately separate <code>food = meat</code> and <code>likes = true</code> in point 2:

~~~bash
curl -X PUT "$QDRANT_URL/collections/dinosaurs" -H 'Content-Type: application/json' -d '{
    "vectors": {
      "size": 2,
      "distance": "Cosine"
    }
  }'

curl -X PUT "$QDRANT_URL/collections/dinosaurs/points?wait=true" -H 'Content-Type: application/json' -d '{
    "points": [
      {
        "id": 1,
        "vector": [1.0, 0.0],
        "payload": {
          "dinosaur": "t-rex",
          "diet": [
            {"food": "leaves", "likes": false},
            {"food": "meat", "likes": true}
          ]
        }
      },
      {
        "id": 2,
        "vector": [0.0, 1.0],
        "payload": {
          "dinosaur": "diplodocus",
          "diet": [
            {"food": "leaves", "likes": true},
            {"food": "meat", "likes": false}
          ]
        }
      }
    ]
  }'
~~~

The vectors are only placeholders; Scroll can evaluate the payload filter without a query vector.

## Why an Ordinary AND Matches Both Points

Qdrant treats an array field condition as satisfied when at least one array value matches it. The following outer <code>must</code> therefore asks two independent questions:

1. Does any <code>diet</code> element have <code>food = meat</code>?
2. Does any <code>diet</code> element have <code>likes = true</code>?

~~~bash
curl -X POST "$QDRANT_URL/collections/dinosaurs/points/scroll" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {"key": "diet[].food", "match": {"value": "meat"}},
        {"key": "diet[].likes", "match": {"value": true}}
      ]
    },
    "limit": 10,
    "with_payload": true,
    "with_vector": false
  }'
~~~

Both IDs match. For ID 1, both conditions happen to match <code>diet[1]</code>. For ID 2, meat matches <code>diet[1]</code> while true matches <code>diet[0]</code>. The outer AND does not correlate those array positions.

This form is correct when different elements are allowed to satisfy different requirements. It is incorrect for a rule such as “a single diet entry must be meat and liked.”

## Enforce Same-Element Semantics with a Nested Filter

Focus the filter on the array and make the inner field names relative to each element:

~~~bash
curl -X POST "$QDRANT_URL/collections/dinosaurs/points/scroll" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {
          "nested": {
            "key": "diet",
            "filter": {
              "must": [
                {"key": "food", "match": {"value": "meat"}},
                {"key": "likes", "match": {"value": true}}
              ]
            }
          }
        }
      ]
    },
    "limit": 10,
    "with_payload": true,
    "with_vector": false
  }'
~~~

Qdrant evaluates the inner filter against one array object at a time. The parent point matches if at least one object satisfies the entire inner filter. The nested key may be written as <code>diet</code> or <code>diet[]</code>; inside it, use <code>food</code> and <code>likes</code>, not the full parent path.

The equivalent Python is:

~~~python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

same_entry_filter = models.Filter(
    must=[
        models.NestedCondition(
            nested=models.Nested(
                key="diet",
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="food",
                            match=models.MatchValue(value="meat"),
                        ),
                        models.FieldCondition(
                            key="likes",
                            match=models.MatchValue(value=True),
                        ),
                    ]
                ),
            )
        )
    ]
)

points, next_offset = client.scroll(
    collection_name="dinosaurs",
    scroll_filter=same_entry_filter,
    limit=10,
    with_payload=True,
    with_vectors=False,
)

assert [point.id for point in points] == [1]
assert next_offset is None
~~~

The expected result is only ID 1.

## Choose the Filter Shape from the Business Rule

Use separate outer conditions when the requirement is existential across the whole array:

> The document has some meat entry and some liked entry.

Use one nested filter when all predicates must hold for one element:

> The document has an entry whose food is meat and whose likes value is true.

If the requirement explicitly needs two potentially different elements, use two nested conditions in the outer <code>must</code>. For example, one nested block can require a liked meat entry while another requires a disliked leaves entry. Each block correlates its own predicates, while the outer AND requires both qualifying elements to exist.

Primitive arrays do not need a nested block. A match on <code>colors</code> for <code>red</code> succeeds when at least one value in the primitive array equals red. Nested filters are specifically useful when correlating fields within objects in an array.

## Index the Leaf Fields Used by the Filter

For production filtered search, create payload indexes for the leaf paths that appear in conditions. Qdrant does not choose payload indexes automatically.

~~~bash
curl -X PUT "$QDRANT_URL/collections/dinosaurs/index?wait=true" -H 'Content-Type: application/json' -d '{"field_name": "diet[].food", "field_schema": "keyword"}'

curl -X PUT "$QDRANT_URL/collections/dinosaurs/index?wait=true" -H 'Content-Type: application/json' -d '{"field_name": "diet[].likes", "field_schema": "bool"}'
~~~

The schema must match both the stored type and the condition: keyword supports exact string matching, while bool supports Boolean matching. Indexes consume memory and disk, so create them for fields that are actually filtered. Qdrant recommends creating them before ingesting data so a later HNSW build can include filter-aware edges.

## Common Mistakes

- Putting <code>diet[].food</code> inside the nested filter. Inner keys are relative to one <code>diet</code> object.
- Assuming outer <code>must</code> correlates array indexes. It only requires every condition to be true somewhere in the point payload.
- Using nested semantics for primitive arrays. There are no sibling object fields to correlate.
- Moving a point-level condition inside the nested block. Current Qdrant does not support <code>has_id</code> or <code>slice</code> inside a nested object filter; place either in an adjacent outer <code>must</code>.
- Testing only positive data. Include a point like ID 2, where different elements satisfy the separate predicates, to catch accidental cross-element matches.

## Version and Operational Notes

- Nested object filters are available from Qdrant 1.2.
- The <code>slice</code> condition is newer, and neither it nor <code>has_id</code> can be placed inside a nested filter.
- Filters affect retrieval, search, update, and delete selectors. Validate a destructive selector first with Scroll or an exact Count request.
- An index improves execution and cardinality estimation; it does not change matching semantics. A wrong outer filter remains logically wrong after indexing.

## Official Documentation

- [Qdrant filtering and nested object filters](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant payload types and array matching behavior](https://qdrant.tech/documentation/manage-data/payload/)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Scroll points API reference](https://api.qdrant.tech/api-reference/points/scroll-points)

## Conclusion

An outer <code>must</code> combines independent conditions over the point, so different array objects may satisfy each condition. Wrap the conditions in one <code>nested</code> block when the same array object must satisfy all of them. Verify the logic with an adversarial fixture, keep inner keys relative, and index the full leaf paths only after the semantics are correct.
