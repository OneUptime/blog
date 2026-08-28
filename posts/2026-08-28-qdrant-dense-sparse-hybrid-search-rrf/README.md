# How to Build Dense-and-Sparse Hybrid Search in Qdrant with RRF Fusion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Hybrid Search, Vector Search, Information Retrieval

Description: Learn how to store named dense and sparse vectors and fuse their candidate rankings with Qdrant's current Query API and Reciprocal Rank Fusion.

---

Dense retrieval is good at semantic similarity, while sparse retrieval preserves exact lexical signals such as product codes, names, and uncommon terms. Qdrant can store both representations on one point, retrieve candidates from both in one Query API request, and combine their ranks with Reciprocal Rank Fusion (RRF).

RRF uses each candidate's position rather than adding raw dense and sparse scores. That matters because cosine scores and lexical sparse scores do not naturally share a calibrated scale.

## Prerequisites

You need:

- Qdrant 1.10 or later for the Query API and prefetch-based hybrid queries.
- Qdrant 1.16 or later for the current parameterized <code>rrf</code> query object used as the primary example below.
- A current Python <code>qdrant-client</code> that includes <code>RrfQuery</code> and <code>Rrf</code>.
- One dense document vector and one sparse document vector for every point you want both retrievers to consider.
- Query vectors produced by the same dense model and sparse vocabulary/model used at ingestion.

The example uses small hand-authored vectors so the storage and query shapes are visible. In a real system, generate both representations with tested embedding models. Qdrant stores and searches the vectors; it does not make arbitrary dense and sparse vectors mutually compatible.

~~~bash
export QDRANT_URL=http://localhost:6333
~~~

Add an <code>api-key</code> header for Qdrant Cloud.

## Create Named Dense and Sparse Vector Spaces

Sparse vectors must be named. Use a named dense vector as well so each prefetch can select its representation explicitly:

~~~bash
curl -X PUT "$QDRANT_URL/collections/hybrid_documents" -H 'Content-Type: application/json' -d '{
    "vectors": {
      "dense": {
        "size": 4,
        "distance": "Cosine"
      }
    },
    "sparse_vectors": {
      "sparse": {}
    }
  }'
~~~

The equivalent Python collection configuration is:

~~~python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

client.create_collection(
    collection_name="hybrid_documents",
    vectors_config={
        "dense": models.VectorParams(
            size=4,
            distance=models.Distance.COSINE,
        )
    },
    sparse_vectors_config={
        "sparse": models.SparseVectorParams()
    },
)
~~~

Do not call a destructive recreate helper against an existing production collection. Current Qdrant releases can add named vectors to an existing schema, but existing points remain without values for a newly added vector until you populate them. For a new hybrid workload, defining both vector spaces before ingestion is the cleanest path.

## Upsert Both Vectors on Each Point

The vector map uses the same names declared in the collection:

~~~bash
curl -X PUT "$QDRANT_URL/collections/hybrid_documents/points?wait=true" -H 'Content-Type: application/json' -d '{
    "points": [
      {
        "id": 1,
        "vector": {
          "dense": [1.0, 0.0, 0.0, 0.0],
          "sparse": {
            "indices": [11, 42],
            "values": [1.0, 1.0]
          }
        },
        "payload": {"text": "reset an account password"}
      },
      {
        "id": 2,
        "vector": {
          "dense": [0.97, 0.03, 0.0, 0.0],
          "sparse": {
            "indices": [99],
            "values": [1.0]
          }
        },
        "payload": {"text": "recover access to an account"}
      },
      {
        "id": 3,
        "vector": {
          "dense": [0.0, 1.0, 0.0, 0.0],
          "sparse": {
            "indices": [42],
            "values": [1.2]
          }
        },
        "payload": {"text": "password policy reference"}
      }
    ]
  }'
~~~

A sparse vector contains parallel <code>indices</code> and <code>values</code> arrays. They must have the same length, and indices must be unique. Qdrant sorts unsorted indices internally, so do not use their input order to carry meaning.

Waiting on the upsert makes the example immediately queryable after the request returns.

## Query Both Representations and Fuse with RRF

The current RRF form uses two prefetches and makes RRF the main query:

~~~bash
curl -X POST "$QDRANT_URL/collections/hybrid_documents/points/query" -H 'Content-Type: application/json' -d '{
    "prefetch": [
      {
        "query": [1.0, 0.0, 0.0, 0.0],
        "using": "dense",
        "limit": 20
      },
      {
        "query": {
          "indices": [11, 42],
          "values": [1.0, 1.0]
        },
        "using": "sparse",
        "limit": 20
      }
    ],
    "query": {
      "rrf": {}
    },
    "limit": 10,
    "with_payload": true,
    "with_vector": false
  }'
~~~

The execution order is:

1. The dense prefetch retrieves up to 20 candidates using the named dense vector.
2. The sparse prefetch retrieves up to 20 candidates using the named sparse vector.
3. The top-level RRF query combines their rank positions.
4. The final <code>limit</code> returns at most 10 fused points.

Keep the fusion at the top level. Qdrant documents that top-level fusion merges across all shards in a distributed collection. Fusion nested inside a prefetch is calculated per shard and is not a replacement when a globally fused ranking is required.

## Run the Current Python Query

~~~python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

dense_query = [1.0, 0.0, 0.0, 0.0]
sparse_query = models.SparseVector(
    indices=[11, 42],
    values=[1.0, 1.0],
)

response = client.query_points(
    collection_name="hybrid_documents",
    prefetch=[
        models.Prefetch(
            query=dense_query,
            using="dense",
            limit=20,
        ),
        models.Prefetch(
            query=sparse_query,
            using="sparse",
            limit=20,
        ),
    ],
    query=models.RrfQuery(rrf=models.Rrf()),
    limit=10,
    with_payload=True,
    with_vectors=False,
)

assert response.points
assert response.points[0].id == 1

for point in response.points:
    print(point.id, point.score, point.payload["text"])
~~~

ID 1 should rank first in this fixture because it is first for both representations. Do not hard-code a particular fused score in a production test; validate IDs and relevance ordering, and allow for deliberate RRF configuration changes.

## Verify Each Retriever Before Blaming Fusion

Run each branch on its own:

~~~python
dense_only = client.query_points(
    collection_name="hybrid_documents",
    query=dense_query,
    using="dense",
    limit=5,
    with_payload=True,
)

sparse_only = client.query_points(
    collection_name="hybrid_documents",
    query=sparse_query,
    using="sparse",
    limit=5,
    with_payload=True,
)

print("dense:", [point.id for point in dense_only.points])
print("sparse:", [point.id for point in sparse_only.points])
print("hybrid:", [point.id for point in response.points])
~~~

This catches common ingestion problems:

- A point has only one named vector.
- The <code>using</code> name does not match the collection schema.
- The dense query has the wrong dimension.
- Sparse indices were produced by a different vocabulary.
- One retriever returns no useful candidates, leaving RRF little to combine.

Also retrieve a known point with vectors enabled during setup and confirm both <code>dense</code> and <code>sparse</code> entries exist. Disable vector return again for normal search to reduce response size.

## Size the Candidate Pools Deliberately

RRF only sees the candidates supplied by its prefetches. A final result cannot recover a relevant point that neither branch included.

Qdrant documents an important pagination constraint: a prefetch limit must be at least the main <code>limit + offset</code>. Even without an offset, each prefetch limit should normally be larger than the final limit so fusion has room to work. Larger candidate pools can improve coverage but consume more CPU, memory, and latency.

Tune independently:

- Dense HNSW search parameters and dense prefetch limit.
- Sparse prefetch limit.
- Final result limit.
- Optional branch score thresholds.
- RRF parameters on versions that support them.

Measure with a labeled relevance set. A hybrid query is not automatically better than both individual retrievers for every corpus.

## Understand RRF Scores

RRF rewards high rank and repeated appearance across candidate lists. Current Qdrant uses a default RRF constant <code>k = 2</code> and equal branch weights. Because it fuses ranks, the output score is an RRF score, not a cosine similarity or sparse dot-product score.

Do not apply a threshold chosen for raw dense scores to the fused output. If a branch needs a threshold, configure and validate it on that prefetch's own score distribution.

From Qdrant 1.16, set <code>k</code> explicitly:

~~~python
query=models.RrfQuery(
    rrf=models.Rrf(k=60),
)
~~~

From 1.17, current Qdrant also supports per-prefetch RRF weights:

~~~python
query=models.RrfQuery(
    rrf=models.Rrf(weights=[2.0, 1.0]),
)
~~~

Weights correspond to prefetch order. Tune them on held-out judgments; do not assume the dense branch always deserves more weight.

## Compatibility Form for Qdrant 1.10 Through 1.15

The Query API introduced RRF fusion in 1.10 using the fusion-query representation. It remains present in the current API reference:

~~~json
{
  "prefetch": [
    {
      "query": [1.0, 0.0, 0.0, 0.0],
      "using": "dense",
      "limit": 20
    },
    {
      "query": {"indices": [11, 42], "values": [1.0, 1.0]},
      "using": "sparse",
      "limit": 20
    }
  ],
  "query": {"fusion": "rrf"},
  "limit": 10
}
~~~

Its Python counterpart is:

~~~python
query=models.FusionQuery(fusion=models.Fusion.RRF)
~~~

Use one representation consistently:

- Qdrant 1.10–1.15: use <code>FusionQuery</code> and <code>{"fusion": "rrf"}</code>.
- Qdrant 1.16 and later: prefer <code>RrfQuery</code> and <code>{"rrf": {}}</code>, especially when configuring <code>k</code>.

An unknown model class or rejected query variant usually indicates a client/server version mismatch. Pin compatible versions and exercise the real deployment in CI.

## Filters, Consistency, and Performance

If hybrid search is tenant- or policy-scoped, apply a single reviewed Query API filter and create payload indexes for its fields. Do not let the dense and sparse branches represent different authorization scopes.

The Query endpoint accepts a read-consistency option for replicated collections. Stronger read consistency compares more replicas for that request and increases load; it is independent of RRF and does not improve relevance.

Dense and sparse retrieval have different cost structures. Qdrant's dense index uses HNSW and is approximate unless exact search is requested. Qdrant's sparse vector index is an exact inverted-index-style structure. Profile both prefetches as well as the combined request.

RRF avoids directly combining incomparable raw score scales, but it cannot fix weak embeddings, inconsistent sparse tokenization, missing vector values, undersized candidate pools, or incorrect filters.

## Version and Schema Notes

- Sparse vectors are supported from Qdrant 1.7 and must be named.
- The universal Query API and hybrid prefetch are available from 1.10.
- Parameterized RRF is available from 1.16.
- Weighted RRF is available from 1.17.
- Adding or deleting a named vector schema on an existing collection is available from 1.18; points must still be populated for a newly added vector.
- The current examples target the Qdrant 1.19 API and matching Python client.

## Official Documentation

- [Qdrant hybrid and multi-stage queries](https://qdrant.tech/documentation/search/hybrid-queries/)
- [Query points API reference](https://api.qdrant.tech/api-reference/search/query-points)
- [Qdrant dense and sparse hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/)
- [Create collection API reference](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant collections and named vectors](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant points and sparse vector representation](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant vector and sparse indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant consistency guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)

## Conclusion

Hybrid search in Qdrant is a schema-and-query pipeline: store compatible named dense and sparse vectors, prefetch candidates from both, and make RRF the top-level Query API operation. Verify each retriever independently, keep candidate limits larger than the final window, and pin the RRF syntax to your server/client version. RRF solves score-scale mismatch by fusing ranks; relevance still depends on good representations, filters, and evaluation.
