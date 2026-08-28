# Cosine, Dot Product, or Euclidean: How to Choose a Qdrant Distance Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Vector Search, Distance Metrics, Cosine Similarity, Dot Product, Similarity Metrics, AI Embeddings

Description: Choose a Qdrant distance metric from the embedding model's contract, test it safely, and migrate without recreating a live collection in place.

---

The distance metric is part of a Qdrant vector space, not a cosmetic search option. It determines what “nearest” means for every dense vector stored under that vector name. A collection's unnamed vector has one configured dimension and metric; each named vector can have its own dimension and metric.

The first rule is simple: use the metric recommended by the embedding model's documentation. The model was trained with a particular similarity objective, and changing that objective at storage time can quietly reduce retrieval quality even though every request still succeeds.

This guide covers dense vectors in current Qdrant releases. Sparse vectors use their own scoring behavior and do not offer this Cosine-versus-Dot-versus-Euclid choice.

## Understand the Three Metrics

| Qdrant value | What it measures | Prefer it when |
| --- | --- | --- |
| `Cosine` | Direction after L2 normalization | Vector magnitude should not influence relevance; this is common for semantic text embeddings |
| `Dot` | Inner product, including direction and magnitude | The model explicitly recommends dot product, or vector norm deliberately carries ranking information |
| `Euclid` | Straight-line L2 distance | Absolute numeric separation matters, such as standardized spatial or feature vectors, or the model explicitly recommends L2 |

Qdrant implements Cosine efficiently by normalizing vectors when they are uploaded and then using a dot product. That has two practical consequences:

- the magnitude of the vector supplied to a Cosine collection is discarded;
- a vector read back from a Cosine collection can differ from the uploaded values because the stored vector is normalized.

If preserving the original vector values is a strict requirement, Qdrant recommends considering `Dot` instead-but only if Dot is semantically correct for the model.

For unit-normalized indexed vectors and a unit-normalized query, Cosine, Dot, and Euclidean produce the same ranking for a fixed query. Their returned scores are still on different scales. Without unit normalization, Dot can favor longer vectors and Euclidean is sensitive to both scale and magnitude.

## Start with the Model Contract

Before creating a collection, record:

- the exact embedding model and revision;
- the output dimension;
- whether the provider normalizes embeddings;
- the provider's recommended similarity metric;
- any preprocessing applied before embedding.

If the provider is silent, Qdrant's distance-metric guidance recommends Cosine as a safe default. Do not infer a metric from an unrelated example that happens to use the same vector dimension.

For hand-crafted features, standardize dimensions before using Euclidean when their numeric ranges differ. Otherwise, the largest-scale feature can dominate distance.

## Inspect the Existing Collection First

Do not call `recreate_collection` to “correct” a production metric. Inspect the current schema:

```python
from qdrant_client import QdrantClient

client = QdrantClient(
    url="https://your-cluster.example.com:6333",
    api_key="YOUR_API_KEY",
)

info = client.get_collection("documents")
print(info.config.params.vectors)
```

For an unnamed vector, the result includes one size and distance. For named vectors it is a mapping, so inspect the exact vector name used by the application. Also compare the configured dimension with a fresh embedding from the pinned model.

An existing vector name's size and distance are schema choices. Qdrant's collection update API can change operational settings such as HNSW, quantization, memory tier, and on-disk placement, but it does not provide an in-place edit of an existing vector space's size or distance. Use a new vector space when either changes.

## Compare Metrics in Disposable Collections

Ranking quality should be measured on representative, labeled queries-not guessed from a few attractive results. A small scratch test can reveal obvious behavior differences before a larger evaluation:

```python
import uuid

from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

points = [
    models.PointStruct(id=1, vector=[1.0, 0.0, 0.0], payload={"label": "east"}),
    models.PointStruct(id=2, vector=[2.0, 0.1, 0.0], payload={"label": "long-east"}),
    models.PointStruct(id=3, vector=[0.0, 1.0, 0.0], payload={"label": "north"}),
]
query = [1.0, 0.2, 0.0]

run_suffix = uuid.uuid4().hex[:8]
metrics = {
    f"metric-test-cosine-{run_suffix}": models.Distance.COSINE,
    f"metric-test-dot-{run_suffix}": models.Distance.DOT,
    f"metric-test-euclid-{run_suffix}": models.Distance.EUCLID,
}
created = []

try:
    for collection, distance in metrics.items():
        client.create_collection(
            collection_name=collection,
            vectors_config=models.VectorParams(size=3, distance=distance),
        )
        created.append(collection)
        client.upsert(collection_name=collection, points=points, wait=True)
        result = client.query_points(
            collection_name=collection,
            query=query,
            limit=3,
            with_payload=True,
        )
        print(collection, [(p.payload["label"], p.score) for p in result.points])
finally:
    for collection in created:
        client.delete_collection(collection)
```

Use unique scratch names and never point this cleanup code at a production collection. The important comparison is ranking and task relevance. Do not compare raw scores across metrics as though they shared a scale: higher Cosine or Dot means more similar, while a larger Euclidean score represents a more distant result. Qdrant's `score_threshold` handles that direction difference, but a threshold tuned for one metric cannot simply be copied to another.

## Validate on Real Retrieval Data

Build a fixed evaluation set containing real queries, expected relevant point IDs, and important negative examples. For each candidate metric:

1. generate every query and document vector with the same pinned model and preprocessing;
2. load identical vectors and payloads into separate scratch collections or named vector spaces;
3. run the same filtered queries and search parameters;
4. compare recall at K, precision at K, rank of the first relevant result, and application-level outcomes;
5. repeat after HNSW indexing has finished if the collection crosses the indexing threshold; below that threshold, Qdrant may continue using exact search.

Also sample stored vectors with `with_vectors=True` and calculate their L2 norms. Dot and Cosine rankings are equivalent only under the required normalization conditions. During a migration from another database, confirm its score convention: for example, another system might report `1 - cosine similarity`, squared L2, or negative inner product even when the underlying ranking is comparable.

## Migrate a Live Collection Safely

Changing the metric means building a new vector space and revalidating it.

For a broadly compatible migration:

1. take a snapshot or confirm that the source data and embedding pipeline can rebuild the collection;
2. create a new collection with the required size and distance;
3. enable dual writes before backfilling, and ensure that writes to both collections succeed;
4. backfill using stable point IDs, the complete intended payload, and a concurrency-safe mode such as `models.UpdateMode.INSERT_ONLY` so older records do not overwrite newer dual-written points;
5. compare exact counts, sampled payloads, vector dimensions, and labeled retrieval metrics;
6. switch a collection alias or application configuration to the new collection;
7. retain the old collection through an observation window before removing it.

This blue-green pattern works as written for upserts. Pause deletes and partial updates during the backfill or handle them with explicit reconciliation logic so that the backfill cannot resurrect deleted points or overwrite newer state. Insert-only upserts require Qdrant 1.16 or later; on older releases, provide equivalent conflict protection.

Qdrant 1.18 added another option for collections already designed with named vectors: add a new named vector with the new size and metric, start writing both vector names on every upsert, populate the new vector in the background, change queries to `using=<new-name>`, and remove the old named vector only after validation. Existing points have no value for a newly added vector until it is populated.

Do not delete the old collection or vector name as part of the cutover transaction. Keeping it intact makes rollback a routing change instead of a data reconstruction exercise.

## Verification and Rollback

After cutover, verify:

- collection health and optimizer status;
- expected point and vector counts;
- no dimension or missing-vector errors in application logs;
- query latency and empty-result rate;
- retrieval quality against the frozen evaluation set;
- any score thresholds or reranker inputs recalibrated for the new score scale.

If quality or latency regresses, route the alias or application back to the old collection, or switch `using` back to the old named vector. Continue dual-writing until the failed candidate has been diagnosed. A rollback is not complete if new writes exist only in the candidate space.

## Limitations and Version Scope

The examples use the current Qdrant Python client and Query API. Adding or deleting vector names on an existing collection requires Qdrant 1.18 or later and applies to named vector schemas. Older releases, unnamed-vector designs, or a change that requires a separate operational boundary should use a new collection.

Approximate indexing, quantization, filters, and reranking can also change result quality. Hold those settings constant when isolating the effect of a distance metric.

## Official Documentation

- [Qdrant collections and distance metrics](https://qdrant.tech/documentation/manage-data/collections/)
- [Qdrant distance metrics course](https://qdrant.tech/course/essentials/day-1/distance-metrics/)
- [Qdrant similarity search and score thresholds](https://qdrant.tech/documentation/search/)
- [Qdrant data-integrity checks for vector dimension and metric](https://qdrant.tech/documentation/migration-guidance/data-integrity/)
- [Diagnosing score and metric discrepancies](https://qdrant.tech/documentation/migration-guidance/diagnosing-discrepancies/)
- [Migrating to a new embedding model](https://qdrant.tech/documentation/tutorials-operations/embedding-model-migration/)

## Conclusion

Choose the metric promised by the embedding model, use Cosine only as the documented fallback when that promise is absent, and validate with labeled retrieval data. Because dimension and metric define a vector space, migrate through a new collection or-on Qdrant 1.18+-a new named vector, then keep the old route available until production verification is complete.
