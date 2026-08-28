# Why Qdrant Filtered Queries Time Out: Payload Indexes, exact Search, and HNSW

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Search, Payload Indexing, HNSW, Performance

Description: Diagnose Qdrant filtered-query timeouts by separating payload-filter cost, exact scans, HNSW traversal, and optimizer state.

---

A filtered Qdrant query can time out even when an unfiltered nearest-neighbor query is fast. The filter changes both candidate selection and the query plan. Qdrant uses payload indexes to evaluate compatible conditions and estimate how many points match, then chooses a strategy per segment: an exact scan over a small eligible set or filter-aware HNSW traversal over a larger one.

Three common timeout causes are:

1. A filtered field has no compatible payload index, so filtering and cardinality estimation require more work.
2. The request sets `exact: true`, which bypasses approximate HNSW and brute-force scores eligible vectors.
3. An approximate request uses an expensive HNSW configuration, a large result limit, or segments whose vector index is not ready.

Increasing the timeout only allows more time. It does not repair the plan.

## Prerequisites

Before changing indexes or HNSW settings:

- Capture the exact request body, including filter structure, vector name, `limit`, `params`, consistency, and timeout.
- Record the Qdrant server and Python client versions.
- Confirm the stored JSON types of filtered fields.
- Check collection status, optimizer status, point count, indexed vector count, and payload schema.
- Run expensive exact benchmarks on a staging copy or during a controlled window.
- Take and test an appropriate snapshot before collection-wide rebuild work.

The examples use:

```bash
export QDRANT_URL='http://localhost:6333'
export QDRANT_API_KEY='replace-if-authentication-is-enabled'
export QDRANT_COLLECTION='documents'
```

## Reproduce the Current Query Exactly

Use the current Query Points endpoint and set an explicit server-side timeout in seconds:

```bash
curl -fsS -X POST \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION/points/query?timeout=10" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": [0.1, 0.2, 0.3],
    "filter": {
      "must": [
        {
          "key": "tenant_id",
          "match": {"value": "tenant-a"}
        },
        {
          "key": "status",
          "match": {"value": "published"}
        }
      ]
    },
    "params": {
      "exact": false,
      "hnsw_ef": 128
    },
    "limit": 10,
    "with_payload": ["tenant_id", "status"],
    "with_vector": false
  }'
```

Use a query vector with the collection's configured dimension; the short vector is illustrative.

The equivalent Python request is:

```python
import os

from qdrant_client import QdrantClient, models

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ.get("QDRANT_API_KEY"),
    timeout=30,
)

result = client.query_points(
    collection_name=os.environ["QDRANT_COLLECTION"],
    query=query_vector,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="tenant_id",
                match=models.MatchValue(value="tenant-a"),
            ),
            models.FieldCondition(
                key="status",
                match=models.MatchValue(value="published"),
            ),
        ]
    ),
    search_params=models.SearchParams(
        exact=False,
        hnsw_ef=128,
    ),
    limit=10,
    with_payload=["tenant_id", "status"],
    with_vectors=False,
    timeout=10,
)
```

Keep one known request unchanged while diagnosing. If filter, vector, limit, and search parameters all change together, a faster result does not identify the cause.

## Inspect Collection and Index State

Read the collection information:

```bash
curl -fsS \
  -H "api-key: $QDRANT_API_KEY" \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION" |
  jq '.result | {
    status,
    optimizer_status,
    points_count,
    indexed_vectors_count,
    payload_schema,
    config
  }'
```

Check four things:

1. Every filtered field appears in `payload_schema` with a compatible type.
2. The collection and optimizer are not stuck in an unhealthy state.
3. The indexed vector count is plausible for the collection and its segment state.
4. HNSW and optimizer settings match what the application assumes.

A payload value stored as the wrong JSON type will not satisfy a typed condition. For example, an integer range does not match a number stored as a string. A text index and a keyword index also serve different conditions: keyword is for exact values; text is tokenized full-text matching.

## Understand What the Planner Is Choosing

Qdrant does not use one fixed strategy for every filtered query. Payload indexes provide fast condition evaluation and cardinality estimates, and the planner chooses per segment based on the estimated matching vector data, available indexes, and thresholds.

The broad behavior is:

- If very few points match, scanning and scoring those eligible vectors can be cheaper than entering HNSW.
- If many points match, Qdrant can traverse HNSW while checking the filter.
- For intermediate filters, Qdrant's filterable HNSW adds payload-aware graph edges so traversal remains connected through relevant points.

The `full_scan_threshold` is based on estimated vector data size in kilobytes, not simply a count of points. Current configuration documentation notes that one kilobyte corresponds to one 256-dimensional vector for this estimate. Do not treat a planner-selected full scan as inherently wrong: over a genuinely small candidate set it is often the fastest correct plan.

Without a compatible payload index, Qdrant has weaker cardinality information and may do much more condition checking. That can produce a poor plan, especially for complex or combined filters.

## Create Compatible Payload Indexes

For exact tenant and status matches, create keyword indexes. Mark the tenant key with `is_tenant` when it really identifies tenant partitions:

```bash
curl -fsS -X PUT \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION/index?wait=true" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "field_name": "tenant_id",
    "field_schema": {
      "type": "keyword",
      "is_tenant": true
    }
  }'

curl -fsS -X PUT \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION/index?wait=true" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "field_name": "status",
    "field_schema": "keyword"
  }'
```

Python equivalent:

```python
client.create_payload_index(
    collection_name=os.environ["QDRANT_COLLECTION"],
    field_name="tenant_id",
    field_schema=models.KeywordIndexParams(
        type=models.KeywordIndexType.KEYWORD,
        is_tenant=True,
    ),
    wait=True,
)

client.create_payload_index(
    collection_name=os.environ["QDRANT_COLLECTION"],
    field_name="status",
    field_schema=models.PayloadSchemaType.KEYWORD,
    wait=True,
)
```

`is_tenant` lets Qdrant organize a tenant's vectors closer together for more sequential reads. It does not apply an authorization filter; the request still needs the exact tenant condition.

Payload index creation consumes CPU, memory, and I/O. Create known indexes immediately after collection creation and before bulk ingestion when possible. Schedule late index creation during a controlled window and wait for completion.

## Distinguish Payload Index Creation from Filterable HNSW Rebuild

Creating a payload index after ingestion makes that payload index available, but an existing HNSW graph cannot retroactively gain all the filter-aware edges it would have received if the payload index had existed when the graph was built.

Qdrant recommends creating payload indexes before ingestion. If an index is added later and filtered HNSW still performs poorly, the official rebuild procedure is to make a minimal deliberate change to `m` or `ef_construct`, such as increasing `ef_construct` by one. That triggers a background HNSW rebuild.

Read the current value first, budget disk and CPU headroom, and do not immediately change it back: that would trigger another rebuild. Queries continue using the old index while the replacement is built, but optimization work still consumes resources.

## Understand `exact: true`

For dense vectors, `exact: true` bypasses approximate HNSW and performs a brute-force exact search. With a filter, Qdrant still must identify eligible points and score their vectors exactly. The request can be useful as a recall ground truth, but it may run for a long time on a broad filter or large collection.

Compare the same request in a controlled environment:

```python
approximate = client.query_points(
    collection_name=os.environ["QDRANT_COLLECTION"],
    query=query_vector,
    query_filter=production_filter,
    search_params=models.SearchParams(
        exact=False,
        hnsw_ef=128,
    ),
    limit=10,
    timeout=30,
)

exact = client.query_points(
    collection_name=os.environ["QDRANT_COLLECTION"],
    query=query_vector,
    query_filter=production_filter,
    search_params=models.SearchParams(exact=True),
    limit=10,
    timeout=120,
)
```

Use the exact result to calculate recall for the approximate result. Do not put the expensive exact call on the latency-sensitive production path just to make results deterministic.

Strict mode can set `search_allow_exact: false` so clients cannot accidentally request a collection-wide exact scan.

## Tune HNSW Only After Indexing the Filter

For approximate dense search, `hnsw_ef` controls how many neighbors the traversal considers. Higher values generally improve recall at the cost of more work and latency. Qdrant defaults the search value to the collection's `ef_construct`, and internally ensures the candidate list is at least as large as the requested result limit.

That means both an unnecessarily high `hnsw_ef` and a very large `limit` can make an approximate request expensive. Benchmark a range of `hnsw_ef` values against exact ground truth with real filter distributions. Stop increasing it when recall no longer improves materially.

Do not try to fix an unindexed payload filter by raising `hnsw_ef`. The payload index and HNSW candidate budget solve different problems.

## Measure Filter Cardinality

Use the Count API with the same filter to understand how broad it is:

```bash
curl -fsS -X POST \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION/points/count" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "filter": {
      "must": [
        {
          "key": "tenant_id",
          "match": {"value": "tenant-a"}
        },
        {
          "key": "status",
          "match": {"value": "published"}
        }
      ]
    },
    "exact": false
  }'
```

An approximate count is useful for diagnosis without demanding a full exact count. Compare small, median, and largest tenants or categories; a query that is fast for a tiny test tenant may time out for the largest one even with the same filter shape.

## Check Unindexed Segments and Optimizer Progress

Qdrant can search segments whose vector index has not yet been built by using a full scan. If optimization is delayed or stuck, the unindexed portion can grow and degrade latency.

Do not set `indexed_only: true` as a general timeout fix. It skips segments without a completed vector index and can therefore return partial results. It is appropriate only when the application explicitly accepts eventual completeness during ingestion or optimization.

If collection status remains grey or optimizer progress stalls, follow Qdrant's optimizer recovery guidance and investigate disk space, memory pressure, CPU saturation, and service logs before changing search accuracy settings.

## Use Strict Mode to Prevent Recurrence

After every production filter field is indexed, strict mode can reject accidental unindexed retrieval filters:

```bash
curl -fsS -X PATCH \
  "$QDRANT_URL/collections/$QDRANT_COLLECTION" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "strict_mode_config": {
      "enabled": true,
      "unindexed_filtering_retrieve": false,
      "search_allow_exact": false,
      "search_max_hnsw_ef": 256
    }
  }'
```

Verify the update endpoint and schema against the pinned Qdrant version before production use. Start with limits that match measured requests; arbitrary low caps can reject legitimate searches. Qdrant Cloud enables protections against unindexed retrieval and update filters by default for new collections.

## A Safe Diagnostic Order

Use this sequence so each change has a clear purpose:

1. Replay one exact production request with an explicit timeout.
2. Inspect collection health, optimizer state, indexed vectors, and `payload_schema`.
3. Verify stored payload types and filter paths.
4. Measure the same filter's approximate count across representative tenants.
5. Create compatible payload indexes and wait for completion.
6. Repeat the unchanged approximate request.
7. Compare approximate results to an exact query in a controlled environment.
8. Tune `hnsw_ef`, `limit`, and only then collection thresholds if evidence supports it.
9. Decide whether a filter-aware HNSW rebuild is justified for indexes added after ingestion.
10. Enable strict-mode guardrails to reject future unindexed filters or exact scans where appropriate.

Record p50, p95, and p99 client latency, Qdrant response time when returned, recall, result count, CPU, memory, disk I/O, and timeout/error rates. One successful query is not a capacity test.

## Rollback and Recovery Cautions

Deleting a payload index removes the index structure, not point payloads, but it can immediately return the workload to slower filtering. Keep the index unless measurements show it is unused or harmful and strict mode will not reject the resulting query.

An HNSW rebuild is background work, not an instant toggle. Do not oscillate `m` or `ef_construct`; each change can trigger another expensive build.

If a query times out, it may still have consumed significant server work before cancellation. Bound client concurrency so retries do not amplify the overload. Use backoff and distinguish a reproducible bad plan from a transient capacity event.

## Version Scope and Limitations

- The unified Query API is available from Qdrant 1.10.
- `is_tenant` is available from Qdrant 1.11.
- Qdrant 1.16 introduced the ACORN search algorithm for difficult combinations of strict filters; it explores additional graph hops and trades performance for recall. Review the current indexing documentation before enabling version-specific search options.
- Strict-mode defaults differ between self-hosted Qdrant and Qdrant Cloud.
- Exact and approximate performance depends on vector size, filter distribution, segment state, storage mode, quantization, hardware, and concurrent load. No single `hnsw_ef` or timeout is correct for every collection.

## Official Documentation

- [Qdrant Indexing and Filterable HNSW](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant Similarity Search and Search Parameters](https://qdrant.tech/documentation/search/)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Create Payload Index API](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Qdrant Performance Optimization](https://qdrant.tech/documentation/operations/optimize/)
- [Qdrant Strict Mode Administration](https://qdrant.tech/documentation/operations/administration/)
- [Qdrant Fundamentals and Optimizer Recovery](https://qdrant.tech/documentation/faq/qdrant-fundamentals/)
- [Qdrant Python Client](https://github.com/qdrant/qdrant-client)

## Conclusion

Diagnose a filtered timeout by separating filter evaluation from vector search. Give every production filter a compatible payload index, verify optimizer and segment state, and let Qdrant's planner choose between a small exact scan and filter-aware HNSW. Use `exact: true` only as a controlled ground truth, tune `hnsw_ef` against measured recall, and treat timeout increases as temporary budgets rather than fixes. Once the workload is healthy, strict mode can turn future unindexed filters and accidental exact scans into immediate, diagnosable errors.
