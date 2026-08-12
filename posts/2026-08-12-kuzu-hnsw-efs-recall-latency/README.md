# Tune Kuzu HNSW `efs` for Recall and Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, HNSW, Vector Search, Graph Database, Recall, Performance

Description: Tune Kuzu HNSW search breadth with an exact ground truth, recall and latency curves, representative filters, and a production-safe efs policy.

---

When Kuzu's HNSW index returns plausible results but misses known near neighbors, tune the search-time `efs` parameter against measured recall. `efs` controls how many candidate vertices the search considers. Raising it usually improves recall because the algorithm explores a wider candidate set, but it also adds distance computations, CPU work, and latency. The correct value is the smallest one that meets the application's recall target across representative queries and filters.

Do not tune by looking at one search result. Build an exact or trusted ground-truth set, sweep `efs`, measure recall@k and latency percentiles, and keep index-build parameters, distance metric, embeddings, dataset, Kuzu version, and hardware fixed. Kuzu is archived at 0.11.3, whose bundled `vector` extension is the final official Kuzu implementation.

## Understand the Two Different `ef` Controls

Kuzu's vector extension exposes two similarly named controls:

- `efc` is set when creating the index. It controls candidate breadth during construction. The documented default is 200.
- `efs` is set on each query. It controls candidate breadth during search. The documented default is 200.

Changing `efs` does not rebuild the index, which makes it the first knob to sweep. If even very high `efs` cannot reach the target, investigate the index construction, metric, data, and query pipeline rather than increasing search effort forever.

Create a typed node table and index:

~~~cypher
CREATE NODE TABLE Document(
    document_id STRING PRIMARY KEY,
    title STRING,
    active BOOLEAN,
    embedding FLOAT[384]
);

CALL CREATE_VECTOR_INDEX(
    'Document',
    'document_embedding_idx',
    'embedding',
    metric := 'cosine',
    efc := 200
);
~~~

Kuzu 0.11.3 bundles and preloads the vector extension, so it needs neither `INSTALL` nor `LOAD`. Older versions and the maintained successor have different extension-distribution details, so pin the package and database artifact together.

## Query With Explicit `efs`

Kuzu's `QUERY_VECTOR_INDEX` takes table, index, query vector, `k`, and optional `efs`:

~~~python
query = """
CALL QUERY_VECTOR_INDEX(
    'Document',
    'document_embedding_idx',
    $query_vector,
    $k,
    efs := $efs
)
RETURN node.document_id AS id, distance
ORDER BY distance;
"""

result = conn.execute(
    query,
    {
        "query_vector": vector.tolist(),
        "k": 20,
        "efs": 400,
    },
)
~~~

Always order by the returned `distance` if callers expect nearest-first output. Confirm that the query vector has the same dimension and embedding model as indexed rows.

Kuzu supports `cosine`, `l2`, `l2sq`, and `dotproduct` metrics at index creation. Distance values and ordering semantics belong to the chosen metric. In Kuzu 0.11.3, `dotproduct` is the raw inner product treated as an ascending distance, so its exact baseline must use that same ordering rather than conventional maximum-inner-product ordering. A cosine index compared against an L2 ground truth is not a recall test; it asks a different mathematical question.

## Build an Exact Ground Truth

For a manageable corpus or sample, compute distances against every embedding using the same metric, then select the exact top k. Kuzu documents array similarity/distance functions; alternatively, compute in a trusted numerical library with identical preprocessing.

A Python ground-truth harness can be explicit:

~~~python
import numpy as np

def exact_cosine_top_k(matrix, query, ids, k):
    matrix = np.asarray(matrix, dtype=np.float32)
    query = np.asarray(query, dtype=np.float32)

    if not np.all(np.isfinite(matrix)) or not np.all(np.isfinite(query)):
        raise ValueError("embeddings must contain only finite values")
    row_norms = np.linalg.norm(matrix, axis=1)
    query_norm = np.linalg.norm(query)

    nonzero_rows = row_norms > 0
    similarity = np.zeros(len(ids), dtype=np.float32)
    if query_norm > 0:
        similarity[nonzero_rows] = (
            matrix[nonzero_rows] @ query
            / (row_norms[nonzero_rows] * query_norm)
        )
    else:
        similarity[~nonzero_rows] = 1.0

    order = np.argsort(-similarity, kind="stable")[:k]
    return [ids[i] for i in order]
~~~

This matches Kuzu 0.11.3's cosine convention: two zero vectors have distance 0, while a zero and a nonzero vector have distance 1. Reject null or non-finite embeddings before benchmarking. Define how duplicate vectors and ties are handled. If several documents have exactly the cutoff distance, ID-set recall can change with legitimate tie ordering. Use a distance-aware tie policy or compare against the complete tied set.

Do not use a higher-`efs` HNSW result as “exact” ground truth unless exhaustive comparison is impossible and the limitation is recorded. Approximate against approximate can hide systematic misses.

## Calculate Recall@k

For one query, let `m` be `min(k, number of eligible indexed embeddings)`:

~~~text
recall@k = |approximate_top_k ∩ exact_top_m| / m
~~~

For example, if 18 of the exact 20 IDs appear in HNSW's top 20, recall@20 is 0.90. If `m` is zero, report that the query has no eligible embeddings instead of assigning a recall score. Aggregate across queries with mean, median, low percentile, and worst-case recall. A mean of 0.98 can conceal a user segment at 0.60.

Create a benchmark set that covers:

- Common and rare semantic topics.
- Dense and isolated embedding regions.
- Queries near corpus boundaries.
- Different tenants, languages, or content types.
- Recently inserted rows if the production index is mutable.
- Filtered and unfiltered retrieval paths.

Keep the benchmark query set separate from ad hoc examples used to choose parameters.

## Sweep an `efs` Curve

Use a geometric sweep around the requested `k` and the default:

~~~python
EFS_VALUES = [20, 40, 80, 120, 200, 400, 800]
~~~

Ensure each candidate is valid for the engine. Kuzu 0.11.3 uses `max(k, efs)` as the effective search breadth, so an `efs` below `k` is valid but redundant. For every value:

1. Warm the process and index with unmeasured queries.
2. Randomize query order to reduce time-correlated bias.
3. Run enough repetitions for stable p50, p95, and p99 latency.
4. Consume the entire result, up to `k` rows.
5. Record recall@k for every benchmark query.
6. Monitor CPU and concurrent throughput, not just single-query duration.

Produce a decision table:

| `efs` | Mean recall@20 | p5 recall@20 | p95 latency | Queries/second |
| ---: | ---: | ---: | ---: | ---: |
| 80 | measured | measured | measured | measured |
| 200 | measured | measured | measured | measured |
| 400 | measured | measured | measured | measured |
| 800 | measured | measured | measured | measured |

Do not publish invented numbers. Fill the table from the pinned corpus and deployment hardware.

The curve usually has an elbow: recall improves quickly at first, then gains become small while latency continues rising. Choose against an explicit service objective, such as p95 latency below 50 ms and p5 recall@20 above 0.95, rather than choosing the prettiest average.

## Separate `k` From `efs`

`k` is the maximum number of neighbors the function returns; `efs` controls additional search effort when it exceeds `k`. Increasing `k` to compensate for poor recall changes the API result size and downstream work, and raising `k` above `efs` also raises the effective search breadth. It can be useful to retrieve more candidates for reranking, but it does not mean the true top k is present.

If a reranker consumes 100 candidates and returns 10, benchmark recall@100 for candidate generation and end-to-end relevance@10 after reranking. Tune the stage that owns each objective.

## Filtered Search Needs Its Own Benchmark

Kuzu supports filtered vector search through projected graphs. A filter changes the eligible corpus and can change both recall and latency. The vector guide shows a projected graph used as the `table_name` argument:

~~~cypher
CALL PROJECT_GRAPH(
    'active_documents',
    {'Document': 'n.active = true'},
    []
);

CALL QUERY_VECTOR_INDEX(
    'active_documents',
    'document_embedding_idx',
    $query_vector,
    $k,
    efs := $efs
)
RETURN node.document_id, distance
ORDER BY distance;
~~~

Ground truth must apply the identical filter before exact top-k selection. Comparing a filtered approximate result to the full corpus makes valid results look wrong.

The archived guide also documents `PROJECT_GRAPH_CYPHER` for filters expressed by arbitrary Cypher patterns, with restrictions on its returned node label and supported use. Treat every important filter shape-tenant, permissions, date, graph neighborhood-as a separate benchmark stratum.

## If High `efs` Still Misses

Investigate these causes before raising the ceiling:

1. **Metric mismatch.** Index and exact baseline use different metrics or normalization.
2. **Embedding mismatch.** Query and documents use different models, dimensions, or preprocessing.
3. **Ground-truth bug.** Ties, nulls, zero vectors, or ID alignment are mishandled.
4. **Construction quality.** `efc`, `mu`, `ml`, and `pu` determine index structure. Improving them requires rebuilding and increases construction cost or index size.
5. **Stale expectations.** Documents or embeddings changed after the expected-neighbor fixture was recorded.
6. **Filter mismatch.** Approximate and exact candidate sets differ.

Kuzu documents `mu` as maximum upper-layer degree, `ml` as maximum lower-layer degree, and `pu` as the share sampled into the upper graph. Change one build parameter at a time, recreate the index, and rerun the complete curve. Preserve index size and build time alongside recall and latency.

## Production Policy

Use a bounded allowlist of `efs` tiers rather than accepting an arbitrary public value:

- A default tier that meets the normal objective.
- A higher-recall tier for offline or premium workflows.
- A lower-latency tier only where reduced recall is explicitly acceptable.

Enforce timeouts and concurrency limits. Track `efs`, `k`, filter class, latency, returned count, and downstream success without logging raw sensitive vectors. Re-run the benchmark when embeddings, corpus distribution, index parameters, Kuzu package, hardware, or concurrency changes.

## Official Documentation

- [Kuzu 0.11.3 bundled extensions release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu vector search extension](https://kuzudb.github.io/docs/extensions/vector/)
- [Kuzu array functions](https://kuzudb.github.io/docs/cypher/expressions/array-functions/)
- [Kuzu list and array data types](https://kuzudb.github.io/docs/cypher/data-types/list-and-array/)
- [Kuzu projected graphs](https://kuzudb.github.io/docs/extensions/algo/)
- [Kuzu prepared statements](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [LadybugDB maintained vector search reference](https://docs.ladybugdb.com/extensions/vector/)

## Conclusion

`efs` is a recall-versus-work control, not a quality guarantee. Tune it with exact neighbors, representative query strata, identical filters and metrics, and latency percentiles from deployment-like hardware. Choose the smallest `efs` that satisfies the stated recall objective. If the curve plateaus below target, fix metric, embeddings, filtering, ground truth, or index construction instead of spending unlimited search time.
