# How to Tune HNSW Parameters for Vector Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Performance

Description: Tune HNSW index parameters in MongoDB Atlas Vector Search to balance recall, query latency, and memory usage for your specific vector search workload.

---

Atlas Vector Search uses the HNSW (Hierarchical Navigable Small World) algorithm to build its ANN index. Two parameters control the quality-speed trade-off at index build time: `numDimensions` (fixed by your embedding model) and the HNSW-specific options `m` and `efConstruction`.

## HNSW Parameters Explained

**`m`** - The number of bidirectional connections each node in the HNSW graph maintains. Higher `m` means more connections, better recall, but more memory and slower index builds.

- Range: 4 to 128
- Default: 16
- Impact: Memory grows linearly with `m`. Recall improves significantly up to ~32, diminishing returns beyond 64.

**`efConstruction`** - The size of the candidate list during index construction. Higher values produce a better-quality graph and improve recall, at the cost of longer index build time.

- Range: 4 to 1000
- Default: 100
- Impact: Does not affect query latency, only build quality.

## Configuring HNSW Parameters

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine",
      "quantization": "scalar",
      "hnsw": {
        "m": 32,
        "efConstruction": 200
      }
    }
  ]
}
```

## Parameter Selection Guide

| Use Case | m | efConstruction | Notes |
|---|---|---|---|
| Default / balanced | 16 | 100 | Good starting point |
| High recall required | 32 | 200 | Recommended for production |
| Low memory / large collections | 8 | 100 | Less accurate |
| Maximum recall | 64 | 400 | Slow build, best quality |

## Memory Estimation

HNSW memory scales with `m` and collection size:

```text
Approximate memory = numVectors * m * 8 bytes * 1.2 (overhead factor)

Example: 10M vectors, m=16
= 10,000,000 * 16 * 8 * 1.2
= ~1.5 GB for the graph structure
+ vector storage (~57 GB for 1536-dim float32)
= ~59 GB total
```

With scalar quantization and m=16, vector storage drops to ~14 GB (1 byte per dimension instead of 4), making total index ~16 GB.

## Query-Time Tuning with numCandidates

At query time, `numCandidates` controls how many candidates the HNSW graph explores. This is independent of build-time parameters but interacts with them:

```javascript
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 200,  // explore more nodes in the graph
      limit: 10
    }
  }
])
```

Higher `numCandidates` improves recall at the cost of latency. With a well-tuned HNSW (m=32, efConstruction=200), you can achieve 99% recall with `numCandidates = 100`.

## Benchmarking Your Configuration

Test different parameter combinations with your actual data:

```python
import time

def benchmark_search(index_name: str, query_vec: list, num_candidates: int) -> dict:
    start = time.time()
    results = list(collection.aggregate([
        {
            "$vectorSearch": {
                "index": index_name,
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": num_candidates,
                "limit": 10
            }
        }
    ]))
    latency = (time.time() - start) * 1000
    return {"latency_ms": latency, "results": [str(r["_id"]) for r in results]}

for nc in [50, 100, 200, 500]:
    result = benchmark_search("vector_index", query_vector, nc)
    print(f"numCandidates={nc}: {result['latency_ms']:.1f}ms")
```

## Summary

HNSW tuning involves choosing `m` and `efConstruction` at index build time, then tuning `numCandidates` at query time. Start with `m=16`, `efConstruction=100` and benchmark recall. Increase `m` to 32 and `efConstruction` to 200 for production workloads where recall matters. Use `numCandidates = limit * 10` as a starting query-time value and adjust based on measured latency and recall requirements.
