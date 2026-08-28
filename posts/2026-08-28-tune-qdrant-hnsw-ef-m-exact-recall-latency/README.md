# How to Tune Qdrant HNSW ef, m, and exact Search for Recall vs Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, HNSW, Vector Search, Recall, Latency, Performance Tuning

Description: Build an exact-search recall baseline, tune query-time hnsw_ef first, and rebuild m or ef_construct only when the graph limits achievable quality.

---

Qdrant's HNSW index trades exhaustive comparison for fast approximate nearest-neighbor search. Three settings affect different phases:

- `hnsw_ef` controls the dynamic candidate list for one query;
- `m` controls how many graph edges each indexed point can have;
- `ef_construct` controls how many neighbors are considered while the graph is built;
- `exact: true` bypasses HNSW and scans the eligible vectors, which is useful as a correctness baseline but expensive for large candidate sets.

Tune them in that order of disruption: measure exact results, sweep `hnsw_ef`, and change build-time graph settings only when query-time tuning cannot reach the recall target.

## Define the Workload and Target

Use representative production queries, filters, vector names, result limits, shard layout, consistency settings, and payload selection. A synthetic unfiltered query can hide the path used by a selective production filter.

Track at least:

- recall@k against exact results;
- p50, p95, and p99 latency;
- query throughput and CPU;
- disk reads and page-cache state;
- memory used by vectors, HNSW, payload, and payload indexes;
- collection and optimizer status.

Do not optimize only average latency. Raising `hnsw_ef` increases work per query, so concurrency can amplify its tail-latency cost.

## Establish an Exact Ground Truth

Run the same query twice, changing only `exact`:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333", api_key="...")

query_vector = [0.12, -0.08, 0.31]  # Use the collection's full dimension.

exact = client.query_points(
    collection_name="documents",
    query=query_vector,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="tenant_id",
                match=models.MatchValue(value="tenant-42"),
            )
        ]
    ),
    search_params=models.SearchParams(exact=True),
    limit=10,
    with_payload=False,
    with_vectors=False,
).points

approximate = client.query_points(
    collection_name="documents",
    query=query_vector,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="tenant_id",
                match=models.MatchValue(value="tenant-42"),
            )
        ]
    ),
    search_params=models.SearchParams(hnsw_ef=128, exact=False),
    limit=10,
    with_payload=False,
    with_vectors=False,
).points

exact_ids = {point.id for point in exact}
approximate_ids = {point.id for point in approximate}
recall_at_10 = len(exact_ids & approximate_ids) / len(exact_ids)
print(recall_at_10)
```

Use tens or hundreds of queries, not one favorable example. For ties, compare an appropriate relevance or distance tolerance as well as IDs. Exact mode is practical as an evaluation oracle; making every large production query exact normally sacrifices the reason for using an ANN index.

Qdrant's Web UI also includes an ANN Recall view on supported releases. Script the measurement for repeatable regression testing.

## Tune `hnsw_ef` First

`hnsw_ef` is a query-time value. Larger values explore more candidates and usually improve recall at the cost of latency and CPU. It does not rebuild the index.

Sweep a range under production-like concurrency:

```python
for hnsw_ef in (32, 64, 128, 256, 512):
    result = client.query_points(
        collection_name="documents",
        query=query_vector,
        search_params=models.SearchParams(
            hnsw_ef=hnsw_ef,
            exact=False,
        ),
        limit=10,
        with_payload=False,
        with_vectors=False,
    )
    # Record latency and compare result.points with the exact baseline.
```

Qdrant documents that the default `hnsw_ef` equals the collection's `ef_construct`, whose default is 100 unless configuration overrides it. If `limit` exceeds `hnsw_ef`, Qdrant internally uses at least the requested result limit.

Pick the smallest `hnsw_ef` that meets the recall objective across important query classes. A global value that works for unfiltered search may not be optimal for strict tenant or category filters, so clients can select a tested value per workload.

## Add Payload Indexes Before Blaming HNSW

For filtered queries, create payload indexes for fields used in filters. Qdrant's planner estimates filter cardinality and can choose between HNSW traversal and a full scan. Unindexed payload filtering can dominate latency and prevent the filter-aware HNSW graph from helping.

Inspect the collection and payload schema:

```bash
curl --silent --show-error \
  -H 'api-key: YOUR_API_KEY' \
  http://localhost:6333/collections/documents
```

Create known payload indexes before bulk loading when possible. If a new index is added after HNSW has already been built, Qdrant documents a deliberate graph rebuild procedure so filter-aware edges can be incorporated. Treat that as a production change, not an incidental query tweak.

## Know When `m` and `ef_construct` Are the Ceiling

If recall plateaus even at an unacceptable `hnsw_ef`, the existing graph may be the limit.

- Higher `m` adds graph connectivity, which can improve recall but increases index memory/disk and construction work.
- Higher `ef_construct` considers more candidates during construction, which can improve graph quality but increases build time.

The collection defaults are commonly `m: 16` and `ef_construct: 100`, but deployment configuration and vector-specific overrides can differ. Read the effective collection configuration rather than assuming defaults:

```python
info = client.get_collection(collection_name="documents")
print(info.config.hnsw_config)
```

Changing either build-time value triggers background HNSW rebuilding. Qdrant warns that collection updates can block while existing optimizers finish and can create large production overhead. Ensure CPU, RAM, and disk headroom and avoid changing every shard simultaneously without an operational plan.

## Change One Build Parameter at a Time

For example, raise `ef_construct` only after benchmarking query-time values:

```python
client.update_collection(
    collection_name="documents",
    hnsw_config=models.HnswConfigDiff(ef_construct=200),
)
```

Or test a larger graph connectivity value in a cloned collection:

```python
client.update_collection(
    collection_name="documents-canary",
    hnsw_config=models.HnswConfigDiff(m=32),
)
```

A blue-green collection is safer when the production dataset is large or rollback speed matters. Use the same points, payload indexes, shard configuration, memory tiers, quantization, and query workload in the comparison.

Do not toggle a value up and immediately back down. Each change can request another full rebuild. Qdrant's index-rebuild guidance recommends keeping a minimal `ef_construct` change rather than reverting it immediately.

## Wait for Indexing to Finish

Collection counts such as `indexed_vectors_count` are approximate and can lag during optimization. Monitor collection status, optimizer activity, node resources, and query health until every relevant shard has completed the new index.

Then rerun the exact-versus-ANN suite from a comparable cache state. Test both cold and warmed storage if vectors or indexes use disk-backed memory tiers.

## Understand When Exact Search Is Reasonable

Exact mode can be the right production choice when:

- the entire collection is small;
- a payload filter leaves a very small candidate set;
- a correctness-sensitive offline task can accept higher latency;
- you are generating recall ground truth.

It is not a magic recall switch for an unbounded high-QPS workload. It scans every eligible vector and can shift the bottleneck to CPU or disk I/O.

## Official Documentation

- [Qdrant search API and SearchParams examples](https://qdrant.tech/documentation/search/search/)
- [Qdrant HNSW indexing configuration and rebuild guidance](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant tutorial: measuring ANN recall](https://qdrant.tech/documentation/tutorials-search-engineering/ann-recall/)
- [Qdrant FAQ: hnsw_ef defaults, result limits, and exact search](https://qdrant.tech/documentation/faq/qdrant-fundamentals/)
- [Qdrant collection updates and vector-specific HNSW settings](https://qdrant.tech/documentation/manage-data/collections/)

## Conclusion

Use exact search to define truth, not as an unmeasured production shortcut. Tune `hnsw_ef` per query workload first because it is reversible and requires no rebuild. Add the payload indexes filtered search needs. Raise `m` or `ef_construct` only when measured recall has hit the graph's ceiling and the cluster has enough headroom for a controlled background reindex.
